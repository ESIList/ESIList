const textEncoder = new TextEncoder();
const maxFileSize = 180_000;

function isValidChangelogDate(value) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    if (!match) return false;
    const [, day, month, year] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
}

function jsonResponse(body, status, corsHeaders) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
        },
    });
}

function encodeBase64Url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
    const leftBytes = textEncoder.encode(left);
    const rightBytes = textEncoder.encode(right);
    let difference = leftBytes.length ^ rightBytes.length;
    for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
        difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
    }
    return difference === 0;
}

async function getSigningKey(secret) {
    return crypto.subtle.importKey(
        'raw',
        textEncoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );
}

async function createSession(env) {
    const payload = encodeBase64Url(textEncoder.encode(JSON.stringify({
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
    })));
    const key = await getSigningKey(env.SESSION_SECRET);
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload)));
    return `${payload}.${encodeBase64Url(signature)}`;
}

async function hasValidSession(request, env) {
    const authorization = request.headers.get('Authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;

    try {
        const key = await getSigningKey(env.SESSION_SECRET);
        const valid = await crypto.subtle.verify(
            'HMAC',
            key,
            decodeBase64Url(signature),
            textEncoder.encode(payload),
        );
        if (!valid) return false;
        const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
        return Number.isInteger(session.expiresAt) && session.expiresAt > Math.floor(Date.now() / 1000);
    } catch {
        return false;
    }
}

function getCorsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== env.ADMIN_ALLOWED_ORIGIN || !origin.startsWith('https://')) return null;
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
    };
}

function parseAllowedFile(file) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
        throw new Error('Each file must include a path and string content.');
    }
    const isList = file.path === 'data/_list.json';
    const isRunsList = file.path === 'data/runs/_runs.json';
    const isChangelog = file.path === 'data/_changelog.json';
    const isLevel = /^data\/[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}\.json$/.test(file.path);
    const isRun = /^data\/runs\/[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}\.json$/.test(file.path);
    if (!isList && !isRunsList && !isChangelog && !isLevel && !isRun) {
        throw new Error('Only level, verification, changelog, and index JSON files can be changed.');
    }
    if (textEncoder.encode(file.content).length > maxFileSize) throw new Error('A JSON file exceeds the 180 KB limit.');

    let parsed;
    try {
        parsed = JSON.parse(file.content);
    } catch {
        throw new Error(`${file.path} does not contain valid JSON.`);
    }

    if (isList || isRunsList) {
        if (!Array.isArray(parsed) || parsed.length > 300 ||
            !parsed.every((name) => typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}$/.test(name)) ||
            new Set(parsed).size !== parsed.length) {
            throw new Error('The level list must contain unique, valid level names.');
        }
    } else if (isChangelog) {
        if (!Array.isArray(parsed) || parsed.length > 200 ||
            !parsed.every((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) &&
                typeof entry.date === 'string' && isValidChangelogDate(entry.date) &&
                typeof entry.message === 'string' && entry.message.trim().length > 0 &&
                entry.message.length <= 4_000 &&
                (entry.featured === undefined || typeof entry.featured === 'boolean'))) {
            throw new Error('The changelog must contain up to 200 valid dated entries.');
        }
    } else if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object' ||
        typeof parsed.name !== 'string' || !Array.isArray(parsed.records) ||
        (isRun && !Number.isSafeInteger(parsed.id))) {
        throw new Error(`${file.path} must be a level or verification object with a name and records array.`);
    }

    return file;
}

async function githubRequest(url, env, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'ESIList-record-manager',
            ...(options.headers || {}),
        },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.message || `GitHub returned ${response.status}.`);
        error.status = response.status;
        throw error;
    }
    return body;
}

