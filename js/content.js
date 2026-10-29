import { round, score } from './score.js';

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
                total: s.players[playerName].total,
                tagBonuses: s.players[playerName].tagBonuses || []
            }));
    } catch {
        return [];
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        // ALWAYS calculate from current rank, ignore stored verificationPointsEarned
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
            date: level.verificationDate,
        });

        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                // ALWAYS calculate from current rank, ignore stored pointsEarned
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                    date: record.date,
                });
                return;
            }

            // ALWAYS calculate from current rank, ignore stored pointsEarned
            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
                date: record.date,
            });
        });
    });

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    const allLevels = list
        .filter(([level]) => level)
        .map(([level], rank) => ({
            level: level.name,
            rank: rank + 1,
            link: level.verification || '#',
            tags: level.tags || [],
            score: 0,
            percentToQualify: level.percentToQualify,
            skills: level.skills || [],
            subtitle: level.subtitle || null,
            records: Array.isArray(level.records) ? level.records : [],
        }));

    return [res.sort((a, b) => b.total - a.total), errs, allLevels];
}