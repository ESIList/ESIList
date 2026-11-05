import { recordsApiUrl } from '../admin/config.js';
import { fetchList, fetchRuns } from '../content.js';

const levelNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}$/;

function emptyLevel(name = '') {
    return {
        id: '',
        name,
        subtitle: '-',
        author: '',
        verifier: '',
        aredl: '',
        verificationDate: '',
        tagsText: '',
        filtersText: '',
        verification: '',
        percentToQualify: '100',
        positionHistory: [],
        records: [],
    };
}

function emptyRun(name = '') {
    return {
        id: '',
        name,
        author: '',
        expectedplacement: '',
        verifier: '',
        verification: '',
        percentToQualify: '0',
        records: [],
    };
}

function formatHistoryDate(date = new Date()) {
    return [
        String(date.getDate()).padStart(2, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        date.getFullYear(),
    ].join('-');
}

function withPositionChange(level, oldPosition, newPosition, reason, date) {
    const positionHistory = Array.isArray(level.positionHistory) ? [...level.positionHistory] : [];
    positionHistory.push({
        date,
        change: oldPosition - newPosition,
        position: newPosition,
        reason,
    });
    return { ...level, positionHistory };
}

function levelFileContent(level) {
    const { path, rank, unavailable, ...data } = level;
    return JSON.stringify(data, null, 4);
}

export default {
    template: `
        <main class="page-admin-records">
            <section class="admin-records-content">
                <div class="admin-records-heading">
                    <div>
                        <p class="admin-records-eyebrow">{{ $t('Records') }}</p>
                        <h1>{{ $t('Record manager') }}</h1>
                    </div>
                    <button v-if="authorized" class="admin-records-button admin-records-button-secondary" type="button" @click="logout">
                        {{ $t('Sign out') }}
                    </button>
                </div>

                <p v-if="!recordsApiUrl" class="admin-records-message" role="alert">
                    {{ $t('Configure the Worker URL in js/admin/config.js before using this page.') }}
                </p>

                <form v-if="!authorized" class="admin-records-login" @submit.prevent="login">
                    <p>{{ $t('Sign in to edit level files and records.') }}</p>
                    <label>
                        {{ $t('Username') }}
                        <input v-model.trim="username" autocomplete="username" required :disabled="busy || !recordsApiUrl">
                    </label>
                    <label>
                        {{ $t('Password') }}
                        <input v-model="password" type="password" autocomplete="current-password" required :disabled="busy || !recordsApiUrl">
                    </label>
                    <button class="admin-records-button" type="submit" :disabled="busy || !recordsApiUrl">
                        {{ $t('Sign in') }}
                    </button>
                </form>

                <section v-else class="admin-records-editor">
                    <p class="admin-records-hint">{{ $t('Changes are committed directly to the repository.') }}</p>
                    <div class="admin-records-categories" role="group" :aria-label="$t('Submission type')">
                        <button
                            v-for="category in categories"
                            :key="category.id"
                            class="admin-records-category"
                            :class="{ active: selectedCategory === category.id }"
                            type="button"
                            :aria-pressed="selectedCategory === category.id"
                            @click="selectCategory(category.id)"
                            :disabled="busy"
                        >{{ $t(category.label) }}</button>
                    </div>
                    <section v-if="selectedCategory === 'changelog'" class="admin-records-changelog-manager">
                        <form class="admin-records-changelog-form" @submit.prevent="addChangelogEntry">
                            <label>
                                {{ $t('Date') }}
                                <input v-model="changelogDraft.date" type="date" required :disabled="busy">
                            </label>
                            <label class="admin-records-field-wide">
                                {{ $t('Changelog message') }}
                                <textarea v-model.trim="changelogDraft.message" rows="3" maxlength="4000" required :disabled="busy"></textarea>
                            </label>
                            <label class="admin-records-featured">
                                <input v-model="changelogDraft.featured" type="checkbox" :disabled="busy">
                                {{ $t('Featured update') }}
                            </label>
                            <button class="admin-records-button admin-records-button-secondary" type="submit" :disabled="busy">
                                {{ $t('Publish changelog entry') }}
                            </button>
                        </form>

                        <section class="admin-records-changelog-list">
                            <h2>{{ $t('Changelog entries') }} ({{ changelogEntries.length }})</h2>
                            <p v-if="!changelogEntries.length" class="admin-records-hint">{{ $t('No changelog entries yet.') }}</p>
                            <article v-for="(entry, index) in changelogEntries" :key="entry.date + '-' + index" class="admin-records-changelog-entry">
                                <div>
                                    <strong>{{ entry.date }}</strong>
                                    <span v-if="entry.featured" class="admin-records-changelog-featured">{{ $t('Featured update') }}</span>
                                    <p>{{ entry.message.replace(/<br\\s*\\/?\\s*>/gi, ' ') }}</p>
                                </div>
                                <button
                                    class="admin-records-button admin-records-button-danger"
                                    type="button"
                                    @click="deleteChangelogEntry(index)"
                                    :disabled="busy"
                                >{{ $t('Delete changelog') }}</button>
                            </article>
                        </section>
                    </section>
                    <div v-else class="admin-records-workspace">
                        <aside class="admin-records-sidebar">
                    <div class="admin-records-controls">
                        <form class="admin-records-create" @submit.prevent="createItem">
                            <label>
                                {{ $t('Level name') }}
                                <input v-model.trim="newLevelName" maxlength="100" :disabled="busy">
                            </label>
                            <label v-if="selectedCategory === 'records'">
                                {{ $t('New level position') }}
                                <input v-model.number="newLevelRank" type="number" min="1" :max="Math.min(levelEntries.length + 1, 300)" step="1" :disabled="busy">
                            </label>
                            <label v-else>
                                {{ $t('New verification position') }}
                                <input v-model.number="selectedRunPosition" type="number" min="1" :max="Math.min(runEntries.length + 1, 300)" step="1" :disabled="busy">
                            </label>
                            <button class="admin-records-button admin-records-button-secondary" type="submit" :disabled="busy">
                                {{ $t(selectedCategory === 'verifications' ? 'Add verification' : 'Add level') }}
                            </button>
                            <small>{{ $t(selectedCategory === 'verifications' ? 'Add verification or progress for a level not yet in the list.' : 'Add a level at the selected position in the list.') }}</small>
                        </form>
                    </div>

                    <section class="admin-records-level-list">
                        <label class="admin-records-search">
                            {{ $t('Search by name') }}
                            <input v-model.trim="searchQuery" type="search" :disabled="busy">
                        </label>
                        <h2>{{ $t(selectedCategory === 'verifications' ? 'Off-list verifications' : 'Levels in list') }} ({{ filteredItems.length }})</h2>
                        <p v-if="!filteredItems.length" class="admin-records-hint">{{ $t('No entries match this search.') }}</p>
                        <button
                            v-for="item in filteredItems"
                            :key="item.path"
                            class="admin-records-level-item"
                            :class="{ active: selectedName === item.path }"
                            :title="item.summary"
                            type="button"
                            @click="selectItem(item)"
                            :disabled="busy"
                        >
                            <span class="admin-records-level-rank">#{{ item.rank }}</span>
                            <span class="admin-records-level-name">{{ item.name }}</span>
                            <span class="admin-records-level-summary">{{ item.summary }}</span>
                        </button>
                    </section>
                        </aside>

                    <form v-if="selectedName" class="admin-records-form" @submit.prevent="saveLevel">
                        <section v-if="selectedCategory === 'records'" class="admin-records-placement">
                            <label v-if="!isNewLevel">
                                {{ $t('Position in list') }}
                                <input v-model.number="selectedLevelPosition" type="number" min="1" :max="levels.length" step="1" :disabled="busy">
                            </label>
                            <label v-if="!isNewLevel" class="admin-records-swap-position">
                                {{ $t('Swap with position') }}
                                <div>
                                    <input v-model.number="swapLevelPosition" type="number" min="1" :max="levels.length" step="1" :disabled="busy">
                                    <button class="admin-records-button admin-records-button-secondary" type="button" @click="swapLevel" :disabled="busy">
                                        {{ $t('Swap levels') }}
                                    </button>
                                </div>
                            </label>
                            <p v-else class="admin-records-hint">{{ $t('This level will be inserted at position {position}.', { position: newLevelRank }) }}</p>
                            <button
                                v-if="!isNewLevel"
                                class="admin-records-button admin-records-button-danger"
                                type="button"
                                @click="deleteLevel"
                                :disabled="busy"
                            >{{ $t('Delete level') }}</button>
                        </section>
                        <section v-if="selectedCategory === 'verifications'" class="admin-records-section">
                            <h2>{{ $t('Verification information') }}</h2>
                            <label v-if="!isNewLevel" class="admin-records-position">
                                {{ $t('Verification position') }}
                                <input v-model.number="selectedRunPosition" type="number" min="1" :max="runEntries.length" step="1" :disabled="busy">
                            </label>
                            <div class="admin-records-fields">
                                <label>
                                    {{ $t('Level name') }}
                                    <input v-model.trim="runForm.name" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Level ID') }}
                                    <input v-model.trim="runForm.id" type="number" min="1" step="1" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Creator') }}
                                    <input v-model.trim="runForm.author" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verifier') }}
                                    <input v-model.trim="runForm.verifier" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Expected Placement') }}
                                    <input v-model.trim="runForm.expectedplacement" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Qualification percentage') }}
                                    <input v-model="runForm.percentToQualify" type="number" min="0" max="100" step="any" :disabled="busy">
                                </label>
                                <label class="admin-records-field-wide">
                                    {{ $t('Verification video URL') }}
                                    <input v-model.trim="runForm.verification" type="url" :disabled="busy">
                                </label>
                            </div>
                        </section>
                        <section v-else class="admin-records-section">
                            <h2>{{ $t('Level information') }}</h2>
                            <div class="admin-records-fields">
                                <label>
                                    {{ $t('Level name') }}
                                    <input v-model.trim="levelForm.name" required :disabled="busy || !isNewLevel">
                                </label>
                                <label>
                                    {{ $t('Level ID') }}
                                    <input v-model.trim="levelForm.id" type="number" min="1" step="1" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Subtitle') }}
                                    <input v-model="levelForm.subtitle" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Creator') }}
                                    <input v-model.trim="levelForm.author" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verifier') }}
                                    <input v-model.trim="levelForm.verifier" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('AREDL placement') }}
                                    <input v-model.trim="levelForm.aredl" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verification date') }}
                                    <input v-model="levelForm.verificationDate" type="date" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Qualification percentage') }}
                                    <input v-model="levelForm.percentToQualify" type="number" min="0" max="100" step="any" required :disabled="busy">
                                </label>
                                <label class="admin-records-field-wide">
                                    {{ $t('Verification video URL') }}
                                    <input v-model.trim="levelForm.verification" type="url" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Tags (one per line)') }}
                                    <textarea v-model="levelForm.tagsText" rows="3" :disabled="busy"></textarea>
                                </label>
                                <label>
                                    {{ $t('Gameplay filters (one per line)') }}
                                    <textarea v-model="levelForm.filtersText" rows="3" :disabled="busy"></textarea>
                                </label>
                            </div>
                        </section>

                        <section v-if="selectedCategory !== 'verifications'" class="admin-records-section">
                            <div class="admin-records-section-heading">
                                <h2>{{ $t('Position history') }}</h2>
                                <button class="admin-records-button admin-records-button-secondary" type="button" @click="addHistoryEntry" :disabled="busy">
                                    {{ $t('Add history entry') }}
                                </button>
                            </div>
                            <p class="admin-records-hint">{{ $t('History date format: DD-MM-YYYY.') }}</p>
                            <div v-for="(entry, index) in levelForm.positionHistory" :key="index" class="admin-records-history-entry">
                                <label>
                                    {{ $t('Date') }}
                                    <input v-model.trim="entry.date" placeholder="DD-MM-YYYY" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Position') }}
                                    <input v-model="entry.position" type="number" min="1" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Change') }}
                                    <input v-model="entry.change" type="number" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Reason') }}
                                    <input v-model.trim="entry.reason" :disabled="busy">
                                </label>
                                <button
                                    class="admin-records-button admin-records-button-secondary"
                                    type="button"
                                    :aria-label="$t('Remove history entry')"
                                    @click="removeHistoryEntry(index)"
                                    :disabled="busy"
                                >×</button>
                            </div>
                        </section>

                        <section class="admin-records-records">
                            <h2>{{ $t('Records') }} ({{ currentRecords.length }})</h2>
                            <ul v-if="currentRecords.length">
                                <li v-for="(record, index) in currentRecords" :key="index">
                                    <span>{{ record.user }} — {{ record.percent }}% — {{ record.date }}</span>
                                    <button
                                        class="admin-records-button admin-records-button-secondary"
                                        type="button"
                                        :aria-label="$t('Remove record')"
                                        @click="removeRecord(index)"
                                        :disabled="busy"
                                    >×</button>
                                </li>
                            </ul>
                            <div class="admin-records-record-form">
                                <label>
                                    {{ $t('Player') }}
                                    <input v-model.trim="recordDraft.user" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Percentage') }}
                                    <input v-model="recordDraft.percent" type="number" min="0" max="100" step="any" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Date') }}
                                    <input v-model="recordDraft.date" type="date" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Video link') }}
                                    <input v-model.trim="recordDraft.link" type="text" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Refresh rate (Hz)') }}
                                    <input v-model="recordDraft.hz" type="number" min="1" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Phrase (optional)') }}
                                    <input v-model.trim="recordDraft.phrase" :disabled="busy">
                                </label>
                                <label class="admin-records-mobile">
                                    <input v-model="recordDraft.mobile" type="checkbox" :disabled="busy">
                                    {{ $t('Mobile record') }}
                                </label>
                                <button class="admin-records-button admin-records-button-secondary" type="button" @click="addRecord" :disabled="busy">
                                    {{ $t('Add record') }}
                                </button>
                            </div>
                        </section>
                        <div class="admin-records-actions">
                            <button
                                v-if="selectedCategory === 'verifications' && !isNewLevel"
                                class="admin-records-button admin-records-button-danger"
                                type="button"
                                @click="deleteRun"
                                :disabled="busy"
                            >{{ $t('Delete verification') }}</button>
                            <button class="admin-records-button" type="submit" :disabled="busy">
                                {{ busy ? $t('Loading...') : $t('Save changes') }}
                            </button>
                        </div>
                    </form>
                    <section v-else class="admin-records-empty">
                        <p>{{ $t('Choose an entry from the list or create a new one.') }}</p>
                    </section>
                    </div>
                </section>

                <p v-if="error" class="admin-records-message admin-records-error" role="alert">{{ error }}</p>
                <p v-if="success" class="admin-records-message admin-records-success" role="status">{{ success }}</p>
            </section>
        </main>
    `,
    data: () => ({
        recordsApiUrl: recordsApiUrl.replace(/\/$/, ''),
        token: sessionStorage.getItem('records-admin-token') || '',
        authorized: Boolean(sessionStorage.getItem('records-admin-token')),
        username: '',
        password: '',
        categories: [
            { id: 'verifications', label: 'Verifications' },
            { id: 'records', label: 'Records' },
            { id: 'changelog', label: 'Changelog' },
        ],
        selectedCategory: 'verifications',
        levels: [],
        levelEntries: [],
        runEntries: [],
        newLevelRank: 1,
        selectedLevelPosition: 1,
        swapLevelPosition: 1,
        selectedRunPosition: 1,
        searchQuery: '',
        selectedName: '',
        newLevelName: '',
        levelForm: emptyLevel(),
        runForm: emptyRun(),
        isNewLevel: false,
        busy: false,
        error: '',
        success: '',
        recordDraft: {
            user: '',
            percent: '',
            date: new Date().toISOString().slice(0, 10),
            link: '',
            hz: '',
            phrase: '',
            mobile: false,
        },
        changelogDraft: {
            date: new Date().toISOString().slice(0, 10),
            message: '',
            featured: false,
        },
        changelogEntries: [],
        changelogLoaded: false,
    }),
    computed: {
        categoryItems() {
            if (this.selectedCategory === 'verifications') {
                const listedLevels = new Set(this.levels.map((level) => level.toLocaleLowerCase()));
                return this.runEntries
                    .filter((run) => !listedLevels.has(run.path.toLocaleLowerCase()))
                    .map((run) => ({
                    path: run.path,
                    name: run.name,
                    rank: this.runEntries.findIndex((entry) => entry.path === run.path) + 1,
                    summary: run.expectedplacement || '',
                }));
            }

            return this.levelEntries
                .map((level) => {
                    const records = Array.isArray(level.records) ? level.records : [];
                    const completions = records.filter((record) => Number(record.percent) === 100).length;
                    const progress = records.filter((record) => Number(record.percent) < 100).length;
                    return {
                        path: level.path,
                        name: level.name,
                        rank: level.rank,
                        summary: this.$t('Level counts: {completions} completions · {progress} progress', {
                            completions,
                            progress,
                        }),
                    };
                });
        },
        filteredItems() {
            const search = this.searchQuery.toLocaleLowerCase();
            return this.categoryItems.filter((item) =>
                !search || `${item.name} ${item.path} ${item.rank}`.toLocaleLowerCase().includes(search),
            );
        },
        currentRecords() {
            return this.selectedCategory === 'verifications'
                ? this.runForm.records
                : this.levelForm.records;
        },
    },
    async mounted() {
        try {
            const [levels, runs] = await Promise.all([fetchList(), fetchRuns()]);
            if (!levels || !runs) throw new Error('Failed to load level catalogs');
            this.levelEntries = levels.map(([level, missingPath], index) => level
                ? { ...level, path: level.path || missingPath, rank: index + 1 }
                : {
                    path: missingPath,
                    name: missingPath,
                    records: [],
                    positionHistory: [],
                    unavailable: true,
                    rank: index + 1,
                });
            this.levels = this.levelEntries.map((level) => level.path);
            this.newLevelRank = this.levelEntries.length + 1;
            this.runEntries = runs.map(([run, missingPath]) => run
                ? { ...run, path: run.path || missingPath }
                : {
                    path: missingPath,
                    name: missingPath,
                    expectedplacement: '',
                    records: [],
                    unavailable: true,
                });
            const missingLevels = this.levelEntries.filter((level) => level.unavailable);
            const missingRuns = this.runEntries.filter((run) => run.unavailable);
            const loadErrors = [];
            if (missingLevels.length) {
                loadErrors.push(this.$t('Some level files could not be loaded: {levels}', {
                    levels: missingLevels.map(({ path }) => path).join(', '),
                }));
            }
            if (missingRuns.length) {
                loadErrors.push(this.$t('Some verification files could not be loaded: {runs}', {
                    runs: missingRuns.map(({ path }) => path).join(', '),
                }));
            }
            this.error = loadErrors.join(' ');
        } catch {
            this.error = this.$t('The level and verification lists could not be loaded.');
        }
    },
    methods: {
        async request(path, options = {}) {
            const headers = new Headers(options.headers || {});
            if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
            if (options.body) headers.set('Content-Type', 'application/json');

            let response;
            try {
                response = await fetch(`${this.recordsApiUrl}${path}`, { ...options, headers });
            } catch {
                throw new Error(this.$t('Unable to contact the records service.'));
            }

            const result = await response.json().catch(() => ({}));
            if (response.status === 401 && path !== '/api/login') {
                this.logout();
                throw new Error(this.$t('Your session has expired. Sign in again.'));
            }
            if (!response.ok) {
                throw new Error(result.error || this.$t('Unable to contact the records service.'));
            }
            return result;
        },
        async login() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const result = await this.request('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ username: this.username, password: this.password }),
                });
                this.token = result.token;
                sessionStorage.setItem('records-admin-token', this.token);
                this.authorized = true;
                this.password = '';
                if (this.categoryItems.length) {
                    await this.selectItem(this.categoryItems[0]);
                }
            } catch (error) {
                this.error = error.message === 'Invalid credentials'
                    ? this.$t('Invalid username or password.')
                    : error.message;
            } finally {
                this.busy = false;
            }
        },
        async selectCategory(category) {
            if (!this.categories.some((item) => item.id === category)) return;
            this.selectedCategory = category;
            this.selectedName = '';
            this.levelForm = emptyLevel();
            this.runForm = emptyRun();
            this.isNewLevel = false;
            this.searchQuery = '';
            this.error = '';
            this.success = '';
            if (category === 'changelog') await this.loadChangelog();
        },
        async selectItem(item) {
            this.selectedName = item.path;
            const entry = this.levelEntries.find((level) => level.path === item.path);
            this.selectedLevelPosition = entry?.rank || 1;
            this.swapLevelPosition = entry?.rank || 1;
            const runIndex = this.runEntries.findIndex((run) => run.path === item.path);
            this.selectedRunPosition = runIndex >= 0 ? runIndex + 1 : this.runEntries.length + 1;
            await this.loadSelected();
        },
        async loadSelected() {
            if (!this.selectedName) return;
            this.busy = true;
            this.error = '';
            this.success = '';
            this.isNewLevel = false;
            try {
                const path = this.selectedCategory === 'verifications'
                    ? `/data/runs/${encodeURIComponent(this.selectedName)}.json`
                    : `/data/${encodeURIComponent(this.selectedName)}.json`;
                const response = await fetch(path, { cache: 'no-store' });
                if (!response.ok) throw new Error(String(response.status));
                const level = await response.json();
                if (this.selectedCategory === 'verifications') {
                    this.runForm = {
                        ...emptyRun(level.name || this.selectedName),
                        id: level.id == null ? '' : String(level.id),
                        author: level.author || '',
                        expectedplacement: level.expectedplacement || '',
                        verifier: level.verifier || '',
                        verification: level.verification || '',
                        percentToQualify: String(level.percentToQualify ?? '0'),
                        records: Array.isArray(level.records) ? level.records.map((record) => ({ ...record })) : [],
                    };
                } else {
                    this.levelForm = {
                        ...emptyLevel(level.name || this.selectedName),
                        id: level.id == null ? '' : String(level.id),
                        subtitle: level.subtitle ?? '-',
                        author: level.author || '',
                        verifier: level.verifier || '',
                        aredl: level.aredl || '',
                        verificationDate: level.verificationDate || '',
                        tagsText: Array.isArray(level.tags) ? level.tags.join('\n') : '',
                        filtersText: Array.isArray(level.filters) ? level.filters.join('\n') : '',
                        verification: level.verification || '',
                        percentToQualify: String(level.percentToQualify ?? '100'),
                        positionHistory: Array.isArray(level.positionHistory)
                            ? level.positionHistory.map((entry) => ({
                                date: entry.date || '',
                                change: entry.change == null ? '' : String(entry.change),
                                position: entry.position == null ? '' : String(entry.position),
                                reason: entry.reason || '',
                            }))
                            : [],
                        records: Array.isArray(level.records) ? level.records.map((record) => ({ ...record })) : [],
                    };
                }
            } catch {
                this.error = this.$t('Error: {message}', { message: this.selectedName });
                this.selectedName = '';
                this.levelForm = emptyLevel();
                this.runForm = emptyRun();
            } finally {
                this.busy = false;
            }
        },
        createItem() {
            if (this.selectedCategory === 'verifications') {
                this.createRun();
            } else {
                this.createLevel();
            }
        },
        createLevel() {
            const name = this.newLevelName.trim();
            if (!levelNamePattern.test(name)) {
                this.error = this.$t('Enter a level file name using letters, numbers, spaces, apostrophes, underscores or hyphens.');
                this.success = '';
                return;
            }
            const existing = this.levelEntries.find((level) =>
                level.path.toLocaleLowerCase() === name.toLocaleLowerCase(),
            );
            if (existing) {
                this.selectedName = existing.path;
                this.selectedLevelPosition = existing.rank;
                this.loadSelected();
                return;
            }
            if (!Number.isInteger(this.newLevelRank) ||
                this.newLevelRank < 1 ||
                this.newLevelRank > Math.min(this.levelEntries.length + 1, 300)) {
                this.error = this.$t('Enter a valid position in the top.');
                this.success = '';
                return;
            }
            this.error = '';
            this.success = '';
            this.isNewLevel = true;
            this.selectedName = name;
            this.selectedLevelPosition = this.newLevelRank;
            this.levelForm = emptyLevel(name);
            this.runForm = emptyRun();
        },
        createRun() {
            const name = this.newLevelName.trim();
            if (!levelNamePattern.test(name)) {
                this.error = this.$t('Enter a level file name using letters, numbers, spaces, apostrophes, underscores or hyphens.');
                this.success = '';
                return;
            }
            if (this.levels.some((level) => level.toLocaleLowerCase() === name.toLocaleLowerCase())) {
                this.error = this.$t('Listed levels must be edited in Records.');
                this.success = '';
                return;
            }
            const existing = this.runEntries.find((run) =>
                run.path.toLocaleLowerCase() === name.toLocaleLowerCase(),
            );
            if (existing) {
                this.selectedName = existing.path;
                this.loadSelected();
                return;
            }
            this.error = '';
            this.success = '';
            this.isNewLevel = true;
            this.selectedName = name;
            this.selectedRunPosition = this.runEntries.length + 1;
            this.runForm = emptyRun(name);
            this.levelForm = emptyLevel();
        },
        addRecord() {
            try {
                if (!this.recordDraft.user.trim()) {
                    throw new Error(this.$t('Enter a player name.'));
                }
                if (!this.recordDraft.date || Number.isNaN(Date.parse(this.recordDraft.date))) {
                    throw new Error(this.$t('Enter a valid record date.'));
                }
                if (this.recordDraft.percent === '') {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }
                const percent = Number(this.recordDraft.percent);
                if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }

                const record = {
                    user: this.recordDraft.user,
                    date: this.recordDraft.date,
                    link: this.recordDraft.link || 'No video',
                    percent,
                };
                if (this.recordDraft.hz) record.hz = Number(this.recordDraft.hz);
                if (this.recordDraft.phrase) record.phrase = this.recordDraft.phrase;
                if (this.recordDraft.mobile) record.mobile = true;
                this.currentRecords.push(record);
                this.recordDraft = {
                    user: '',
                    percent: '',
                    date: new Date().toISOString().slice(0, 10),
                    link: '',
                    hz: '',
                    phrase: '',
                    mobile: false,
                };
                this.error = '';
            } catch (error) {
                this.error = error.message;
            }
        },
        removeRecord(index) {
            this.currentRecords.splice(index, 1);
        },
        addHistoryEntry() {
            this.levelForm.positionHistory.push({
                date: '',
                change: '',
                position: '',
                reason: '',
            });
        },
        removeHistoryEntry(index) {
            this.levelForm.positionHistory.splice(index, 1);
        },
        async swapLevel() {
            if (this.selectedCategory !== 'records' || this.isNewLevel || !this.selectedName) return;
            const currentPosition = this.levels.indexOf(this.selectedName) + 1;
            const otherPosition = this.swapLevelPosition;
            if (!currentPosition || !Number.isInteger(otherPosition) ||
                otherPosition < 1 || otherPosition > this.levels.length) {
                this.error = this.$t('Enter a valid position in the top.');
                this.success = '';
                return;
            }
            if (currentPosition === otherPosition) return;

            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const oldLevels = [...this.levels];
                const otherName = oldLevels[otherPosition - 1];
                const updatedLevels = [...oldLevels];
                [updatedLevels[currentPosition - 1], updatedLevels[otherPosition - 1]] =
                [updatedLevels[otherPosition - 1], updatedLevels[currentPosition - 1]];

                const entriesByPath = new Map(this.levelEntries.map((entry) => [entry.path, entry]));
                const selectedLevel = entriesByPath.get(this.selectedName);
                const otherLevel = entriesByPath.get(otherName);
                if (!selectedLevel || selectedLevel.unavailable || !otherLevel || otherLevel.unavailable) {
                    throw new Error(this.$t('Cannot update position history because a level file could not be loaded. Reload the page and try again.'));
                }

                const today = formatHistoryDate();
        
                const minPosition = Math.min(currentPosition, otherPosition);
                const nivelArriba = (otherPosition < currentPosition) ? this.selectedName : otherName;
                const swapMsg = `${this.selectedName} and ${otherName} have been swapped, with now ${nivelArriba} sitting above at #${minPosition}`;
                const updatedSelected = withPositionChange(
                    selectedLevel,
                    currentPosition,
                    otherPosition,
                    swapMsg,
                    today,
                );
                const updatedOther = withPositionChange(
                    otherLevel,
                    otherPosition,
                    currentPosition,
                    swapMsg,
                    today,
                );
                const files = [
                    {
                        path: `data/${this.selectedName}.json`,
                        content: levelFileContent(updatedSelected),
                    },
                    {
                        path: `data/${otherName}.json`,
                        content: levelFileContent(updatedOther),
                    },
                    {
                        path: 'data/_list.json',
                        content: JSON.stringify(updatedLevels, null, 4),
                    },
                ];

                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({ files, expectedList: oldLevels }),
                });

                entriesByPath.set(this.selectedName, updatedSelected);
                entriesByPath.set(otherName, updatedOther);
                this.levels = updatedLevels;
                this.levelEntries = updatedLevels.map((path, index) => ({
                    ...entriesByPath.get(path),
                    rank: index + 1,
                }));
                this.selectedLevelPosition = otherPosition;
                this.swapLevelPosition = currentPosition;
                this.levelForm.positionHistory = updatedSelected.positionHistory.map((entry) => ({ ...entry }));
        
        // Mensaje de éxito actualizado usando la misma variable
                this.success = swapMsg;
                } catch (error) {
                    this.error = error.message;
                } finally {
                    this.busy = false;
                }
        },
        async saveLevel() {
            if (this.selectedCategory === 'verifications') {
                await this.saveRun();
                return;
            }
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const id = Number(this.levelForm.id);
                const percentToQualify = Number(this.levelForm.percentToQualify);
                if (!Number.isSafeInteger(id) || id < 1) {
                    throw new Error(this.$t('Enter a valid numeric level ID.'));
                }
                if (!Number.isFinite(percentToQualify) || percentToQualify < 0 || percentToQualify > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }

                const positionHistory = this.levelForm.positionHistory.map((entry) => ({
                    date: entry.date.trim(),
                    change: entry.change === '' ? null : Number(entry.change),
                    position: Number(entry.position),
                    reason: entry.reason.trim(),
                }));
                if (this.isNewLevel) {
                    positionHistory.push({
                        date: formatHistoryDate(),
                        change: null,
                        position: this.newLevelRank,
                        reason: `Placed ${this.selectedName} at #${this.newLevelRank}`,
                    });
                }
                const level = {
                    id,
                    name: this.levelForm.name.trim(),
                    subtitle: this.levelForm.subtitle.trim() || '-',
                    author: this.levelForm.author.trim(),
                    verifier: this.levelForm.verifier.trim(),
                    aredl: this.levelForm.aredl.trim(),
                    verificationDate: this.levelForm.verificationDate,
                    tags: this.levelForm.tagsText.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean),
                    filters: this.levelForm.filtersText.split(/\r?\n/).map((filter) => filter.trim()).filter(Boolean),
                    verification: this.levelForm.verification.trim(),
                    percentToQualify: String(percentToQualify),
                    positionHistory,
                    records: this.levelForm.records,
                };
                if (!level.name) throw new Error(this.$t('Enter a level name.'));
                for (const entry of level.positionHistory) {
                    if (!/^\d{2}-\d{2}-\d{4}$/.test(entry.date) ||
                        !Number.isInteger(entry.position) || entry.position < 1 ||
                        (entry.change !== null && !Number.isInteger(entry.change)) ||
                        !entry.reason) {
                        throw new Error(this.$t('Complete each history entry with a date, position and reason.'));
                    }
                }

                const oldLevels = [...this.levels];
                const updatedLevels = [...oldLevels];
                if (this.isNewLevel) {
                    if (!Number.isInteger(this.newLevelRank) ||
                        this.newLevelRank < 1 || this.newLevelRank > updatedLevels.length + 1) {
                        throw new Error(this.$t('Enter a valid position in the top.'));
                    }
                    updatedLevels.splice(this.newLevelRank - 1, 0, this.selectedName);
                } else {
                    const oldPosition = updatedLevels.indexOf(this.selectedName) + 1;
                    if (!oldPosition || !Number.isInteger(this.selectedLevelPosition) ||
                        this.selectedLevelPosition < 1 || this.selectedLevelPosition > updatedLevels.length) {
                        throw new Error(this.$t('Enter a valid position in the top.'));
                    }
                    updatedLevels.splice(oldPosition - 1, 1);
                    updatedLevels.splice(this.selectedLevelPosition - 1, 0, this.selectedName);
                }

                const orderChanged = this.isNewLevel ||
                    oldLevels.some((path, index) => updatedLevels[index] !== path);
                const today = formatHistoryDate();
                const entriesByPath = new Map(this.levelEntries.map((entry) => [entry.path, entry]));
                const files = [{
                    path: `data/${this.selectedName}.json`,
                    content: JSON.stringify(level, null, 4),
                }];
                const changedLevels = updatedLevels.flatMap((path, index) => {
                    const oldPosition = oldLevels.indexOf(path) + 1;
                    const newPosition = index + 1;
                    return oldPosition && oldPosition !== newPosition
                        ? [{ path, oldPosition, newPosition }]
                        : [];
                });
                for (const changed of changedLevels) {
                    if (changed.path === this.selectedName) {
                        level.positionHistory = withPositionChange(
                            level,
                            changed.oldPosition,
                            changed.newPosition,
                            `Placed ${level.name} at #${changed.newPosition}`,
                            today,
                        ).positionHistory;
                        files[0].content = JSON.stringify(level, null, 4);
                        continue;
                    }
                    const existing = entriesByPath.get(changed.path);
                    if (!existing || existing.unavailable) {
                        throw new Error(this.$t('Cannot update position history because a level file could not be loaded. Reload the page and try again.'));
                    }
                    const updated = withPositionChange(
                        existing,
                        changed.oldPosition,
                        changed.newPosition,
                        this.isNewLevel
                            ? `Placed ${this.selectedName} at #${this.newLevelRank}`
                            : `Moved ${this.selectedName} to #${this.selectedLevelPosition}`,
                        today,
                    );
                    entriesByPath.set(changed.path, updated);
                    files.push({
                        path: `data/${changed.path}.json`,
                        content: levelFileContent(updated),
                    });
                }
                if (orderChanged) {
                    files.push({
                        path: 'data/_list.json',
                        content: JSON.stringify(updatedLevels, null, 4),
                    });
                }

                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files,
                        expectedList: orderChanged ? oldLevels : undefined,
                    }),
                });
                this.levels = updatedLevels;
                entriesByPath.set(this.selectedName, { ...level, path: this.selectedName });
                this.levelEntries = updatedLevels.map((path, index) => ({
                    ...entriesByPath.get(path),
                    rank: index + 1,
                }));
                this.newLevelRank = this.levelEntries.length + 1;
                this.selectedLevelPosition = updatedLevels.indexOf(this.selectedName) + 1;
                this.levelForm.positionHistory = level.positionHistory.map((entry) => ({ ...entry }));
                this.isNewLevel = false;
                this.success = this.$t('Changes saved successfully.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async deleteLevel() {
            if (this.selectedCategory !== 'records' || this.isNewLevel || !this.selectedName) return;
            const name = this.selectedName;
            if (!window.confirm(this.$t('Delete level {name}? This action cannot be undone.', { name }))) return;

            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const oldLevels = [...this.levels];
                const oldPosition = oldLevels.indexOf(name) + 1;
                if (!oldPosition) throw new Error(this.$t('The level is not in the current list.'));
                const updatedLevels = oldLevels.filter((path) => path !== name);
                const today = formatHistoryDate();
                const entriesByPath = new Map(this.levelEntries.map((entry) => [entry.path, entry]));
                const files = [{
                    path: 'data/_list.json',
                    content: JSON.stringify(updatedLevels, null, 4),
                }];

                for (const [index, path] of updatedLevels.entries()) {
                    const previousPosition = oldLevels.indexOf(path) + 1;
                    const newPosition = index + 1;
                    if (previousPosition === newPosition) continue;
                    const existing = entriesByPath.get(path);
                    if (!existing || existing.unavailable) {
                        throw new Error(this.$t('Cannot update position history because a level file could not be loaded. Reload the page and try again.'));
                    }
                    const updated = withPositionChange(
                        existing,
                        previousPosition,
                        newPosition,
                        `Removed ${name} from #${oldPosition}`,
                        today,
                    );
                    entriesByPath.set(path, updated);
                    files.push({
                        path: `data/${path}.json`,
                        content: levelFileContent(updated),
                    });
                }

                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files,
                        deletePaths: [`data/${name}.json`],
                        expectedList: oldLevels,
                    }),
                });

                this.levels = updatedLevels;
                this.levelEntries = updatedLevels.map((path, index) => ({
                    ...entriesByPath.get(path),
                    rank: index + 1,
                }));
                this.newLevelRank = Math.min(oldPosition, updatedLevels.length + 1);
                this.selectedName = '';
                this.levelForm = emptyLevel();
                this.isNewLevel = false;
                this.success = this.$t('Level deleted and position histories updated.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async deleteRun() {
            if (this.selectedCategory !== 'verifications' || this.isNewLevel || !this.selectedName) return;
            const name = this.selectedName;
            if (!window.confirm(this.$t('Delete verification for {name}? This action cannot be undone.', { name }))) return;

            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const oldRuns = this.runEntries.map(({ path }) => path);
                if (!oldRuns.includes(name)) {
                    throw new Error(this.$t('The verification is not in the current list.'));
                }
                const updatedRuns = oldRuns.filter((path) => path !== name);
                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files: [{
                            path: 'data/runs/_runs.json',
                            content: JSON.stringify(updatedRuns, null, 4),
                        }],
                        deletePaths: [`data/runs/${name}.json`],
                        expectedRuns: oldRuns,
                    }),
                });

                this.runEntries = this.runEntries.filter((run) => run.path !== name);
                this.selectedName = '';
                this.runForm = emptyRun();
                this.isNewLevel = false;
                this.success = this.$t('Verification deleted.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async saveRun() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const id = Number(this.runForm.id);
                if (!Number.isSafeInteger(id) || id < 1) {
                    throw new Error(this.$t('Enter a valid numeric level ID.'));
                }
                const percentToQualify = Number(this.runForm.percentToQualify);
                if (!Number.isFinite(percentToQualify) || percentToQualify < 0 || percentToQualify > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }
                const run = {
                    id,
                    name: this.runForm.name.trim(),
                    author: this.runForm.author.trim(),
                    expectedplacement: this.runForm.expectedplacement.trim(),
                    verifier: this.runForm.verifier.trim(),
                    verification: this.runForm.verification.trim(),
                    percentToQualify: String(percentToQualify),
                    records: this.runForm.records,
                };
                if (!run.name) throw new Error(this.$t('Enter a level name.'));

                const oldRuns = this.runEntries.map(({ path }) => path);
                const updatedRuns = [...oldRuns];
                if (this.isNewLevel) {
                    if (!Number.isInteger(this.selectedRunPosition) ||
                        this.selectedRunPosition < 1 || this.selectedRunPosition > Math.min(updatedRuns.length + 1, 300)) {
                        throw new Error(this.$t('Enter a valid verification position.'));
                    }
                    updatedRuns.splice(this.selectedRunPosition - 1, 0, this.selectedName);
                } else {
                    const oldPosition = updatedRuns.indexOf(this.selectedName) + 1;
                    if (!oldPosition || !Number.isInteger(this.selectedRunPosition) ||
                        this.selectedRunPosition < 1 || this.selectedRunPosition > updatedRuns.length) {
                        throw new Error(this.$t('Enter a valid verification position.'));
                    }
                    updatedRuns.splice(oldPosition - 1, 1);
                    updatedRuns.splice(this.selectedRunPosition - 1, 0, this.selectedName);
                }
                const orderChanged = this.isNewLevel || oldRuns.some((path, index) => path !== updatedRuns[index]);
                const files = [{
                    path: `data/runs/${this.selectedName}.json`,
                    content: JSON.stringify(run, null, 4),
                }];
                if (orderChanged) {
                    files.push({
                        path: 'data/runs/_runs.json',
                        content: JSON.stringify(updatedRuns, null, 4),
                    });
                }
                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files,
                        expectedRuns: orderChanged ? oldRuns : undefined,
                    }),
                });
                const entriesByPath = new Map(this.runEntries.map((entry) => [entry.path, entry]));
                entriesByPath.set(this.selectedName, { ...run, path: this.selectedName });
                this.runEntries = updatedRuns.map((path) => entriesByPath.get(path));
                this.selectedRunPosition = updatedRuns.indexOf(this.selectedName) + 1;
                this.isNewLevel = false;
                this.success = this.$t('Changes saved successfully.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async addChangelogEntry() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const message = this.changelogDraft.message.trim();
                if (!message) throw new Error(this.$t('Enter a changelog message.'));
                const [year, month, day] = this.changelogDraft.date.split('-');
                const entry = {
                    date: `${day}-${month}-${year}`,
                    message: message.split(/\r?\n/).map((line) => `• ${line.trim()}`).join('<br>'),
                    featured: this.changelogDraft.featured,
                };
                if (!this.changelogLoaded) await this.loadChangelog();
                if (!this.changelogLoaded) throw new Error(this.error || this.$t('Could not load existing changelog entries.'));
                const entries = [...this.changelogEntries];
                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files: [{
                            path: 'data/_changelog.json',
                            content: JSON.stringify([entry, ...entries], null, 4),
                        }],
                        expectedChangelog: entries,
                    }),
                });
                this.changelogEntries = [entry, ...entries];
                this.changelogDraft = {
                    date: new Date().toISOString().slice(0, 10),
                    message: '',
                    featured: false,
                };
                this.success = this.$t('Changelog entry published.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async loadChangelog() {
            try {
                const response = await fetch('/data/_changelog.json', { cache: 'no-store' });
                if (!response.ok) throw new Error(this.$t('Could not load existing changelog entries.'));
                const entries = await response.json();
                if (!Array.isArray(entries)) throw new Error(this.$t('The changelog data is invalid.'));
                this.changelogEntries = entries;
                this.changelogLoaded = true;
            } catch (error) {
                this.error = error.message;
            }
        },
        async deleteChangelogEntry(index) {
            const entry = this.changelogEntries[index];
            if (!entry) return;
            if (!window.confirm(this.$t('Delete changelog entry from {date}? This action cannot be undone.', {
                date: entry.date,
            }))) return;

            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const existing = [...this.changelogEntries];
                const updated = existing.filter((_, entryIndex) => entryIndex !== index);
                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({
                        files: [{
                            path: 'data/_changelog.json',
                            content: JSON.stringify(updated, null, 4),
                        }],
                        expectedChangelog: existing,
                    }),
                });
                this.changelogEntries = updated;
                this.success = this.$t('Changelog entry deleted.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        logout() {
            sessionStorage.removeItem('records-admin-token');
            this.token = '';
            this.authorized = false;
            this.password = '';
            this.selectedName = '';
            this.levelForm = emptyLevel();
            this.runForm = emptyRun();
            this.isNewLevel = false;
            this.success = '';
        },
    },
};