async function saveFiles(files, deletePaths, expectedIndexes, expectedChangelog, env) {
    if (!env.GITHUB_TOKEN) throw new Error('The records service is missing its GitHub token.');
    const [owner, repository] = (env.GITHUB_REPOSITORY || '').split('/');
    if (!owner || !repository || !env.GITHUB_BRANCH) throw new Error('The GitHub repository is not configured.');

    const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
    const branch = encodeURIComponent(env.GITHUB_BRANCH);
    const reference = await githubRequest(`${api}/git/ref/heads/${branch}`, env);
    const currentCommit = reference.object.sha;
    const currentTree = await githubRequest(`${api}/git/commits/${currentCommit}`, env);
    const listFiles = files.filter(({ path }) =>
        path === 'data/_list.json' || path === 'data/runs/_runs.json',
    );
    for (const levelList of listFiles) {
        const listPath = levelList.path;
        const latestListResponse = await githubRequest(
            `${api}/contents/${listPath}?ref=${branch}`,
            env,
        );
        const latestList = JSON.parse(new TextDecoder().decode(
            Uint8Array.from(atob(latestListResponse.content.replace(/\n/g, '')), (character) => character.charCodeAt(0)),
        ));
        const submittedList = JSON.parse(levelList.content);
        const expectedIndex = expectedIndexes[listPath];
        if (expectedIndex) {
            if (latestList.length !== expectedIndex.length ||
                latestList.some((name, index) => name !== expectedIndex[index])) {
                const error = new Error(`The ${listPath} index changed while it was being edited.`);
                error.status = 422;
                throw error;
            }
            levelList.content = JSON.stringify(submittedList, null, 4);
        } else {
            const removedNames = new Set(deletePaths
                .filter((path) => listPath === (path.startsWith('data/runs/')
                    ? 'data/runs/_runs.json'
                    : 'data/_list.json'))
                .map((path) => path.slice(listPath === 'data/runs/_runs.json'
                    ? 'data/runs/'.length
                    : 'data/'.length, -'.json'.length)));
            const mergedList = [
                ...submittedList,
                ...latestList.filter((name) =>
                    !submittedList.includes(name) && !removedNames.has(name),
                ),
            ];
            levelList.content = JSON.stringify(mergedList, null, 4);
        }
    }
    if (expectedChangelog) {
        const latestChangelogResponse = await githubRequest(
            `${api}/contents/data/_changelog.json?ref=${branch}`,
            env,
        );
        const latestChangelog = JSON.parse(new TextDecoder().decode(
            Uint8Array.from(atob(latestChangelogResponse.content.replace(/\n/g, '')), (character) => character.charCodeAt(0)),
        ));
        if (JSON.stringify(latestChangelog) !== JSON.stringify(expectedChangelog)) {
            const error = new Error('The changelog changed while it was being edited.');
            error.status = 422;
            throw error;
        }
    }
    const treeEntries = [
        ...files.map(({ path, content }) => ({
            path,
            mode: '100644',
            type: 'blob',
            content,
        })),
        ...deletePaths.map((path) => ({
            path,
            mode: '100644',
            type: 'blob',
            sha: null,
        })),
    ];
    const tree = await githubRequest(`${api}/git/trees`, env, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            base_tree: currentTree.tree.sha,
            tree: treeEntries,
        }),
    });
    const commit = await githubRequest(`${api}/git/commits`, env, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: deletePaths.length
                ? deletePaths[0].startsWith('data/runs/')
                    ? 'Remove ESIList verification'
                    : 'Remove ESIList level'
                : files.some(({ path }) => path === 'data/runs/_runs.json')
                ? 'Update ESIList verification runs'
                : files.some(({ path }) => path === 'data/_list.json')
                    ? 'Update ESIList levels'
                    : `Update ${files[0].path}`,
            tree: tree.sha,
            parents: [currentCommit],
        }),
    });
    await githubRequest(`${api}/git/refs/heads/${branch}`, env, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: commit.sha, force: false }),
    });
    return commit.sha;
}

