import { calculateLeaderboard } from './scoring.mjs';

const dir = '/data';

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchRuns() {
    const runsResult = await fetch(`${dir}/runs/_runs.json`);
    try {
        const runs = await runsResult.json();
        return await Promise.all(
            runs.map(async (path, rank) => {
                const runResult = await fetch(`${dir}/runs/${path}.json`);
                try {
                    const run = await runResult.json();
                    return [
                        {
                            ...run,
                            path,
                            records: run.records?.sort((a, b) => b.percent - a.percent) || [],
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load run #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        console.error(`Failed to load runs.`);
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchPlayerHistory(playerName) {
    try {
        const snapshotsResult = await fetch(`${dir}/_point_snapshots.json`);
        const snapshots = await snapshotsResult.json();
        
        return snapshots.snapshots
            .filter(s => s.players[playerName])
            .map(s => ({
                date: s.date,
                total: s.players[playerName].total
            }));
    } catch {
        return [];
    }
}

export async function fetchLeaderboard(levelList) {
    const list = levelList || await fetchList();

    const errs = [];
    const levels = list.map(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return null;
        }
        return { ...level, rank: rank + 1 };
    });

    const res = calculateLeaderboard(levels, list.length);

    const allLevels = levels
        .filter(Boolean)
        .map((level) => ({
            id: level.id,
            level: level.name,
            rank: level.rank,
            link: level.verification || '#',
            tags: level.tags || [],
            filters: level.filters || [],
            score: 0,
            percentToQualify: level.percentToQualify,
            skills: level.skills || [],
            subtitle: level.subtitle || null,
            records: Array.isArray(level.records) ? level.records : [],
        }));

    return [res.sort((a, b) => b.total - a.total), errs, allLevels];
}