import { score } from "../score.js";
import { fetchLeaderboard, fetchList } from "../content.js";
import { resolveFilter } from "../components/List/Filters.js";
import Spinner from "../components/Spinner.js";
import { localize } from "../util.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="page-comparator">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-comparator">
            <section class="comparator-content">
                <div class="comparator-heading">
                    <h1>{{ $t(comparisonMode === 'levels' ? 'Level comparison' : 'Profile comparison') }}</h1>
                    <p>{{ $t('Compare levels or player profiles side by side.') }}</p>
                </div>

                <p v-if="loadError" class="comparator-message" role="alert">
                    {{ $t('Comparison data could not be loaded. Please try again later.') }}
                </p>
                <template v-else>
                    <div class="compare-mode" role="group" :aria-label="$t('Comparison type')">
                        <button type="button" :class="{ active: comparisonMode === 'levels' }" :aria-pressed="comparisonMode === 'levels'" @click="comparisonMode = 'levels'">
                            {{ $t('Levels') }}
                        </button>
                        <button type="button" :class="{ active: comparisonMode === 'profiles' }" :aria-pressed="comparisonMode === 'profiles'" @click="comparisonMode = 'profiles'">
                            {{ $t('Profiles') }}
                        </button>
                    </div>

                    <template v-if="comparisonMode === 'levels'">
                    <div class="compare-selectors">
                        <label>
                            {{ $t('First level') }}
                            <select v-model.number="compareLeftIndex">
                                <option
                                    v-for="option in comparisonOptions"
                                    :key="option.index"
                                    :value="option.index"
                                    :disabled="option.index === compareRightIndex"
                                >
                                    #{{ option.rank }} – {{ option.name }}
                                </option>
                            </select>
                        </label>
                        <label>
                            {{ $t('Second level') }}
                            <select v-model.number="compareRightIndex">
                                <option
                                    v-for="option in comparisonOptions"
                                    :key="option.index"
                                    :value="option.index"
                                    :disabled="option.index === compareLeftIndex"
                                >
                                    #{{ option.rank }} – {{ option.name }}
                                </option>
                            </select>
                        </label>
                    </div>

                    <div v-if="comparisonLevels.length === 2" class="compare-table-wrapper">
                        <table class="compare-table">
                            <thead>
                                <tr>
                                    <th scope="col">{{ $t('Statistic') }}</th>
                                    <th scope="col">
                                        <span class="compare-level-rank">#{{ comparisonLevels[0].rank }}</span>
                                        {{ comparisonLevels[0].level.name }}
                                    </th>
                                    <th scope="col">
                                        <span class="compare-level-rank">#{{ comparisonLevels[1].rank }}</span>
                                        {{ comparisonLevels[1].level.name }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in levelComparisonRows" :key="row.label">
                                    <th scope="row">{{ $t(row.label) }}</th>
                                    <td
                                        v-for="(item, side) in comparisonLevels"
                                        :key="item.index"
                                        :class="row.direction ? comparisonCellClass(comparisonLevels, side, row.compareKey, row.direction) : ''"
                                    >
                                        <span class="compare-cell-content">
                                            <span class="compare-value">{{ item[row.key] }}</span>
                                            <small
                                                v-if="row.direction && comparisonStatus(comparisonLevels, side, row.compareKey, row.direction)"
                                                class="compare-outcome"
                                                :class="comparisonOutcomeClass(comparisonLevels, side, row.compareKey, row.direction)"
                                            >
                                                {{ $t(comparisonStatus(comparisonLevels, side, row.compareKey, row.direction)) }}
                                            </small>
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p v-else class="comparator-message">{{ $t('At least two levels are needed for comparison.') }}</p>
                    </template>

                    <template v-else>
                        <div class="compare-selectors">
                            <label>
                                {{ $t('First profile') }}
                                <select v-model.number="compareLeftProfileIndex">
                                    <option
                                        v-for="option in profileOptions"
                                        :key="option.index"
                                        :value="option.index"
                                        :disabled="option.index === compareRightProfileIndex"
                                    >
                                        #{{ option.rank }} – {{ option.user }}
                                    </option>
                                </select>
                            </label>
                            <label>
                                {{ $t('Second profile') }}
                                <select v-model.number="compareRightProfileIndex">
                                    <option
                                        v-for="option in profileOptions"
                                        :key="option.index"
                                        :value="option.index"
                                        :disabled="option.index === compareLeftProfileIndex"
                                    >
                                        #{{ option.rank }} – {{ option.user }}
                                    </option>
                                </select>
                            </label>
                        </div>

                        <div v-if="comparisonProfiles.length === 2" class="compare-table-wrapper">
                            <table class="compare-table">
                                <thead>
                                    <tr>
                                        <th scope="col">{{ $t('Statistic') }}</th>
                                        <th v-for="item in comparisonProfiles" :key="item.index" scope="col">
                                            <span class="compare-level-rank">#{{ item.rank }} {{ $t('Rank') }}</span>
                                            {{ item.profile.user }}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in profileComparisonRows" :key="row.label">
                                        <th scope="row">{{ $t(row.label) }}</th>
                                        <td
                                            v-for="(item, side) in comparisonProfiles"
                                            :key="item.index"
                                            :class="row.direction ? comparisonCellClass(comparisonProfiles, side, row.compareKey, row.direction) : ''"
                                        >
                                            <span class="compare-cell-content">
                                                <span class="compare-value">{{ item[row.key] }}</span>
                                                <small
                                                    v-if="row.direction && comparisonStatus(comparisonProfiles, side, row.compareKey, row.direction)"
                                                    class="compare-outcome"
                                                    :class="comparisonOutcomeClass(comparisonProfiles, side, row.compareKey, row.direction)"
                                                >
                                                    {{ $t(comparisonStatus(comparisonProfiles, side, row.compareKey, row.direction)) }}
                                                </small>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p v-else class="comparator-message">{{ $t('At least two profiles are needed for comparison.') }}</p>
                    </template>
                </template>
            </section>
        </main>
    `,
    data: () => ({
        list: [],
        loading: true,
        loadError: false,
        compareLeftIndex: 0,
        compareRightIndex: 1,
        comparisonMode: 'levels',
        profiles: [],
        allLevels: [],
        compareLeftProfileIndex: 0,
        compareRightProfileIndex: 1,
    }),
    computed: {
        levelComparisonRows() {
            return [
                { label: 'List position', key: 'position', compareKey: 'rank', direction: 'lower' },
                { label: 'ID', key: 'id' },
                { label: 'Creator', key: 'creator' },
                { label: 'Verifier', key: 'verifier' },
                { label: 'Points', key: 'points', compareKey: 'points', direction: 'higher' },
                { label: 'Qualification', key: 'qualification', compareKey: 'qualificationPercent', direction: 'lower' },
                { label: 'AREDL placement', key: 'aredl', compareKey: 'aredlRank', direction: 'lower' },
                { label: 'Records', key: 'recordCount', compareKey: 'recordCount', direction: 'higher' },
                { label: 'Best record', key: 'bestRecord', compareKey: 'bestRecordPercent', direction: 'higher' },
                { label: 'Gameplay filters', key: 'filters' },
            ];
        },
        profileComparisonRows() {
            return [
                { label: 'Leaderboard rank', key: 'rank', compareKey: 'rank', direction: 'lower' },
                { label: 'Total points', key: 'totalPoints', compareKey: 'totalPoints', direction: 'higher' },
                { label: 'Verified levels', key: 'verifiedCount', compareKey: 'verifiedCount', direction: 'higher' },
                { label: 'Completed levels', key: 'completedCount', compareKey: 'completedCount', direction: 'higher' },
                { label: 'Progress entries', key: 'progressCount', compareKey: 'progressCount', direction: 'higher' },
                { label: 'Hardest', key: 'hardestCompletedLevel', compareKey: 'hardestCompletedRank', direction: 'lower' },
                { label: 'Mastered skills', key: 'masteredSkillsDisplay', compareKey: 'masteredSkillCount', direction: 'higher' },
            ];
        },
        profileOptions() {
            return this.profiles.map((profile, index) => ({
                index,
                rank: index + 1,
                user: profile.user,
            }));
        },
        comparisonProfiles() {
            return [...new Set([this.compareLeftProfileIndex, this.compareRightProfileIndex])]
                .map((index) => {
                    const profile = this.profiles[index];
                    if (!profile) return null;

                    const completedLevels = new Set([
                        ...profile.completed.map((level) => level.level),
                        ...profile.verified.map((level) => level.level),
                    ]);
                    const hardestCompleted = [...profile.completed, ...profile.verified]
                        .reduce((hardest, level) =>
                            !hardest || level.rank < hardest.rank ? level : hardest,
                            null
                        );
                    const filterProgress = new Map();

                    this.allLevels.forEach((level) => {
                        const levelFilters = new Set(
                            (Array.isArray(level.filters) ? level.filters : [])
                                .map((filter) => resolveFilter(filter))
                                .map((filter) => filter.id)
                        );
                        levelFilters.forEach((filterId) => {
                            const filter = resolveFilter(filterId);
                            if (!filterProgress.has(filterId)) {
                                filterProgress.set(filterId, {
                                    name: filter.name,
                                    total: 0,
                                    completed: 0,
                                });
                            }
                            const progress = filterProgress.get(filterId);
                            progress.total++;
                            if (completedLevels.has(level.level)) progress.completed++;
                        });
                    });

                    const masteredSkills = [...filterProgress.values()]
                        .filter((filter) => filter.completed > filter.total / 2)
                        .map((filter) => `${this.$t(filter.name)} (${filter.completed}/${filter.total})`);

                    return {
                        index,
                        rank: index + 1,
                        profile,
                        totalPoints: profile.total,
                        verifiedCount: profile.verified.length,
                        completedCount: profile.completed.length,
                        progressCount: profile.progressed.length,
                        hardestCompletedLevel: hardestCompleted
                            ? `#${hardestCompleted.rank} ${hardestCompleted.level}`
                            : '—',
                        hardestCompletedRank: hardestCompleted ? hardestCompleted.rank : null,
                        masteredSkillCount: masteredSkills.length,
                        masteredSkillsDisplay: masteredSkills.length
                            ? `${masteredSkills.length}: ${masteredSkills.join(', ')}`
                            : '—',
                        masteredSkills,
                    };
                })
                .filter(Boolean);
        },
        comparisonOptions() {
            return this.list
                .map(([level], index) => level ? {
                    index,
                    rank: index + 1,
                    name: level.name,
                } : null)
                .filter(Boolean);
        },
        comparisonLevels() {
            return [this.compareLeftIndex, this.compareRightIndex]
                .map((index) => {
                    const level = this.list[index]?.[0];
                    if (!level) return null;

                    const records = Array.isArray(level.records) ? level.records : [];
                    const filters = Array.isArray(level.filters) ? level.filters : [];
                    const rank = index + 1;

                    return {
                        index,
                        rank,
                        level,
                        position: `#${rank}`,
                        id: level.id ?? '—',
                        creator: level.author || '—',
                        verifier: level.verifier || '—',
                        points: score(rank, 100, Number(level.percentToQualify) || 0, this.list.length),
                        qualification: rank <= 75
                            ? this.$t('{percent}% or better', { percent: level.percentToQualify ?? this.$t('N/A') })
                            : rank <= 150
                                ? this.$t('100% or better')
                                : this.$t('Does not accept new records'),
                        qualificationPercent: rank <= 75
                            ? Number(level.percentToQualify)
                            : rank <= 150 ? 100 : null,
                        aredl: level.aredl || '—',
                        aredlRank: Number.parseInt(String(level.aredl || '').replace(/\D/g, ''), 10),
                        recordCount: records.length,
                        bestRecord: records[0] ? `${records[0].percent}%` : '—',
                        bestRecordPercent: records[0] ? Number.parseFloat(String(records[0].percent)) : null,
                        filters: filters.length
                            ? filters.map((filter) => this.$t(resolveFilter(filter).name)).join(', ')
                            : '—',
                    };
                })
                .filter(Boolean);
        },
    },
    methods: {
        localize,
        comparisonStatus(items, side, key, direction) {
            if (items.length !== 2) return '';

            const values = items.map((item) => item[key]);
            if (values.some((value) => value === null || value === undefined || value === '—')) return '';

            const [left, right] = values.map(Number);
            if (!Number.isFinite(left) || !Number.isFinite(right)) return '';
            if (left === right) return 'Tie';

            const leftWins = direction === 'lower' ? left < right : left > right;
            const winner = leftWins ? 0 : 1;
            return side === winner ? 'Wins' : 'Loses';
        },
        comparisonCellClass(items, side, key, direction) {
            const status = this.comparisonStatus(items, side, key, direction);
            return status === 'Wins'
                ? 'compare-cell-winner'
                : status === 'Loses'
                    ? 'compare-cell-loser'
                    : status === 'Tie' ? 'compare-cell-tie' : '';
        },
        comparisonOutcomeClass(items, side, key, direction) {
            const status = this.comparisonStatus(items, side, key, direction);
            return status === 'Wins'
                ? 'compare-outcome-winner'
                : status === 'Loses'
                    ? 'compare-outcome-loser'
                    : status === 'Tie' ? 'compare-outcome-tie' : '';
        },
    },
    async mounted() {
        try {
            const list = await fetchList();
            if (!list) {
                this.loadError = true;
                return;
            }

            this.list = list;
            const validIndexes = list
                .map(([level], index) => level ? index : -1)
                .filter((index) => index >= 0);
            this.compareLeftIndex = validIndexes[0] ?? 0;
            this.compareRightIndex = validIndexes[1] ?? this.compareLeftIndex;

            const [profiles, , allLevels] = await fetchLeaderboard(list);
            this.profiles = profiles;
            this.allLevels = allLevels;
            this.compareRightProfileIndex = this.profiles.length > 1 ? 1 : 0;
        } catch (error) {
            console.error("Failed to load comparison data.", error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
