import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';
import filterRegistry, { normalizeFilterId } from '../components/List/Filters.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette" :class="{ 'roulette-playing': isPlaying }">
            <div class="sidebar">
                <p class="type-label-md" style="color: #aaa">
                    {{ $t('Shameless copy of the Extreme Demon Roulette by') }} <a href="https://matcool.github.io/extreme-demon-roulette/" target="_blank">matcool</a>.
                </p>
                <form class="options">
                    <div class="check">
                        <input type="checkbox" id="main" value="Main List" v-model="useMainList" :disabled="customRange" @change="updateRankRange">
                        <label for="main">{{ $t('Main List') }}</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="extended" value="Extended List" v-model="useExtendedList" :disabled="customRange" @change="updateRankRange">
                        <label for="extended">{{ $t('Extended List') }}</label>
                    </div>
                    <div class="check">
                        <input type="checkbox" id="custom-range" v-model="customRange" @change="onCustomRangeChange">
                        <label for="custom-range">{{ $t('Custom') }}</label>
                    </div>
                    <div class="roulette-filters">
                        <label for="roulette-filter">{{ $t('Gameplay filter') }}</label>
                        <select id="roulette-filter" v-model="selectedFilter">
                            <option value="">{{ $t('All filters') }}</option>
                            <option v-for="filter in filterOptions" :key="filter.id" :value="filter.id">{{ $t(filter.name) }}</option>
                        </select>

                        <div class="rank-range" v-if="customRange">
                            <label>{{ $t('Custom rank range') }}</label>
                            <input
                                v-model="minRank"
                                type="number"
                                min="1"
                                max="150"
                                step="1"
                                inputmode="numeric"
                                :aria-label="$t('Minimum rank')"
                                :placeholder="$t('From')"
                            >
                            <input
                                v-model="maxRank"
                                type="number"
                                min="1"
                                max="150"
                                step="1"
                                inputmode="numeric"
                                :aria-label="$t('Maximum rank')"
                                :placeholder="$t('To')"
                            >
                        </div>
                        <p class="type-label-md" v-if="customRange">{{ $t('Custom uses this range instead of Main/Extended.') }}</p>
                        <p class="type-label-md">{{ $t('The roulette draws up to 100 matching levels.') }}</p>
                    </div>
                    <Btn @click.native.prevent="onStart">{{ levels.length === 0 ? $t('Start') : $t('Restart')}}</Btn>
                </form>
                <p class="type-label-md" style="color: #aaa">
                    {{ $t('The roulette saves automatically.') }}
                </p>
                <form class="save">
                    <p>{{ $t('Manual Load/Save') }}</p>
                    <div class="btns">
                        <Btn @click.native.prevent="onImport">{{ $t('Import') }}</Btn>
                        <Btn :disabled="!isActive" @click.native.prevent="onExport">{{ $t('Export') }}</Btn>
                    </div>
                </form>
            </div>
            <section class="levels-container">
                <div class="levels">
                    <template v-if="levels.length > 0">
                        <!-- Completed Levels -->
                        <div class="level" v-for="(level, i) in levels.slice(0, progression.length)">
                            <a :href="level.video" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                            </a>
                            <div class="meta">
                                <p>#{{ level.rank }}</p>
                                <h2>{{ level.name }}</h2>
                                <p style="color: #00b54b; font-weight: 700">{{ progression[i] }}%</p>
                            </div>
                        </div>
                        <!-- Current Level -->
                        <div class="level" v-if="!hasCompleted">
                            <a :href="currentLevel.video" target="_blank" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))" alt="">
                            </a>
                            <div class="meta">
                                <p>#{{ currentLevel.rank }}</p>
                                <h2>{{ currentLevel.name }}</h2>
                                <p>{{ currentLevel.id }}</p>
                            </div>
                            <form class="actions" v-if="!givenUp">
                                <input type="number" v-model="percentage" :placeholder="placeholder" :min="currentPercentage + 1" max=100>
                                <Btn @click.native.prevent="onDone">{{ $t('Done') }}</Btn>
                                <Btn @click.native.prevent="onGiveUp" style="background-color: #e91e63;">{{ $t('Give Up') }}</Btn>
                            </form>
                        </div>
                        <!-- Results -->
                        <div v-if="givenUp || hasCompleted" class="results">
                            <h1>{{ $t('Results') }}</h1>
                            <p>{{ $t('Number of levels: {count}', { count: progression.length }) }}</p>
                            <p>{{ $t('Highest percent: {percent}%', { percent: currentPercentage }) }}</p>
                            <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.native.prevent="showRemaining = true">{{ $t('Show remaining levels') }}</Btn>
                        </div>
                        <!-- Remaining Levels -->
                        <template v-if="givenUp && showRemaining">
                            <div class="level" v-for="(level, i) in levels.slice(progression.length + 1, levels.length - currentPercentage + progression.length)">
                                <a :href="level.video" target="_blank" class="video">
                                    <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                                </a>
                                <div class="meta">
                                    <p>#{{ level.rank }}</p>
                                    <h2>{{ level.name }}</h2>
                                    <p style="color: #d50000; font-weight: 700">{{ currentPercentage + 2 + i }}%</p>
                                </div>
                            </div>
                        </template>
                    </template>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="toast in toasts" class="toast">
                        <p>{{ toast }}</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: false,
        levels: [],
        progression: [], // list of percentages completed
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        useMainList: true,
        useExtendedList: true,
        customRange: false,
        selectedFilter: '',
        minRank: 1,
        maxRank: 150,
        filterOptions: filterRegistry,
        toasts: [],
        fileInput: undefined,
    }),
    mounted() {
        // Create File Input
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        // Load progress from local storage
        const roulette = JSON.parse(localStorage.getItem('roulette'));

        if (!roulette) {
            return;
        }

        this.levels = roulette.levels;
        this.progression = roulette.progression;
        if (roulette.settings) {
            this.useMainList = roulette.settings.useMainList ?? this.useMainList;
            this.useExtendedList = roulette.settings.useExtendedList ?? this.useExtendedList;
            this.customRange = roulette.settings.customRange ?? this.customRange;
            this.selectedFilter = roulette.settings.selectedFilter ?? this.selectedFilter;
            this.minRank = roulette.settings.minRank ?? this.minRank;
            this.maxRank = roulette.settings.maxRank ?? this.maxRank;
        }
    },
    computed: {
        currentLevel() {
            return this.levels[this.progression.length];
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        placeholder() {
            return this.$t('At least {percent}%', { percent: this.currentPercentage + 1 });
        },
        hasCompleted() {
            return (
                this.progression[this.progression.length - 1] >= 100 ||
                this.progression.length === this.levels.length
            );
        },
        isActive() {
            return (
                this.progression.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
        isPlaying() {
            return this.levels.length > 0 && !this.givenUp && !this.hasCompleted;
        },
    },
    methods: {
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        updateRankRange() {
            if (this.customRange) return;

            if (this.useMainList && this.useExtendedList) {
                this.minRank = 1;
                this.maxRank = 150;
            } else if (this.useMainList) {
                this.minRank = 1;
                this.maxRank = 75;
            } else if (this.useExtendedList) {
                this.minRank = 76;
                this.maxRank = 150;
            } else {
                this.minRank = '';
                this.maxRank = '';
            }
        },
        onCustomRangeChange() {
            if (!this.customRange) {
                this.updateRankRange();
            }
        },
        async onStart() {
            if (this.isActive) {
                this.showToast(this.$t('Give up before starting a new roulette.'));
                return;
            }

            if (!this.customRange && !this.useMainList && !this.useExtendedList) {
                this.showToast(this.$t('Choose at least one list.'));
                return;
            }

            const minRank = this.minRank === '' ? 1 : Number(this.minRank);
            const maxRank = this.maxRank === '' ? 150 : Number(this.maxRank);
            if (
                !Number.isInteger(minRank) ||
                !Number.isInteger(maxRank) ||
                minRank < 1 ||
                maxRank > 150 ||
                minRank > maxRank
            ) {
                this.showToast(this.$t('Enter a valid rank range between 1 and 150.'));
                return;
            }

            this.loading = true;

            const fullList = await fetchList();

            if (!fullList || fullList.some(([_, err]) => err)) {
                this.loading = false;
                this.showToast(
                    this.$t("List is currently broken. Wait until it's fixed to start a roulette."),
                );
                return;
            }

            const list = fullList
                .map(([level], i) => ({
                    rank: i + 1,
                    id: level.id,
                    name: level.name,
                    video: level.verification,
                    filters: Array.isArray(level.filters) ? level.filters : [],
                }))
                .filter((level) => {
                    const inSelectedList =
                        this.customRange ||
                        (level.rank <= 75 && this.useMainList) ||
                        (level.rank > 75 && level.rank <= 150 && this.useExtendedList);
                    if (!inSelectedList || level.rank < minRank || level.rank > maxRank) {
                        return false;
                    }

                    if (
                        this.selectedFilter &&
                        !level.filters.some(
                            (filter) => normalizeFilterId(filter) === this.selectedFilter,
                        )
                    ) {
                        return false;
                    }

                    return true;
                })
                .map(({ rank, id, name, video }) => ({ rank, id, name, video }));

            if (list.length === 0) {
                this.loading = false;
                this.showToast(this.$t('No levels match the selected options.'));
                return;
            }

            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;

            this.loading = false;
            this.save();
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                    settings: {
                        useMainList: this.useMainList,
                        useExtendedList: this.useExtendedList,
                        customRange: this.customRange,
                        selectedFilter: this.selectedFilter,
                        minRank: this.minRank,
                        maxRank: this.maxRank,
                    },
                }),
            );
        },
        onDone() {
            if (!this.percentage) {
                return;
            }

            if (
                this.percentage <= this.currentPercentage ||
                this.percentage > 100
            ) {
                this.showToast(this.$t('Invalid percentage.'));
                return;
            }

            this.progression.push(this.percentage);
            this.percentage = undefined;

            this.save();
        },
        onGiveUp() {
            this.givenUp = true;

            // Save progress
            localStorage.removeItem('roulette');
        },
        onImport() {
            if (
                this.isActive &&
                !window.confirm(this.$t('This will overwrite the currently running roulette. Continue?'))
            ) {
                return;
            }

            this.fileInput.showPicker();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;

            const file = this.fileInput.files[0];

            if (file.type !== 'application/json') {
                this.showToast(this.$t('Invalid file.'));
                return;
            }

            try {
                const roulette = JSON.parse(await file.text());

                if (!roulette.levels || !roulette.progression) {
                    this.showToast(this.$t('Invalid file.'));
                    return;
                }

                this.levels = roulette.levels;
                this.progression = roulette.progression;
                if (roulette.settings) {
                    this.useMainList = roulette.settings.useMainList ?? this.useMainList;
                    this.useExtendedList = roulette.settings.useExtendedList ?? this.useExtendedList;
                    this.customRange = roulette.settings.customRange ?? this.customRange;
                    this.selectedFilter = roulette.settings.selectedFilter ?? this.selectedFilter;
                    this.minRank = roulette.settings.minRank ?? this.minRank;
                    this.maxRank = roulette.settings.maxRank ?? this.maxRank;
                }
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch {
                this.showToast(this.$t('Invalid file.'));
                return;
            }
        },
        onExport() {
            const file = new Blob(
                [JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                    settings: {
                        useMainList: this.useMainList,
                        useExtendedList: this.useExtendedList,
                        customRange: this.customRange,
                        selectedFilter: this.selectedFilter,
                        minRank: this.minRank,
                        maxRank: this.maxRank,
                    },
                })],
                { type: 'application/json' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'tsl_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => {
                this.toasts.shift();
            }, 3000);
        },
    },
};