export default {
    async fetch(request, env) {
        const corsHeaders = getCorsHeaders(request, env);
        if (!corsHeaders) return jsonResponse({ error: 'Origin is not allowed.' }, 403, {});
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

        const url = new URL(request.url);
        if (url.pathname === '/api/login' && request.method === 'POST') {
            if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.SESSION_SECRET ||
                env.SESSION_SECRET.length < 32) {
                return jsonResponse({ error: 'The admin credentials are not configured correctly.' }, 500, corsHeaders);
            }
            if (!env.LOGIN_LIMITER) {
                return jsonResponse({ error: 'The login rate limiter is not configured.' }, 500, corsHeaders);
            }
            const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
            const rateLimit = await env.LOGIN_LIMITER.limit({ key: ipAddress });
            if (!rateLimit.success) {
                return jsonResponse({ error: 'Too many login attempts. Try again in a minute.' }, 429, corsHeaders);
            }
            if (Number(request.headers.get('Content-Length') || 0) > 4_000) {
                return jsonResponse({ error: 'Request exceeds the 4 KB limit.' }, 413, corsHeaders);
            }
            let credentials;
            try {
                credentials = await request.json();
            } catch {
                return jsonResponse({ error: 'Invalid request body.' }, 400, corsHeaders);
            }
            const validUser = constantTimeEqual(String(credentials.username || ''), env.ADMIN_USERNAME);
            const validPassword = constantTimeEqual(String(credentials.password || ''), env.ADMIN_PASSWORD);
            if (!validUser || !validPassword) {
                return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
            }
            return jsonResponse({ token: await createSession(env) }, 200, corsHeaders);
        }

        if (url.pathname === '/api/files' && request.method === 'POST') {
            if (!await hasValidSession(request, env)) {
                return jsonResponse({ error: 'Authentication required.' }, 401, corsHeaders);
            }
            let rawBody;
            let body;
            try {
                rawBody = await request.text();
            } catch {
                return jsonResponse({ error: 'Invalid request body.' }, 400, corsHeaders);
            }
            if (textEncoder.encode(rawBody).length > 8_000_000) {
                return jsonResponse({ error: 'Request exceeds the 8 MB limit.' }, 413, corsHeaders);
            }
            try {
                body = JSON.parse(rawBody);
            } catch {
                return jsonResponse({ error: 'Invalid request body.' }, 400, corsHeaders);
            }
            if (!body || typeof body !== 'object' || Array.isArray(body)) {
                return jsonResponse({ error: 'Invalid request body.' }, 400, corsHeaders);
            }
            const deletePaths = body.deletePaths || [];
            if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 301 ||
                !Array.isArray(deletePaths) || deletePaths.length > 1) {
                return jsonResponse({ error: 'Send up to 301 files and at most one level deletion.' }, 400, corsHeaders);
            }
            if (!deletePaths.every((path) =>
                typeof path === 'string' &&
                (/^data\/[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}\.json$/.test(path) ||
                    /^data\/runs\/[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}\.json$/.test(path)),
            )) {
                return jsonResponse({ error: 'Only level or verification JSON files can be deleted.' }, 400, corsHeaders);
            }
            if (body.expectedIndexes !== undefined &&
                (!body.expectedIndexes || typeof body.expectedIndexes !== 'object' ||
                    Array.isArray(body.expectedIndexes))) {
                return jsonResponse({ error: 'The expected index is invalid.' }, 400, corsHeaders);
            }
            const expectedIndexes = { ...(body.expectedIndexes || {}) };
            if (body.expectedList !== undefined) expectedIndexes['data/_list.json'] = body.expectedList;
            if (body.expectedRuns !== undefined) expectedIndexes['data/runs/_runs.json'] = body.expectedRuns;
            const validIndexPaths = new Set(['data/_list.json', 'data/runs/_runs.json']);
            if (Object.entries(expectedIndexes).some(([path, names]) =>
                    !validIndexPaths.has(path) || !Array.isArray(names) ||
                    names.length > 300 ||
                    !names.every((name) =>
                        typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}$/.test(name),
                    ) ||
                    new Set(names).size !== names.length,
                )) {
                return jsonResponse({ error: 'The expected index is invalid.' }, 400, corsHeaders);
            }
            const expectedChangelog = body.expectedChangelog;
            if (expectedChangelog !== undefined && (!Array.isArray(expectedChangelog) ||
                expectedChangelog.length > 200 ||
                !expectedChangelog.every((entry) => entry && typeof entry === 'object' &&
                    !Array.isArray(entry) && typeof entry.date === 'string' &&
                    isValidChangelogDate(entry.date) &&
                    typeof entry.message === 'string' && entry.message.trim().length > 0 &&
                    entry.message.length <= 4_000 &&
                    (entry.featured === undefined || typeof entry.featured === 'boolean')))) {
                return jsonResponse({ error: 'The expected changelog is invalid.' }, 400, corsHeaders);
            }
            if (expectedChangelog && !body.files.some((file) => file.path === 'data/_changelog.json')) {
                return jsonResponse({ error: 'An expected changelog requires an updated changelog file.' }, 400, corsHeaders);
            }

            try {
                const files = body.files.map(parseAllowedFile);
                const paths = [...files.map(({ path }) => path), ...deletePaths];
                if (new Set(paths).size !== paths.length) {
                    return jsonResponse({ error: 'A file can only be included once.' }, 400, corsHeaders);
                }
                if (deletePaths.length) {
                    for (const path of deletePaths) {
                        const runs = path.startsWith('data/runs/');
                        const indexPath = runs ? 'data/runs/_runs.json' : 'data/_list.json';
                        const indexFile = files.find((file) => file.path === indexPath);
                        const expectedIndex = expectedIndexes[indexPath];
                        if (!indexFile || !expectedIndex) {
                            return jsonResponse({ error: 'Deleting an entry requires its expected index and an updated index file.' }, 400, corsHeaders);
                        }
                        const name = path.slice(runs ? 'data/runs/'.length : 'data/'.length, -'.json'.length);
                        const submittedIndex = JSON.parse(indexFile.content);
                        if (!expectedIndex.includes(name) || submittedIndex.includes(name)) {
                            return jsonResponse({ error: 'The deleted entry must be removed from the updated index.' }, 400, corsHeaders);
                        }
                    }
                }
                for (const indexPath of Object.keys(expectedIndexes)) {
                    if (!files.some((file) => file.path === indexPath)) {
                        return jsonResponse({ error: 'An expected index requires an updated index file.' }, 400, corsHeaders);
                    }
                }
                const commit = await saveFiles(files, deletePaths, expectedIndexes, expectedChangelog, env);
                return jsonResponse({ commit }, 200, corsHeaders);
            } catch (error) {
                const status = error.status === 422 ? 409 : error.status ? 502 : 400;
                return jsonResponse({ error: status === 409
                    ? 'The repository changed at the same time. Reload the page and try again.'
                    : error.message }, status, corsHeaders);
            }
        }

        return jsonResponse({ error: 'Not found.' }, 404, corsHeaders);
    },
};
