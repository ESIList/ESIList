const scale = 3;
const firstPlacePoints = 250;
const lastPlacePoints = 10;
const referenceLevelCount = 120;
const pointAnchors = [
    [1, firstPlacePoints],
    [10, 175.4],
    [25, 114.8],
    [40, 80.3],
    [60, 55.4],
    [75, 44.7],
    [90, 30.6],
    [100, 24.8],
    [referenceLevelCount, lastPlacePoints],
].map(([rank, points]) => ({
    rank: (rank - 1) / (referenceLevelCount - 1),
    logPoints: Math.log(points),
}));

function endpointSlope(firstWidth, secondWidth, firstSlope, secondSlope) {
    const slope = ((2 * firstWidth + secondWidth) * firstSlope - firstWidth * secondSlope) /
        (firstWidth + secondWidth);
    if (Math.sign(slope) !== Math.sign(firstSlope)) return 0;
    if (Math.sign(firstSlope) !== Math.sign(secondSlope) && Math.abs(slope) > 3 * Math.abs(firstSlope)) {
        return 3 * firstSlope;
    }
    return slope;
}

function getPointAnchorSlopes() {
    const widths = pointAnchors.slice(0, -1).map((anchor, index) =>
        pointAnchors[index + 1].rank - anchor.rank
    );
    const secants = pointAnchors.slice(0, -1).map((anchor, index) =>
        (pointAnchors[index + 1].logPoints - anchor.logPoints) / widths[index]
    );
    const slopes = new Array(pointAnchors.length);

    slopes[0] = endpointSlope(widths[0], widths[1], secants[0], secants[1]);
    for (let index = 1; index < pointAnchors.length - 1; index++) {
        const previousSlope = secants[index - 1];
        const nextSlope = secants[index];
        if (previousSlope * nextSlope >= 0) {
            const previousWidth = widths[index - 1];
            const nextWidth = widths[index];
            const firstWeight = 2 * nextWidth + previousWidth;
            const secondWeight = nextWidth + 2 * previousWidth;
            slopes[index] = (firstWeight + secondWeight) /
                (firstWeight / previousSlope + secondWeight / nextSlope);
        } else {
            slopes[index] = 0;
        }
    }

    const lastInterval = widths.length - 1;
    slopes[slopes.length - 1] = endpointSlope(
        widths[lastInterval],
        widths[lastInterval - 1],
        secants[lastInterval],
        secants[lastInterval - 1],
    );
    return slopes;
}

const pointAnchorSlopes = getPointAnchorSlopes();

function getBasePoints(normalizedRank) {
    let interval = 0;
    while (
        interval < pointAnchors.length - 2 &&
        normalizedRank > pointAnchors[interval + 1].rank
    ) {
        interval++;
    }

    const left = pointAnchors[interval];
    const right = pointAnchors[interval + 1];
    const width = right.rank - left.rank;
    const progress = (normalizedRank - left.rank) / width;
    const progressSquared = progress * progress;
    const progressCubed = progressSquared * progress;
    const leftWeight = 2 * progressCubed - 3 * progressSquared + 1;
    const leftSlopeWeight = progressCubed - 2 * progressSquared + progress;
    const rightWeight = -2 * progressCubed + 3 * progressSquared;
    const rightSlopeWeight = progressCubed - progressSquared;
    const logPoints =
        leftWeight * left.logPoints +
        leftSlopeWeight * width * pointAnchorSlopes[interval] +
        rightWeight * right.logPoints +
        rightSlopeWeight * width * pointAnchorSlopes[interval + 1];

    return Math.exp(logPoints);
}

export function score(rank, percent, minPercent, totalLevels) {
    const position = Number(rank);
    const completion = Number(percent);
    const threshold = Number(minPercent);
    const levelCount = Number(totalLevels);

    if (!Number.isInteger(position) || position < 1) {
        throw new RangeError(`Invalid level rank: ${rank}`);
    }
    if (!Number.isInteger(levelCount) || levelCount < 1 || position > levelCount) {
        throw new RangeError(`Invalid total level count: ${totalLevels}`);
    }
    if (!Number.isFinite(completion) || completion < 0 || completion > 100) {
        throw new RangeError(`Invalid completion percentage: ${percent}`);
    }
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        throw new RangeError(`Invalid qualification percentage: ${minPercent}`);
    }

    const normalizedRank = levelCount === 1 ? 0 : (position - 1) / (levelCount - 1);
    const basePoints = getBasePoints(normalizedRank);
    if (completion === 100) return round(basePoints);
    if (completion < threshold || threshold === 100) return 0;

    const progress = (completion - threshold) / (100 - threshold);
    const progressFactor = Math.pow(10, progress - 1);
    return round(basePoints * progressFactor);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    }
    const [coefficient, exponent] = ('' + num).split('e');
    const scaledExponent = Number(exponent) + scale;
    const sign = scaledExponent > 0 ? '+' : '';
    return +(
        Math.round(Number(coefficient) + 'e' + sign + scaledExponent) +
        'e-' +
        scale
    );
}

export function calculateLeaderboard(levels, totalLevels = levels.length) {
    const players = new Map();
    const eventPriority = { progressed: 0, completed: 1, verified: 2 };

    const addLevelEvent = (username, event) => {
        const user = String(username || '').trim();
        if (!user) return;

        const userKey = user.toLowerCase();
        if (!players.has(userKey)) {
            players.set(userKey, { user, levels: new Map() });
        }

        const player = players.get(userKey);
        const levelKey = String(event.level).toLowerCase();
        const previous = player.levels.get(levelKey);
        if (previous && (
            previous.percent > event.percent ||
            (previous.percent === event.percent &&
                eventPriority[previous.type] >= eventPriority[event.type])
        )) return;

        player.levels.set(levelKey, event);
    };

    levels.forEach((level) => {
        if (!level) return;
        const rank = Number(level.rank);
        const threshold = Number(level.percentToQualify);
        if (level.verifier) {
            addLevelEvent(level.verifier, {
                rank,
                level: level.name,
                score: score(rank, 100, threshold, totalLevels),
                percent: 100,
                type: 'verified',
                link: level.verification,
                date: level.verificationDate,
            });
        }

        (Array.isArray(level.records) ? level.records : []).forEach((record) => {
            const percent = Number(record.percent);
            const type = percent === 100 ? 'completed' : 'progressed';
            addLevelEvent(record.user, {
                rank,
                level: level.name,
                score: score(rank, percent, threshold, totalLevels),
                percent,
                type,
                link: record.link,
                date: record.date,
            });
        });
    });

    return [...players.values()].map(({ user, levels: playerLevels }) => {
        const events = [...playerLevels.values()].sort((a, b) => a.rank - b.rank);
        const verified = events.filter((event) => event.type === 'verified');
        const completed = events.filter((event) => event.type === 'completed');
        const progressed = events.filter((event) => event.type === 'progressed');

        return {
            user,
            total: round(events.reduce((total, event) => total + event.score, 0)),
            verified,
            completed,
            progressed,
        };
    }).sort((a, b) => b.total - a.total);
}
