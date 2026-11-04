import { score } from "../score.js";
import { fetchList } from "../content.js";
import { resolveFilter } from "../components/List/Filters.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="page-comparator">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-comparator">
            <section class="comparator-content">
                <div class="comparator-heading">
                    <h1>Level comparison</h1>
                    <p>Compare rankings, requirements, records, and gameplay filters side by side.</p>
                </div>

                <p v-if="loadError" class="comparator-message" role="alert">
                    The level list could not be loaded. Please try again later.
                </p>
                <template v-else>
                    <div class="compare-selectors">
                        <label>
                            First level
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
                            Second level
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
                                    <th scope="col">Statistic</th>
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
                                    <th scope="row">ID</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.id ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Creator</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.author || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Verifier</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.verifier || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Points</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.points }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Qualification</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.qualification }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">AREDL placement</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.level.aredl || '—' }}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Records</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">
                                        {{ item.recordCount }} (best: {{ item.bestRecord }})
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row">Gameplay filters</th>
                                    <td v-for="item in comparisonLevels" :key="item.index">{{ item.filters }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p v-else class="comparator-message">At least two levels are needed for comparison.</p>
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
    }),
    computed: {
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
                            ? `${level.percentToQualify ?? 'N/A'}% or better`
                            : rank <= 150
                                ? '100%'
                                : 'Does not accept new records',
                        recordCount: records.length,
                        bestRecord: records[0] ? `${records[0].percent}%` : '—',
                        filters: filters.length
                            ? filters.map((filter) => resolveFilter(filter).name).join(', ')
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
        } catch (error) {
            console.error("Failed to load levels for comparison.", error);
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
};
