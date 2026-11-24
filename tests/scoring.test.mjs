import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLeaderboard, score } from '../js/scoring.mjs';

test('smooth rank curve stays within tolerance of its reference anchors', () => {
    const anchors = [
        [1, 250],
        [10, 175.4],
        [25, 114.8],
        [40, 80.3],
        [60, 55.4],
        [75, 44.7],
        [90, 30.6],
        [100, 24.8],
        [120, 10],
    ];

    assert.equal(score(1, 100, 0, 120), 250);
    assert.equal(score(120, 100, 0, 120), 10);
    assert.equal(score(1, 100, 0, 1), 250);
    assert.equal(score(150, 100, 0, 150), 10);
    assert.ok(score(120, 100, 0, 150) > 10);

    for (const [rank, target] of anchors) {
        const actual = score(rank, 100, 0, 120);
        assert.ok(Math.abs(actual - target) <= target * 0.1);
        assert.equal(actual, target);
    }

    let previousPoints = score(1, 100, 0, 120);
    for (let rank = 2; rank <= 120; rank++) {
        const points = score(rank, 100, 0, 120);
        assert.ok(points < previousPoints, `points should decrease at rank #${rank}`);
        previousPoints = points;
    }
});

test('progress starts at 10% at qualification and grows exponentially to completion', () => {
    assert.equal(score(1, 41, 42, 120), 0);
    assert.equal(score(1, 42, 42, 120), 25);
    assert.equal(score(1, 71, 42, 120), 79.057);
    assert.equal(score(1, 0, 0, 120), 25);
    assert.equal(score(1, 100, 100, 120), 250);
});

test('a player receives at most one event per level, keeping their best result', () => {
    const [player] = calculateLeaderboard([{
        name: 'Example',
        rank: 1,
        percentToQualify: '40',
        verifier: 'Alice',
        verification: 'verification-link',
        records: [
            { user: 'alice', percent: 100, link: 'record-link' },
            { user: 'Bob', percent: 50 },
            { user: 'bob', percent: 80 },
        ],
    }]);

    assert.equal(player.user, 'Alice');
    assert.equal(player.total, 250);
    assert.equal(player.verified.length, 1);
    assert.equal(player.completed.length, 0);
    assert.equal(player.progressed.length, 0);

    const bob = calculateLeaderboard([{
        name: 'Example',
        rank: 1,
        percentToQualify: '40',
        records: [
            { user: 'Bob', percent: 50 },
            { user: 'bob', percent: 80 },
        ],
    }])[0];

    assert.equal(bob.progressed.length, 1);
    assert.equal(bob.progressed[0].percent, 80);
    assert.equal(bob.total, 116.04);
});
