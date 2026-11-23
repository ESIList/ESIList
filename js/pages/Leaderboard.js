import { applyTagBonuses, fetchLeaderboard, fetchPlayerHistory } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';
import tags from "../components/List/Tags.js";
import filterRegistry, { resolveFilter } from "../components/List/Filters.js";
import { store } from '../main.js';


let chart = null;
let globalChart = null;

function normalizeLeaderboardFilter(value) {
    return String(value).trim().toLowerCase();
}

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
        activePlayerSection: 'overview',
        activeTagId: '',
        activeFilterId: '',
        activeBrowserGroup: 'position',
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
                <section class="leaderboard-header">
                    <div class="leaderboard-header-copy">
                        <p class="leaderboard-eyebrow">{{ $t('Player leaderboard') }}</p>
                        <h1>{{ $t('Leaderboard') }}</h1>
                        <p>{{ $t('Track points, rankings, and player progress.') }}</p>
                    </div>
                    <div class="leaderboard-header-stats">
                        <div>
                            <span>{{ $t('Players') }}</span>
                            <strong>{{ leaderboard.length }}</strong>
                        </div>
                        <div>
                            <span>{{ $t('Total points') }}</span>
                            <strong>{{ localize(totalLeaderboardPoints) }}</strong>
                        </div>
                    </div>
                </section>

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
                            <td class="rank"><p class="type-label-lg" :class="{ 'top-rank': i < 3 }">#{{ i + 1 }}</p></td>
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
                        <div class="global-overview-heading">
                            <div>
                                <p class="leaderboard-eyebrow">{{ $t('Season overview') }}</p>
                                <h2>🌐 {{ $t('All Players Comparison') }}</h2>
                            </div>
                            <p>{{ $t('Compare player points over time.') }}</p>
                        </div>
                        <div class="global-graph-container">
                            <canvas id="globalPointsChart"></canvas>
                        </div>
                    </div>

                    <!-- Individual Player View -->
                    <div class="player" v-else>
                        <button class="mobile-board-button" type="button" @click="showGlobalGraph">
                            ← {{ $t('All players') }}
                        </button>
                        <section class="player-profile-card">
                            <div class="player-avatar" aria-hidden="true">{{ entry.user.slice(0, 2).toUpperCase() }}</div>
                            <div class="player-identity">
                                <p class="leaderboard-eyebrow">{{ $t('Player profile') }}</p>
                                <h1>{{ entry.user }}</h1>
                                <span class="player-rank-badge">#{{ selected + 1 }} {{ $t('Rank') }}</span>
                            </div>
                            <div class="player-total-card">
                                <span>{{ $t('Total points') }}</span>
                                <strong>{{ localize(entry.total) }}</strong>
                            </div>
                        </section>

                        <div class="player-stat-grid">
                            <div>
                                <span>{{ $t('Verified levels') }}</span>
                                <strong>{{ entry.verified.length }}</strong>
                            </div>
                            <div>
                                <span>{{ $t('Completed levels') }}</span>
                                <strong>{{ entry.completed.length }}</strong>
                            </div>
                            <div>
                                <span>{{ $t('Progress entries') }}</span>
                                <strong>{{ entry.progressed.length }}</strong>
                            </div>
                        </div>

                        <div class="graph-container" v-if="entry.total > 0 && pointsOverTime.length > 0">
                            <canvas id="pointsChart"></canvas>
                        </div>
                        <section class="player-detail-navigation">
                            <div class="player-detail-heading">
                                <div>
                                    <p class="leaderboard-eyebrow">{{ $t('Level browser') }}</p>
                                    <h2>{{ playerSectionTitle }}</h2>
                                </div>
                                <span v-if="activePlayerLevels.length">{{ activePlayerLevels.length }} {{ $t('levels') }}</span>
                            </div>

                            <div class="player-detail-groups">
                                <nav class="player-detail-tabs" aria-label="Level browser groups">
                                    <button type="button" :class="{ active: activeBrowserGroup === 'position' }" @click="setBrowserGroup('position')">{{ $t('Position') }}</button>
                                    <button type="button" :class="{ active: activeBrowserGroup === 'status' }" @click="setBrowserGroup('status')">{{ $t('Record status') }}</button>
                                    <button type="button" :class="{ active: activeBrowserGroup === 'filters' }" @click="setBrowserGroup('filters')">{{ $t('Filters') }}</button>
                                    <button type="button" v-if="tagButtons.length" :class="{ active: activeBrowserGroup === 'tags' }" @click="setBrowserGroup('tags')">{{ $t('Tags') }}</button>
                                </nav>

                                <div v-if="activeBrowserGroup === 'position'" class="player-detail-button-grid">
                                    <button type="button" :class="{ active: activePlayerSection === 'overview' }" @click="setPlayerSection('overview')">{{ $t('Overview') }}</button>
                                    <button type="button" :class="{ active: activePlayerSection === 'main' }" @click="setPlayerSection('main')">#1–75</button>
                                    <button type="button" :class="{ active: activePlayerSection === 'extended' }" @click="setPlayerSection('extended')">#76–150</button>
                                    <button type="button" :class="{ active: activePlayerSection === 'legacy' }" @click="setPlayerSection('legacy')">#151+</button>
                                </div>

                                <div v-else-if="activeBrowserGroup === 'status'" class="player-detail-button-grid">
                                    <button type="button" :class="{ active: activePlayerSection === 'verified' }" @click="setPlayerSection('verified')">{{ $t('Verified') }} <small>{{ entry.verified.length }}</small></button>
                                    <button type="button" :class="{ active: activePlayerSection === 'completed' }" @click="setPlayerSection('completed')">{{ $t('Completed') }} <small>{{ entry.completed.length }}</small></button>
                                    <button type="button" :class="{ active: activePlayerSection === 'progressed' }" @click="setPlayerSection('progressed')">{{ $t('Progressed') }} <small>{{ entry.progressed.length }}</small></button>
                                    <button type="button" :class="{ active: activePlayerSection === 'none' }" @click="setPlayerSection('none')">{{ $t('No Progress') }} <small>{{ noProgress.length }}</small></button>
                                </div>

                                <div v-else-if="activeBrowserGroup === 'filters' && filterProgress.length" class="player-detail-filter-grid">
                                        <button
                                            v-for="filter in filterProgress"
                                            :key="filter.id"
                                            type="button"
                                            :class="{ active: activePlayerSection === 'filter' && activeFilterId === filter.id }"
                                            @click="setFilterSection(filter.id)"
                                        >
                                            {{ $t(filter.name) }}
                                            <small>{{ filter.completed }}/{{ filter.total }}</small>
                                        </button>
                                </div>

                                <div v-else-if="activeBrowserGroup === 'tags' && tagButtons.length" class="player-detail-filter-grid">
                                        <button
                                            v-for="tag in tagButtons"
                                            :key="tag.id"
                                            type="button"
                                            :class="{ active: activePlayerSection === 'tag' && activeTagId === tag.id }"
                                            @click="setTagSection(tag.id)"
                                        >
                                            {{ $t(tag.name) }}
                                            <small>{{ tag.count }}</small>
                                        </button>
                                </div>
                            </div>

                            <div v-if="activePlayerSection === 'overview'" class="player-detail-overview">
                                <p class="player-detail-empty">{{ $t('Choose a category, status, filter or tag to browse levels.') }}</p>
                            </div>

                            <div v-else-if="activePlayerLevels.length" class="player-detail-table">
                                <article
                                    v-for="level in activePlayerLevels"
                                    :key="level.level"
                                    :class="level.rowTone ? 'player-detail-row-' + level.rowTone : ''"
                                >
                                    <span class="rank">#{{ level.rank }}</span>
                                    <div class="level">
                                        <a class="type-label-lg" target="_blank" :href="level.link">{{ level.displayName || level.level }}</a>
                                        <p v-if="level.showSubtitle && getSubtitle(level.level)" class="level-subtitle">
                                            – “{{ getSubtitle(level.level) }}”
                                        </p>
                                    </div>
                                    <span v-if="level.score !== null" class="score">{{ level.scorePrefix || '+' }}{{ localize(level.score) }}</span>
                                </article>
                            </div>
                            <p v-else class="player-detail-empty">{{ $t('No levels in this section.') }}</p>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        totalLeaderboardPoints() {
            return this.leaderboard.reduce((sum, entry) => sum + entry.total, 0);
        },

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
        },

        tagButtons() {
            if (!Array.isArray(this.allLevels)) return [];
            const counts = new Map();
            this.allLevels.forEach((level) => {
                if (!Array.isArray(level.tags)) return;
                level.tags.forEach((raw) => {
                    const id = String(raw).trim();
                    if (!id) return;
                    const key = id.toLowerCase();
                    if (!counts.has(key)) counts.set(key, { id: key, name: id, count: 0 });
                    counts.get(key).count++;
                });
            });
            const registered = tags
                .filter((tag) => counts.has(String(tag.id).toLowerCase()))
                .map((tag) => ({ ...counts.get(String(tag.id).toLowerCase()), id: String(tag.id).toLowerCase(), name: tag.name }));
            const registeredIds = new Set(registered.map((tag) => tag.id));
            const extras = [...counts.values()].filter((tag) => !registeredIds.has(tag.id))
                .sort((a, b) => a.name.localeCompare(b.name));
            return [...registered, ...extras];
        },

        playerSectionTitle() {
            const titles = {
                overview: 'Overview',
                main: 'Main list (#1–75)',
                extended: 'Extended list (#76–150)',
                legacy: 'Legacy list (#151+)',
                verified: 'Verified levels',
                completed: 'Completed levels',
                progressed: 'Progressed levels',
                none: 'No Progress',
            };
            if (this.activePlayerSection === 'filter') {
                const filter = this.filterProgress.find((item) => item.id === this.activeFilterId);
                return filter ? this.$t(filter.name) : this.$t('Gameplay filter');
            }
            if (this.activePlayerSection === 'tag') {
                const tag = this.tagButtons.find((item) => item.id === this.activeTagId);
                return tag ? this.$t(tag.name) : this.$t('Tags');
            }
            return this.$t(titles[this.activePlayerSection] || 'Overview');
        },

        activePlayerLevels() {
            if (!this.entry) return [];
            const verified = new Map(this.entry.verified.map((item) => [item.level, item]));
            const completed = new Map(this.entry.completed.map((item) => [item.level, item]));
            const progressed = new Map(this.entry.progressed.map((item) => [item.level, item]));
            const buildLevel = (level, statusOverride) => {
                const record = verified.get(level.level) || completed.get(level.level) || progressed.get(level.level);
                let status = statusOverride;
                if (!status) {
                    status = verified.has(level.level) ? 'verified'
                        : completed.has(level.level) ? 'completed'
                        : progressed.has(level.level) ? 'progressed'
                        : 'none';
                }
                const isCompleted = status === 'verified' || status === 'completed';
                const usesCompletionTone = ['main', 'extended', 'legacy', 'filter'].includes(this.activePlayerSection);
                return {
                    rank: level.rank,
                    level: level.level,
                    link: record?.link || level.link || '#',
                    score: record?.score ?? null,
                    completed: isCompleted,
                    showSubtitle: isCompleted,
                    rowTone: usesCompletionTone ? (isCompleted ? 'completed' : 'incomplete') : '',
                    displayName: progressed.has(level.level)
                        ? `${progressed.get(level.level).percent}% ${level.level}`
                        : level.level,
                };
            };

            if (this.activePlayerSection === 'overview') return [];
            if (this.activePlayerSection === 'main') {
                return this.allLevels.filter((level) => level.rank <= 75).map((level) => buildLevel(level));
            }
            if (this.activePlayerSection === 'extended') {
                return this.allLevels.filter((level) => level.rank >= 76 && level.rank <= 150).map((level) => buildLevel(level));
            }
            if (this.activePlayerSection === 'legacy') {
                return this.allLevels.filter((level) => level.rank >= 151).map((level) => buildLevel(level));
            }
            if (this.activePlayerSection === 'verified') {
                return this.entry.verified.map((item) => buildLevel({ level: item.level, rank: item.rank, link: item.link }, 'verified'));
            }
            if (this.activePlayerSection === 'completed') {
                return this.entry.completed.map((item) => buildLevel({ level: item.level, rank: item.rank, link: item.link }, 'completed'));
            }
            if (this.activePlayerSection === 'progressed') {
                return this.entry.progressed.map((item) => buildLevel({ level: item.level, rank: item.rank, link: item.link }, 'progressed'));
            }
            if (this.activePlayerSection === 'none') {
                return this.noProgress.map((level) => buildLevel(level, 'none'));
            }
            if (this.activePlayerSection === 'filter') {
                return this.allLevels
                    .filter((level) => Array.isArray(level.filters) && level.filters.some((raw) =>
                        normalizeLeaderboardFilter(raw) === this.activeFilterId
                    ))
                    .map((level) => buildLevel(level));
            }
            if (this.activePlayerSection === 'tag') {
                return this.allLevels
                    .filter((level) => Array.isArray(level.tags) && level.tags.some((raw) =>
                        String(raw).trim().toLowerCase() === this.activeTagId
                    ))
                    .map((level) => buildLevel(level));
            }
            return [];
        },

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
        selected() {
            this.activePlayerSection = 'overview';
            this.activeTagId = '';
            this.activeFilterId = '';
            this.activeBrowserGroup = 'position';
        },
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
        this.leaderboard = applyTagBonuses(this.leaderboard, this.allLevels);

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
            this.activePlayerSection = 'overview';
            this.activeTagId = '';
            this.activeFilterId = '';
            this.activeBrowserGroup = 'position';
            if (window.matchMedia("(max-width: 900px), (pointer: coarse)").matches) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        },

        setPlayerSection(section) {
            this.activePlayerSection = section;
            this.activeTagId = '';
            this.activeFilterId = '';
        },

        setBrowserGroup(group) {
            this.activeBrowserGroup = group;
        },

        setFilterSection(filterId) {
            this.activePlayerSection = 'filter';
            this.activeFilterId = filterId;
            this.activeTagId = '';
        },

        setTagSection(tagId) {
            this.activePlayerSection = 'tag';
            this.activeTagId = tagId;
            this.activeFilterId = '';
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

    },
};