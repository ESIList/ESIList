const fs = require('fs');
const path = require('path');

const scale = 3;

function score(rank, percent, minPercent) {
    if (rank > 150) {
        return 0;
    }
    if (rank > 75 && percent < 100) {
        return 0;
    }

    let score = (-24.9975 * Math.pow(rank - 1, 0.4) + 200) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}

function loadTags() {
    // Load tags from the frontend component file
    const tagsPath = path.join(__dirname, 'js', 'components', 'List', 'Tags.js');
    
    if (!fs.existsSync(tagsPath)) {
        console.warn('⚠️  Tags.js not found, tag bonuses will not be calculated');
        return [];
    }
    
    try {
        const tagsContent = fs.readFileSync(tagsPath, 'utf-8');
        // Extract the default export array from the file
        const match = tagsContent.match(/export\s+default\s+(\[[\s\S]*?\]);/);
        if (match) {
            // Use eval to parse the array (safe since we control the file)
            const tags = eval(match[1]);
            return tags.filter(tag => tag.bonusEnabled);
        }
    } catch (error) {
        console.warn('⚠️  Could not parse Tags.js:', error.message);
    }
    
    return [];
}

function calculateTagBonuses(playerPoints, allLevels, tags) {
    const playerBonuses = {};
    
    Object.keys(playerPoints).forEach(player => {
        const completedLevels = new Set(
            Object.keys(playerPoints[player]).filter(
                levelName => playerPoints[player][levelName].type === 'verified' ||
                             playerPoints[player][levelName].type === 'completed'
            )
        );
        
        let totalBonus = 0;
        const bonusDetails = [];
        
        tags.forEach(tag => {
            const levelsWithTag = allLevels.filter(level =>
                Array.isArray(level.tags) &&
                level.tags.some(t =>
                    String(t).toLowerCase() === tag.id.toLowerCase() ||
                    String(t).toLowerCase() === tag.name.toLowerCase()
                )
            );
            
            if (levelsWithTag.length === 0) return;
            
            const totalLevelScore = levelsWithTag.reduce((sum, level) => {
                const lvlScore = score(level.rank, 100, level.percentToQualify || 50);
                return sum + lvlScore;
            }, 0);
            
            const averageLevelScore = totalLevelScore / (levelsWithTag.length * 2);
            const bonus = round(averageLevelScore);
            
            const completedAll = levelsWithTag.every(l => completedLevels.has(l.name));
            
            if (completedAll && bonus > 0) {
                bonusDetails.push({ name: tag.name, bonus });
                totalBonus += bonus;
            }
        });
        
        if (totalBonus > 0) {
            playerBonuses[player] = {
                total: round(totalBonus),
                bonuses: bonusDetails
            };
        }
    });
    
    return playerBonuses;
}

function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function updatePlayerGraphs() {
    console.log('🔄 Updating player graph snapshots...\n');
    console.log(`📅 Date: ${getCurrentDate()}\n`);

    const listPath = path.join(__dirname, 'data', '_list.json');
    const list = JSON.parse(fs.readFileSync(listPath, 'utf-8'));

    const snapshotPath = path.join(__dirname, 'data', '_point_snapshots.json');
    let snapshots = { snapshots: [] };
    
    // Cargar snapshots existentes
    if (fs.existsSync(snapshotPath)) {
        snapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    }

    const currentDate = getCurrentDate();
    const playerPoints = {}; // { "PlayerName": { "LevelName": points } }
    const allLevels = []; // Store all levels with their metadata

    console.log('📊 Calculating current points for all players...\n');

    // Calcular puntos actuales para todos los jugadores
    for (let rank = 0; rank < list.length; rank++) {
        const levelPath = path.join(__dirname, 'data', `${list[rank]}.json`);
        
        if (!fs.existsSync(levelPath)) continue;

        const level = JSON.parse(fs.readFileSync(levelPath, 'utf-8'));
        const levelName = level.name;

        // Store level metadata for tag bonus calculation
        allLevels.push({
            name: levelName,
            rank: rank + 1,
            tags: level.tags || [],
            percentToQualify: level.percentToQualify || 50
        });

        // Verificador
        if (level.verifier) {
            const verifier = level.verifier;
            playerPoints[verifier] = playerPoints[verifier] || {};
            playerPoints[verifier][levelName] = {
                points: score(rank + 1, 100, level.percentToQualify || 50),
                type: 'verified'
            };
        }

        // Records
        if (level.records && Array.isArray(level.records)) {
            level.records.forEach(record => {
                const user = record.user;
                playerPoints[user] = playerPoints[user] || {};
                playerPoints[user][levelName] = {
                    points: score(rank + 1, record.percent, level.percentToQualify || 50),
                    type: record.percent === 100 ? 'completed' : 'progressed',
                    percent: record.percent
                };
            });
        }
    }

    // Load tags and calculate bonuses
    console.log('🏷️  Calculating tag bonuses...\n');
    const tags = loadTags();
    const tagBonuses = calculateTagBonuses(playerPoints, allLevels, tags);

    // Crear snapshot del día
    const newSnapshot = {
        date: currentDate,
        players: {}
    };

    // Calcular total por jugador (incluyendo bonuses)
    for (const [player, levels] of Object.entries(playerPoints)) {
        const baseTotal = Object.values(levels).reduce((sum, data) => sum + data.points, 0);
        const bonusTotal = tagBonuses[player]?.total || 0;
        const total = baseTotal + bonusTotal;

        newSnapshot.players[player] = {
            total: round(total),
            levelCount: Object.keys(levels).length,
            levels: levels
        };

        // Add tag bonus info if exists
        if (tagBonuses[player]) {
            newSnapshot.players[player].tagBonuses = tagBonuses[player].bonuses;
            console.log(`  ✅ ${player}: +${bonusTotal} from ${tagBonuses[player].bonuses.length} bonus pack(s)`);
        }
    }

    // Verificar si ya existe snapshot para hoy
    const existingIndex = snapshots.snapshots.findIndex(s => s.date === currentDate);
    if (existingIndex !== -1) {
        console.log('\n⚠️  Snapshot for today already exists. Replacing...\n');
        snapshots.snapshots[existingIndex] = newSnapshot;
    } else {
        snapshots.snapshots.push(newSnapshot);
    }

    // Ordenar por fecha
    snapshots.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Guardar
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshots, null, 2), 'utf-8');

    console.log(`\n✅ Snapshot saved with ${Object.keys(newSnapshot.players).length} players`);
    console.log(`📊 Total snapshots: ${snapshots.snapshots.length}`);
    
    if (snapshots.snapshots.length > 1) {
        console.log(`📅 Date range: ${snapshots.snapshots[0]?.date} to ${snapshots.snapshots[snapshots.snapshots.length - 1]?.date}`);
    }
    
    console.log('\n🎉 Done!\n');
}

updatePlayerGraphs().catch(console.error);