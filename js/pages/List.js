import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";
import tags from "../components/List/Tags.js";
import filterRegistry, { normalizeFilterId, resolveFilter } from "../components/List/Filters.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="search-row">
                    <input
                        v-model="search"
                        class="level-search type-label-lg"
                        type="text"
                        placeholder="🔍 Search levels..."
                    />
                    <div class="filter-wrapper">
                        <button
                            class="filter-button type-label-lg"
                            :class="{ active: selectedFilters.length > 0 }"
                            @click.stop="showFilters = !showFilters"
                            aria-label="Filters"
                            title="Filters"
                        >
                            <span>⛃ Filter</span>
                            <span v-if="selectedFilters.length" class="filter-count">{{ selectedFilters.length }}</span>
                        </button>

                        <div class="filter-panel" v-if="showFilters" @click.stop>
                            <div class="filter-panel-header">
                                <span class="type-title-sm">Filters</span>
                                <button
                                    v-if="selectedFilters.length"
                                    class="filter-clear"
                                    @click="clearFilters"
                                >Clear</button>
                            </div>
                            <div class="filter-options" v-if="availableFilters.length">
                                <button
                                    v-for="f in availableFilters"
                                    :key="f.id"
                                    class="filter-chip"
                                    :class="{ selected: isFilterSelected(f.id), empty: f.count === 0 }"
                                    @click="toggleFilter(f.id)"
                                >
                                    {{ f.name }}
                                    <span class="filter-chip-count">{{ f.count }}</span>
                                </button>
                            </div>
                            <p v-else class="no-results">No filters available yet.</p>
                        </div>
                    </div>
                </div>

                <table class="list" v-if="list">
                    <tr v-for="item in filteredList" :key="item.index">
                        <td class="rank">
                            <p v-if="item.index + 1 <= 150" class="type-label-lg">#{{ item.index + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == item.index, 'error': !item.level }">
                            <button @click="selected = item.index">
                                <span class="type-label-lg">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
                <p v-if="(search || selectedFilters.length) && filteredList.length === 0" class="no-results">No levels found. Search by level name or by level placement (1, #1), or loosen the filters.</p>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1 class="level-title">
 
                        {{ level.name }}
                    </h1>
                    <p
                        v-if="level.subtitle"
                        class="level-subtitle"
                    >
                        – “{{ level.subtitle }}”
                    </p>
                    <LevelAuthors :author="level.author" :verifier="level.verifier"></LevelAuthors>

                    <div class="tags" v-if="level.tags && level.tags.length">
                        <button
                            v-for="tagName in level.tags"
                            :key="tagName"
                            class="tag clickable"
                            :style="tagStyle(tagName)"
                            @click="goToTag(tagName)"
                        >
                            <span v-if="getTag(tagName)?.bonusEnabled">
                                🏅 {{ getTagDisplayName(tagName) }} 🏅
                            </span>
                            <span v-else>
                                {{ getTagDisplayName(tagName) }}
                            </span>
                        </button>
                    </div>

                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>

                    <div class="level-filters" v-if="levelFilters.length">
                        <button
                            v-for="f in levelFilters"
                            :key="f.id"
                            class="filter-chip"
                            :class="{ selected: isFilterSelected(f.id) }"
                            @click="toggleFilter(f.id)"
                            title="Click to filter the list by this"
                        >
                            {{ f.name }}
                        </button>
                    </div>

                    <hr class="section-separator" />

                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">AREDL Placement (on verification)</div>
                            <p>{{ level.aredl }}</p>
                        </li>
                    </ul>
                    
                    <hr class="section-separator" />

                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected +1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <div class="percent-wrapper">
                                    <p>{{ record.percent }}%</p>

                                    <router-link
                                        :to="{ path: '/leaderboard', query: { player: record.user } }"
                                        class="profile-link"
                                    >
                                        <img
                                            src="/assets/profile.png"
                                            alt="Profile"
                                            class="profile-icon"
                                        />
                                    </router-link>
                                </div>
                            </td>

                            
                            <td class="user">
                                <a target="_blank" class="type-label-lg">{{ record.user }}</a>

                                <span
                                    v-if="record.phrase"
                                    class="record-phrase"
                                >
                                    – “{{ record.phrase }}”
                                </span>
                            </td>

                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <div class="hz-content">
                                    <a
                                        v-if="record.link && record.link !== 'No video'"
                                        :href="record.link"
                                        target="_blank"
                                        class="video-link"
                                        aria-label="Watch video"
                                    >
                                        <img
                                            src="/assets/youtube.png"
                                            alt="YouTube"
                                            class="video-icon"
                                        />
                                    </a>

                                    <p>{{ record.hz }}Hz</p>
                                </div>
                            </td>

                        </tr>
                    </table>
                </div>

                <hr class="section-separator" />

                <h2 v-if="level.positionHistory && level.positionHistory.length">
                    Position History
                </h2>

                <div class="position-history-cards type-label-lg" v-if="level.positionHistory && level.positionHistory.length">
                    
                    <!-- Column headers -->
                    <div class="history-card headers">
                        <div class="history-date">Date</div>
                        <div class="history-change">Change</div>
                        <div class="history-position">Position</div>
                        <div class="history-reason">Reason</div>
                    </div>

                    <!-- History entries -->
                    <div
                        v-for="entry in level.positionHistory.slice().reverse()"
                        :class="['history-card', {
                            'added': entry.change === null,
                            'up': entry.change > 0,
                            'down': entry.change < 0
                        }]"
                    >
                        <div class="history-date">{{ entry.date }}</div>
                        <div class="history-change">
                            <span v-if="entry.change === null">–</span>
                            <span v-else-if="entry.change > 0">🔼{{ entry.change }}</span>
                            <span v-else>🔽{{ Math.abs(entry.change) }}</span>
                        </div>
                        <div class="history-position">#{{ entry.position }}</div>
                        <div class="history-reason">{{ entry.reason }}</div>
                    </div>
                </div>


                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>

            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>

                    <div class="og">
                        <p class="type-label-md">
                            Website layout made by 
                            <a href="https://tsl.pages.dev/" target="_blank">TheShittyList</a>
                        </p>
                    </div>

                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>

                    <h3>Submission Requirements</h3>
                    <p>Achieved the record without using hacks (FPS bypass is allowed).</p>
                    <p>Record on the level listed on the site or unchanged SP copy.</p>
                    <p>Video must include source audio or clicks/taps (no edited audio only).</p>
                    <p>Show previous attempt and full death animation unless it's first attempt. Everyplay exempt.</p>
                    <p>Show the endwall hit or record is invalidated.</p>
                    <p>No secret or bug routes allowed.</p>
                    <p>No easy modes – only unmodified level qualifies.</p>
                    <p>Legacy levels are always accepted.</p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        search: "",
        selectedFilters: [],
        showFilters: false,
        roleIconMap,
        store,
    }),
    computed: {
        // All filters for the menu: registered ones first (in registry order),
        // then any filter found in level data that isn't registered, sorted A-Z.
        // `count` = how many levels have that filter.
        availableFilters() {
            const counts = new Map();
            const names = new Map();
            for (const [level] of this.list) {
                if (!level || !Array.isArray(level.filters)) continue;
                const seen = new Set();
                for (const raw of level.filters) {
                    const f = resolveFilter(raw);
                    if (seen.has(f.id)) continue;
                    seen.add(f.id);
                    counts.set(f.id, (counts.get(f.id) || 0) + 1);
                    names.set(f.id, f.name);
                }
            }

            const result = filterRegistry.map((f) => ({
                id: f.id,
                name: f.name,
                count: counts.get(f.id) || 0,
            }));

            const registeredIds = new Set(filterRegistry.map((f) => f.id));
            const extras = [...counts.keys()]
                .filter((id) => !registeredIds.has(id))
                .sort()
                .map((id) => ({ id, name: names.get(id), count: counts.get(id) }));

            return [...result, ...extras];
        },
        levelFilters() {
            if (!this.level || !Array.isArray(this.level.filters)) return [];
            const seen = new Set();
            return this.level.filters
                .map((raw) => resolveFilter(raw))
                .filter((f) => (seen.has(f.id) ? false : seen.add(f.id)));
        },
        filteredList() {
            const all = this.list.map(([level, err], index) => ({ level, err, index }));
            const q = this.search.trim().toLowerCase().replace(/^#/, "");
            const activeFilters = this.selectedFilters;

            if (!q && activeFilters.length === 0) return all;

            const isNumber = /^\d+$/.test(q);

            return all.filter(({ level, err, index }) => {
                // Filters: a level must have ALL selected filters
                if (activeFilters.length) {
                    if (!level || !Array.isArray(level.filters)) return false;
                    const ids = level.filters.map(normalizeFilterId);
                    if (!activeFilters.every((id) => ids.includes(id))) return false;
                }

                if (!q) return true;

                // Exact placement match: searching "107" shows the level ranked #107
                if (isNumber && index + 1 === Number(q)) return true;

                if (!level) return String(err).toLowerCase().includes(q);
                return [level.name, level.author, level.verifier].some(
                    (v) => v != null && String(v).toLowerCase().includes(q)
                );
            });
        },
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) return embed(this.level.verification);
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
    },
    async mounted() {
        document.addEventListener("click", this.closeFilters);

        const tagId = this.$route.params.tagId;
        this.list = await fetchList();
        this.editors = await fetchEditors();

        // Find tag
        this.tag = tags.find(t =>
            t.id.toLowerCase() === String(tagId).toLowerCase() ||
            t.name.toLowerCase() === String(tagId).toLowerCase()
        );

        if (this.tag && this.list) {
            // Map all levels that include this tag + attach rank
            this.levelsWithTag = this.list
                .map(([level], index) => ({ ...level, rank: index + 1 }))
                .filter(level =>
                    Array.isArray(level.tags) &&
                    level.tags.some(t =>
                        String(t).toLowerCase() === this.tag.id.toLowerCase() ||
                        String(t).toLowerCase() === this.tag.name.toLowerCase()
                    )
                );
        } else {
            this.levelsWithTag = [];
        }

        this.loading = false;
        
        if (store.selectedLevelId) {
            const index = this.list.findIndex(([level]) => level.id === store.selectedLevelId);
            if (index !== -1) {
                this.selected = index;
            }
            store.selectedLevelId = null; // reset after use
        }
    },
    beforeUnmount() {
        document.removeEventListener("click", this.closeFilters);
    },
    methods: {
        embed,
        score,
        // filter system methods
        isFilterSelected(id) {
            return this.selectedFilters.includes(id);
        },
        toggleFilter(id) {
            if (this.isFilterSelected(id)) {
                this.selectedFilters = this.selectedFilters.filter((f) => f !== id);
            } else {
                this.selectedFilters = [...this.selectedFilters, id];
            }
        },
        clearFilters() {
            this.selectedFilters = [];
        },
        closeFilters() {
            this.showFilters = false;
        },
        // tag system methods
        getTag(tagName) {
            return tags.find(
                (t) =>
                    t.name.toLowerCase() === tagName.toLowerCase() ||
                    t.id.toLowerCase() === tagName.toLowerCase()
            );
        },
        tagStyle(tagName) {
            const tag = this.getTag(tagName);
            return tag
                ? { backgroundColor: tag.color }
                : { backgroundColor: "#888" };
        },
        getTagDisplayName(tagName) {
            const tag = this.getTag(tagName);
            return tag ? tag.name : tagName;
        },
        goToTag(tagName) {
            const tag = this.getTag(tagName);
            if (tag) {
                this.$router.push(`/tags/${tag.id}`);
            } else {
                console.warn(`Tag not found: ${tagName}`);
            }
        }
    },
};