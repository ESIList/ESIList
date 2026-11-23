import { score } from "../score.js";
import { applyTagBonuses, fetchLeaderboard, fetchList } from "../content.js";
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
                                <tr>
                                    <th scope="row">{{ $t('ID') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.id ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Creator') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.author || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Verifier') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.verifier || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Points') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.points }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Qualification') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.qualification }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('AREDL placement') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.aredl || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Records') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">
                                        {{ item.recordCount }} ({{ $t('Best') }}: {{ item.bestRecord }})
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">{{ $t('Gameplay filters') }}</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.filters }}</td>
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
                                    <tr>
                                        <th scope="row">{{ $t('Total points') }}</th>
                                        <td v-for="item in comparisonProfiles" :key="item.index">{{ localize(item.profile.total) }}</td>
                                    </tr>
                                    <tr>
                                        <th scope="row">{{ $t('Verified levels') }}</th>
                                        <td v-for="item in comparisonProfiles" :key="item.index">{{ item.profile.verified.length }}</td>
                                    </tr>
                                    <tr>
                                        <th scope="row">{{ $t('Completed levels') }}</th>
                                        <td v-for="item in comparisonProfiles" :key="item.index">{{ item.profile.completed.length }}</td>
                                    </tr>
                                    <tr>
                                        <th scope="row">{{ $t('Progress entries') }}</th>
                                        <td v-for="item in comparisonProfiles" :key="item.index">{{ item.profile.progressed.length }}</td>
                                    </tr>
                                    <tr>
                                        <th scope="row">{{ $t('Tag bonus points') }}</th>
                                        <td v-for="item in comparisonProfiles" :key="item.index">{{ localize(item.tagBonusPoints) }}</td>
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
        compareLeftProfileIndex: 0,
        compareRightProfileIndex: 1,
    }),
    computed: {
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

                    const tagBonusPoints = (profile.tagBonuses || [])
                        .reduce((sum, bonus) => sum + bonus.bonus, 0);
                    return { index, rank: index + 1, profile, tagBonusPoints };
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
                        points: score(rank, 100, Number(level.percentToQualify) || 0),
                        qualification: rank <= 75
                            ? this.$t('{percent}% or better', { percent: level.percentToQualify ?? this.$t('N/A') })
                            : rank <= 150
                                ? this.$t('100% or better')
                                : this.$t('Does not accept new records'),
                        recordCount: records.length,
                        bestRecord: records[0] ? `${records[0].percent}%` : '—',
                        filters: filters.length
                            ? filters.map((filter) => this.$t(resolveFilter(filter).name)).join(', ')
                            : '—',
                    };
                })
                .filter(Boolean);
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
            this.profiles = applyTagBonuses(profiles, allLevels);
            this.compareRightProfileIndex = this.profiles.length > 1 ? 1 : 0;
        } catch (error) {
            console.error("Failed to load comparison data.", error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
