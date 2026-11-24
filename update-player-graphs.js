const fs = require('fs');
const path = require('path');

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

async function updatePlayerGraphs() {
    const { calculateLeaderboard } = await import('./js/scoring.mjs');
    const listPath = path.join(__dirname, 'data', '_list.json');
    const list = JSON.parse(fs.readFileSync(listPath, 'utf-8'));
    const snapshotPath = path.join(__dirname, 'data', '_point_snapshots.json');
    const snapshots = fs.existsSync(snapshotPath)
        ? JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'))
        : { snapshots: [] };
    const currentDate = getCurrentDate();
    const levels = [];

    for (let index = 0; index < list.length; index++) {
        const levelPath = path.join(__dirname, 'data', `${list[index]}.json`);
        if (!fs.existsSync(levelPath)) {
            console.warn(`Skipping missing level file at rank #${index + 1}: ${list[index]}`);
            continue;
        }

        levels.push({
            ...JSON.parse(fs.readFileSync(levelPath, 'utf-8')),
            rank: index + 1,
        });
    }

    const leaderboard = calculateLeaderboard(levels, list.length);
    const newSnapshot = {
        date: currentDate,
        players: {},
    };

    leaderboard.forEach((player) => {
        const playerLevels = [...player.verified, ...player.completed, ...player.progressed];
        const levelData = Object.fromEntries(playerLevels.map((event) => [
            event.level,
            {
                points: event.score,
                type: event.type,
                ...(event.type === 'progressed' ? { percent: event.percent } : {}),
            },
        ]));

        newSnapshot.players[player.user] = {
            total: player.total,
            levelCount: playerLevels.length,
            levels: levelData,
        };
    });

    const existingIndex = snapshots.snapshots.findIndex((snapshot) => snapshot.date === currentDate);
    if (existingIndex !== -1) {
        snapshots.snapshots[existingIndex] = newSnapshot;
    } else {
        snapshots.snapshots.push(newSnapshot);
    }

    snapshots.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshots, null, 2), 'utf-8');

    console.log(`Snapshot saved for ${currentDate} with ${leaderboard.length} players.`);
}

updatePlayerGraphs().catch((error) => {
    console.error('Failed to update player point snapshots.', error);
    process.exitCode = 1;
});
