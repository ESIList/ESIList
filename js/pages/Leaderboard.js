import { fetchLeaderboard, fetchPlayerHistory } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';
import tags from "../components/List/Tags.js";
import filterRegistry, { resolveFilter } from "../components/List/Filters.js";
import { score } from '../score.js';
import { store } from '../main.js';


let chart = null;
let globalChart = null;

export default {
    components: { Spinner },
    data: () => ({
        store,
        leaderboard: [],
        loading: true,
        selected: 0,
        showingGlobalGraph: true,
        err: [],
        allLevels: [],
        playerColors: {
            'Lolencio04': '#ff0000',
            'Ninjedu': '#580072',
            'itzniw': '#ffaa00',
            'ExoRK28': '#00ff51',
            'cauri': '#8ba9ef',
            'Raullm5555': '#eaff00'
        }
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard" :class="{ 'player-selected': !showingGlobalGraph }">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        {{ $t('Leaderboard may be incorrect, as the following levels could not be loaded: {levels}', { levels: err.join(', ') }) }}
                    </p>
                </div>

                <div class="board-container">
                    <table class="board">
                        <!-- Global Graph Button (styled like a player row) -->
                        <tr v-if="hasHistoryData">
                            <td class="rank"><p class="type-label-lg">📊</p></td>
                            <td class="total"><p class="type-label-lg">{{ $t('GRAPH') }}</p></td>
                            <td class="user" :class="{ 'active': showingGlobalGraph }">
                                <button @click="showGlobalGraph">
                                    <span class="type-label-lg">🌐 {{ $t('All Players Comparison') }}</span>
                                </button>
                            </td>
                        </tr>
                        
                        <tr v-if="hasHistoryData" class="board-separator">
                            <td colspan="3"><hr></td>
                        </tr>

                        <!-- Player Rows -->
                        <tr v-for="(ientry, i) in leaderboard" :key="ientry.user">
                            <td class="rank"><p class="type-label-lg">#{{ i + 1 }}</p></td>
                            <td class="total"><p class="type-label-lg">{{ localize(ientry.total) }}</p></td>
                            <td class="user" :class="{ 'active': selected == i && !showingGlobalGraph }">
                                <button @click="selectPlayer(i)">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>

                <!-- Right side: Either player stats OR global graph -->
                <div class="player-container">
                    <!-- Global Graph View -->
                    <div class="player" v-if="showingGlobalGraph">
                        <h1>🌐 {{ $t('All Players Comparison') }}</h1>
                        <div class="global-graph-container">
                            <canvas id="globalPointsChart"></canvas>
                        </div>
                    </div>

                    <!-- Individual Player View -->
                    <div class="player" v-else>
                        <button class="mobile-board-button" type="button" @click="showGlobalGraph">
                            ← {{ $t('All players') }}
                        </button>
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ entry.total }}</h3>

                        <div class="graph-container" v-if="entry.total > 0 && pointsOverTime.length > 0">
                            <canvas id="pointsChart"></canvas>
                        </div>

                        <!-- NEW: filter progress -->
                        <div class="filter-progress" v-if="filterProgress.length">
                            <h2>{{ $t('Filter progress') }}</h2>
                            <div class="filter-progress-grid">
                                <div
                                    v-for="f in filterProgress"
                                    :key="f.id"
                                    class="filter-progress-item"
                                    :class="{ complete: f.completed === f.total, empty: f.completed === 0 }"
                                >
                                    <span class="filter-progress-name">{{ $t(f.name) }}</span>
                                    <span class="filter-progress-count">{{ f.completed }}/{{ f.total }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Rest of player stats tables... -->
                        <h2 v-if="entry.verified.length > 0">{{ $t('Verified ({count})', { count: entry.verified.length }) }}</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                    <p v-if="getSubtitle(score.level)" class="level-subtitle">
                                        – “{{ getSubtitle(score.level) }}”
                                    </p>
                                </td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.completed.length > 0">{{ $t('Completed ({count})', { count: entry.completed.length }) }}</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                    <p v-if="getPhrase(score.level)" class="level-phrase">
                                        – “{{ getPhrase(score.level) }}”
                                    </p>
                                </td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.tagBonuses && entry.tagBonuses.length > 0">{{ $t('Bonus Pack points ({count})', { count: entry.tagBonuses.length }) }}</h2>
                        <table class="table bonus-table" v-if="entry.tagBonuses && entry.tagBonuses.length > 0">
                            <tr v-for="bonus in entry.tagBonuses" :key="bonus.name">
                                <td class="level"><p>{{ $t(bonus.name) }}</p></td>
                                <td class="score"><p>+{{ localize(bonus.bonus) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.progressed.length > 0">{{ $t('Progressed ({count})', { count: entry.progressed.length }) }}</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                    <p v-if="getPhrase(score.level)" class="level-phrase">
                                        – “{{ getPhrase(score.level) }}”
                                    </p>
                                </td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="noProgress.length > 0">{{ $t('No Progress ({count})', { count: noProgress.length }) }}</h2>
                        <table class="table" v-if="noProgress.length > 0">
                            <tr v-for="score in noProgress">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },

        pointsOverTime() {
            if (!this.entry) return [];

            if (this.entry.history && this.entry.history.length > 0) {
                return this.entry.history;
            }

            const events = [
                ...this.entry.verified,
                ...this.entry.completed,
            ]
            .filter(e => e.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

            const groupedByDate = {};
            let cumulativeTotal = 0;

            events.forEach(e => {
                cumulativeTotal += e.score;
                groupedByDate[e.date] = cumulativeTotal;
            });

            const dates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));
            if (dates.length > 0 && this.entry.tagBonuses && this.entry.tagBonuses.length > 0) {
                const lastDate = dates[dates.length - 1];
                const bonusTotal = this.entry.tagBonuses.reduce((sum, b) => sum + b.bonus, 0);
                groupedByDate[lastDate] += bonusTotal;
            }

            return Object.entries(groupedByDate).map(([date, total]) => ({
                date,
                total
            }));
        },

        hasHistoryData() {
            return this.leaderboard.some(player => 
                player.history && player.history.length > 0
            );
        },

        noProgress() {
            if (!this.entry || !this.allLevels) return [];
            const attempted = new Set([
                ...this.entry.verified.map(l => l.level),
                ...this.entry.completed.map(l => l.level),
                ...this.entry.progressed.map(l => l.level),
            ]);
            return this.allLevels.filter(l => !attempted.has(l.level));
        }
        filterProgress() {
            if (!this.entry || !Array.isArray(this.allLevels)) return [];

            // levels the player has completed (verified counts too, same as the bonus packs)
            const done = new Set([
                ...this.entry.verified.map((l) => l.level),
                ...this.entry.completed.map((l) => l.level),
            ]);

            const stats = new Map();
            for (const lvl of this.allLevels) {
                if (!lvl || !Array.isArray(lvl.filters)) continue;
                const seen = new Set();
                for (const raw of lvl.filters) {
                    const f = resolveFilter(raw);
                    if (seen.has(f.id)) continue; // don't count a duplicate filter twice on one level
                    seen.add(f.id);
                    if (!stats.has(f.id)) {
                        stats.set(f.id, { id: f.id, name: f.name, completed: 0, total: 0 });
                    }
                    const s = stats.get(f.id);
                    s.total++;
                    if (done.has(lvl.level)) s.completed++;
                }
            }

            // registry order first, then any unregistered filter A-Z (same as list.js)
            const registeredIds = new Set(filterRegistry.map((f) => f.id));
            const ordered = filterRegistry.map((f) => stats.get(f.id)).filter(Boolean);
            const extras = [...stats.values()]
                .filter((s) => !registeredIds.has(s.id))
                .sort((a, b) => a.id.localeCompare(b.id));

            return [...ordered, ...extras];
        },
    },

    watch: {
        showingGlobalGraph(newVal) {
            if (newVal) {
                this.$nextTick(this.renderGlobalChart);
            } else {
                this.$nextTick(this.renderChart);
            }
        },

        selected() {
            if (!this.showingGlobalGraph) {
                this.$nextTick(this.renderChart);
            }
        },

        'store.language'() {
            this.$nextTick(() => {
                if (this.showingGlobalGraph) {
                    this.renderGlobalChart();
                } else {
                    this.renderChart();
                }
            });
        }
    },

    async mounted() {
        const [leaderboard, err, allLevels] = await fetchLeaderboard();
        
        for (const entry of leaderboard) {
            entry.history = await fetchPlayerHistory(entry.user);
        }
        
        this.leaderboard = leaderboard;
        this.err = err;
        this.allLevels = allLevels;
        this.applyTagBonuses();

        const playerFromQuery = this.$route.query.player;
        if (playerFromQuery) {
            const index = this.leaderboard.findIndex(
                entry => entry.user.toLowerCase() === playerFromQuery.toLowerCase()
            );
            if (index !== -1) {
                this.selected = index;
                this.showingGlobalGraph = false;
            }
        }

        this.loading = false;
        console.log('allLevels sample:', this.allLevels[0]);
        console.log('entry sample:', this.leaderboard[0]);
        console.log('allLevels sample:', JSON.parse(JSON.stringify(this.allLevels[0])));
        console.log('entry sample:', JSON.parse(JSON.stringify(this.leaderboard[0])));

        this.$nextTick(() => {
            if (this.showingGlobalGraph) {
                this.renderGlobalChart();
            } else {
                this.renderChart();
            }
        });
    },

    methods: {
        localize,

        getPlayerColor(playerName) {
            return this.playerColors[playerName] || '#999999';
        },

        selectPlayer(index) {
            this.selected = index;
            this.showingGlobalGraph = false;
            if (window.matchMedia("(max-width: 900px), (pointer: coarse)").matches) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },

        showGlobalGraph() {
            this.showingGlobalGraph = true;
        },

        cleanText(value) {
            if (typeof value !== 'string') return null;
            const text = value.trim();
            if (text === '' || text === '-') return null;
            return text;
        },

        getLevelData(levelName) {
            if (!levelName || !Array.isArray(this.allLevels)) return null;
            const name = String(levelName).toLowerCase();
            return this.allLevels.find(
                l => l && l.level && String(l.level).toLowerCase() === name
            ) || null;
        },

        getSubtitle(levelName) {
            const lvl = this.getLevelData(levelName);
            return this.cleanText(lvl?.subtitle);
        },

        getPhrase(levelName) {
            const lvl = this.getLevelData(levelName);
            if (!lvl || !Array.isArray(lvl.records) || !this.entry) return null;
            const user = String(this.entry.user).toLowerCase();
            const rec = lvl.records.find(
                r => r && r.user && String(r.user).toLowerCase() === user
            );
            return this.cleanText(rec?.phrase);
        },

        renderChart() {
            const canvas = document.getElementById('pointsChart');
            if (!canvas) return;
            
            if (!this.entry || this.entry.total === 0 || this.pointsOverTime.length === 0) {
                if (chart) {
                    chart.destroy();
                    chart = null;
                }
                return;
            }

            if (chart) chart.destroy();

            const chartData = this.pointsOverTime.map(p => ({
                x: new Date(p.date),
                y: p.total
            }));

            const playerColor = this.getPlayerColor(this.entry.user);

            chart = new Chart(canvas, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            data: chartData,
                            borderColor: playerColor,
                            backgroundColor: playerColor + '20',
                            borderWidth: 2,
                            pointRadius: 3,
                            tension: 0.25
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const date = new Date(context[0].parsed.x);
                                    return date.toLocaleDateString(document.documentElement.lang || 'en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'month',
                                displayFormats: {
                                    month: 'MMM yyyy'
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return new Date(value).toLocaleDateString(
                                        document.documentElement.lang || 'en-US',
                                        { year: 'numeric', month: 'short' }
                                    );
                                }
                            },
                            title: {
                                display: true,
                                text: this.$t('Date')
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: this.$t('Points')
                            }
                        }
                    }
                }
            });
        },

        renderGlobalChart() {
            const canvas = document.getElementById('globalPointsChart');
            if (!canvas || !this.hasHistoryData) return;

            if (globalChart) {
                globalChart.destroy();
            }

            const pointsUnit = this.$t('pts');
            const datasets = this.leaderboard
                .filter(player => player.history && player.history.length > 0)
                .map(player => {
                    const playerColor = this.getPlayerColor(player.user);
                    return {
                        label: player.user,
                        data: player.history.map(h => ({
                            x: new Date(h.date),
                            y: h.total
                        })),
                        borderColor: playerColor,
                        backgroundColor: playerColor + '20',
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.25,
                        fill: false
                    };
                });

            globalChart = new Chart(canvas, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const date = new Date(context[0].parsed.x);
                                    return date.toLocaleDateString(document.documentElement.lang || 'en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    });
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} ${pointsUnit}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'month',
                                displayFormats: {
                                    month: 'MMM yyyy'
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return new Date(value).toLocaleDateString(
                                        document.documentElement.lang || 'en-US',
                                        { year: 'numeric', month: 'short' }
                                    );
                                }
                            },
                            title: {
                                display: true,
                                text: this.$t('Date')
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: this.$t('Points')
                            }
                        }
                    }
                }
            });
        },

        applyTagBonuses() {
            this.leaderboard.forEach(entry => {
                const completedLevels = new Set([
                    ...entry.completed.map(l => l.level),
                    ...entry.verified.map(l => l.level),
                ]);

                entry.tagBonuses = [];
                let totalBonus = 0;

                tags.forEach(tag => {
                    if (!tag.bonusEnabled) return;

                    const levelsWithTag = this.allLevels.filter(l =>
                        Array.isArray(l.tags) &&
                        l.tags.some(t =>
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
                    const bonus = Math.round(averageLevelScore * 1000) / 1000;
                    const completedAll = levelsWithTag.every(l => completedLevels.has(l.level));

                    if (completedAll && bonus > 0) {
                        entry.tagBonuses.push({ name: tag.name, bonus });
                        totalBonus += bonus;
                    }
                });

                entry.total += totalBonus;
                entry.total = Math.round(entry.total * 1000) / 1000;
            });
        },
    },
};