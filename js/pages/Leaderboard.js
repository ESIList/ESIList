import { fetchLeaderboard, fetchPlayerHistory } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';
import tags from "../components/List/Tags.js";
import { score } from '../score.js';

let chart = null;
let globalChart = null;

export default {
    components: { Spinner },
    data: () => ({
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
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>

                <div class="board-container">
                    <table class="board">
                        <!-- Global Graph Button (styled like a player row) -->
                        <tr v-if="hasHistoryData">
                            <td class="rank"><p class="type-label-lg">📊</p></td>
                            <td class="total"><p class="type-label-lg">GRAPH</p></td>
                            <td class="user" :class="{ 'active': showingGlobalGraph }">
                                <button @click="showGlobalGraph">
                                    <span class="type-label-lg">🌐 All Players Comparison</span>
                                </button>
                            </td>
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
                        <h1>🌐 All Players Comparison</h1>
                        <div class="global-graph-container">
                            <canvas id="globalPointsChart"></canvas>
                        </div>
                    </div>

                    <!-- Individual Player View -->
                    <div class="player" v-else>
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ entry.total }}</h3>

                        <div class="graph-container" v-if="entry.total > 0 && pointsOverTime.length > 0">
                            <canvas id="pointsChart"></canvas>
                        </div>

                        <h2 v-if="getPlayerSkillsArray(entry).length > 0">Skills</h2>

                        <div
                            class="skills"
                            v-if="getPlayerSkillsArray(entry).length > 0"
                        >
                            <div
                                v-for="skill in getPlayerSkillsArray(entry)"
                                :key="skill.name"
                                class="skill"
                            >
                                <span class="skill-name">{{ skill.name }}</span>
                                <span class="skill-value">{{ skill.value }}</span>
                            </div>
                        </div>

                        <!-- Rest of player stats tables... -->
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
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

                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
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

                        <h2 v-if="entry.tagBonuses && entry.tagBonuses.length > 0">Bonus Pack points ({{ entry.tagBonuses.length }})</h2>
                        <table class="table" v-if="entry.tagBonuses && entry.tagBonuses.length > 0">
                            <tr v-for="bonus in entry.tagBonuses" :key="bonus.name">
                                <td class="level"><p>{{ bonus.name }}</p></td>
                                <td class="score"><p>+{{ localize(bonus.bonus) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
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

                        <h2 v-if="noProgress.length > 0">No Progress ({{ noProgress.length }})</h2>
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
        console.log('skills result:', this.getPlayerSkillsArray(this.leaderboard[0]));
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
                                    return date.toLocaleDateString('en-US', { 
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
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: 'Points'
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
                                    return date.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                    });
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} pts`;
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
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: 'Points'
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

        getPlayerSkills(entry) {
            const skillMap = {};

            const completedLevelNames = new Set([
                ...entry.completed
                    .map(l => l.level?.toLowerCase())
                    .filter(Boolean),

                ...entry.verified
                    .map(l => l.level?.toLowerCase())
                    .filter(Boolean),
            ]);

            const levels = this.allLevels.filter(l =>
                l.level && completedLevelNames.has(l.level.toLowerCase())
            );

            levels.forEach(level => {
                if (!Array.isArray(level.skills)) return;

                level.skills.forEach(skill => {
                    const { name, value } = skill;

                    if (!name || value == null) return;

                    if (!skillMap[name] || value > skillMap[name]) {
                        skillMap[name] = value;
                    }
                });
            });

            return skillMap;
        },

        getPlayerSkillsArray(entry) {
            const skillMap = this.getPlayerSkills(entry);

            return Object.entries(skillMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value); // optional: highest first
        },
    },
};
