import { recordsApiUrl } from '../admin/config.js';
import { fetchList, fetchRuns } from '../content.js';

const levelNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}$/;

function emptyLevel(name = '') {
    return {
        id: '',
        name,
        subtitle: '-',
        author: '',
        verifier: '',
        aredl: '',
        verificationDate: '',
        tagsText: '',
        filtersText: '',
        verification: '',
        percentToQualify: '100',
        positionHistory: [],
        records: [],
    };
}

function emptyRun(name = '') {
    return {
        id: '',
        name,
        author: '',
        expectedplacement: '',
        verifier: '',
        verification: '',
        percentToQualify: '0',
        records: [],
    };
}

function formatHistoryDate(date = new Date()) {
    return [
        String(date.getDate()).padStart(2, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        date.getFullYear(),
    ].join('-');
}

export default {
    template: `
        <main class="page-admin-records">
            <section class="admin-records-content">
                <div class="admin-records-heading">
                    <div>
                        <p class="admin-records-eyebrow">{{ $t('Records') }}</p>
                        <h1>{{ $t('Record manager') }}</h1>
                    </div>
                    <button v-if="authorized" class="admin-records-button admin-records-button-secondary" type="button" @click="logout">
                        {{ $t('Sign out') }}
                    </button>
                </div>

                <p v-if="!recordsApiUrl" class="admin-records-message" role="alert">
                    {{ $t('Configure the Worker URL in js/admin/config.js before using this page.') }}
                </p>

                <form v-if="!authorized" class="admin-records-login" @submit.prevent="login">
                    <p>{{ $t('Sign in to edit level files and records.') }}</p>
                    <label>
                        {{ $t('Username') }}
                        <input v-model.trim="username" autocomplete="username" required :disabled="busy || !recordsApiUrl">
                    </label>
                    <label>
                        {{ $t('Password') }}
                        <input v-model="password" type="password" autocomplete="current-password" required :disabled="busy || !recordsApiUrl">
                    </label>
                    <button class="admin-records-button" type="submit" :disabled="busy || !recordsApiUrl">
                        {{ $t('Sign in') }}
                    </button>
                </form>

                <section v-else class="admin-records-editor">
                    <p class="admin-records-hint">{{ $t('Changes are committed directly to the repository.') }}</p>
                    <div class="admin-records-categories" role="group" :aria-label="$t('Submission type')">
                        <button
                            v-for="category in categories"
                            :key="category.id"
                            class="admin-records-category"
                            :class="{ active: selectedCategory === category.id }"
                            type="button"
                            :aria-pressed="selectedCategory === category.id"
                            @click="selectCategory(category.id)"
                            :disabled="busy"
                        >{{ $t(category.label) }}</button>
                    </div>
                    <div class="admin-records-workspace">
                        <aside class="admin-records-sidebar">
                    <div class="admin-records-controls">
                        <form class="admin-records-create" @submit.prevent="createItem">
                            <label>
                                {{ $t(selectedCategory === 'verifications' ? 'Run file name' : 'Level file name') }}
                                <input v-model.trim="newLevelName" maxlength="100" :disabled="busy">
                            </label>
                            <label v-if="selectedCategory !== 'verifications'">
                                {{ $t('Insert at position') }}
                                <input v-model.number="newLevelRank" type="number" min="1" :max="levelEntries.length + 1" step="1" :disabled="busy">
                            </label>
                            <button class="admin-records-button admin-records-button-secondary" type="submit" :disabled="busy">
                                {{ $t(selectedCategory === 'verifications' ? 'Create verification' : 'Create level') }}
                            </button>
                            <small>{{ $t(selectedCategory === 'verifications' ? 'Create a new verification run.' : 'Create a new level file at the selected position in the list.') }}</small>
                        </form>
                    </div>

                    <section class="admin-records-level-list">
                        <h2>{{ $t(selectedCategory === 'verifications' ? 'Entries in category' : 'Levels in category') }} ({{ categoryItems.length }})</h2>
                        <p v-if="!categoryItems.length" class="admin-records-hint">{{ $t('No entries match this category.') }}</p>
                        <button
                            v-for="item in categoryItems"
                            :key="item.path"
                            class="admin-records-level-item"
                            :class="{ active: selectedName === item.path }"
                            type="button"
                            @click="selectItem(item)"
                            :disabled="busy"
                        >
                            <span class="admin-records-level-rank">#{{ item.rank }}</span>
                            <span class="admin-records-level-name">{{ item.name }}</span>
                            <span class="admin-records-level-summary">{{ item.summary }}</span>
                        </button>
                    </section>
                        </aside>

                    <form v-if="selectedName" class="admin-records-form" @submit.prevent="saveLevel">
                        <section v-if="selectedCategory === 'verifications'" class="admin-records-section">
                            <h2>{{ $t('Verification run information') }}</h2>
                            <div class="admin-records-fields">
                                <label>
                                    {{ $t('Run name') }}
                                    <input v-model.trim="runForm.name" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Level ID') }}
                                    <input v-model.trim="runForm.id" type="number" min="1" step="1" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Creator') }}
                                    <input v-model.trim="runForm.author" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verifier') }}
                                    <input v-model.trim="runForm.verifier" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Expected Placement') }}
                                    <input v-model.trim="runForm.expectedplacement" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Qualification percentage') }}
                                    <input v-model="runForm.percentToQualify" type="number" min="0" max="100" step="any" :disabled="busy">
                                </label>
                                <label class="admin-records-field-wide">
                                    {{ $t('Verification video URL') }}
                                    <input v-model.trim="runForm.verification" type="url" :disabled="busy">
                                </label>
                            </div>
                        </section>
                        <section v-else class="admin-records-section">
                            <h2>{{ $t('Level information') }}</h2>
                            <div class="admin-records-fields">
                                <label>
                                    {{ $t('Level name') }}
                                    <input v-model.trim="levelForm.name" required :disabled="busy || !isNewLevel">
                                </label>
                                <label>
                                    {{ $t('Level ID') }}
                                    <input v-model.trim="levelForm.id" type="number" min="1" step="1" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Subtitle') }}
                                    <input v-model="levelForm.subtitle" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Creator') }}
                                    <input v-model.trim="levelForm.author" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verifier') }}
                                    <input v-model.trim="levelForm.verifier" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('AREDL placement') }}
                                    <input v-model.trim="levelForm.aredl" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Verification date') }}
                                    <input v-model="levelForm.verificationDate" type="date" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Qualification percentage') }}
                                    <input v-model="levelForm.percentToQualify" type="number" min="0" max="100" step="any" required :disabled="busy">
                                </label>
                                <label class="admin-records-field-wide">
                                    {{ $t('Verification video URL') }}
                                    <input v-model.trim="levelForm.verification" type="url" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Tags (one per line)') }}
                                    <textarea v-model="levelForm.tagsText" rows="3" :disabled="busy"></textarea>
                                </label>
                                <label>
                                    {{ $t('Gameplay filters (one per line)') }}
                                    <textarea v-model="levelForm.filtersText" rows="3" :disabled="busy"></textarea>
                                </label>
                            </div>
                        </section>

                        <section v-if="selectedCategory !== 'verifications'" class="admin-records-section">
                            <div class="admin-records-section-heading">
                                <h2>{{ $t('Position history') }}</h2>
                                <button class="admin-records-button admin-records-button-secondary" type="button" @click="addHistoryEntry" :disabled="busy">
                                    {{ $t('Add history entry') }}
                                </button>
                            </div>
                            <p class="admin-records-hint">{{ $t('History date format: DD-MM-YYYY.') }}</p>
                            <div v-for="(entry, index) in levelForm.positionHistory" :key="index" class="admin-records-history-entry">
                                <label>
                                    {{ $t('Date') }}
                                    <input v-model.trim="entry.date" placeholder="DD-MM-YYYY" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Position') }}
                                    <input v-model="entry.position" type="number" min="1" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Change') }}
                                    <input v-model="entry.change" type="number" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Reason') }}
                                    <input v-model.trim="entry.reason" :disabled="busy">
                                </label>
                                <button
                                    class="admin-records-button admin-records-button-secondary"
                                    type="button"
                                    :aria-label="$t('Remove history entry')"
                                    @click="removeHistoryEntry(index)"
                                    :disabled="busy"
                                >×</button>
                            </div>
                        </section>

                        <section class="admin-records-records">
                            <h2>{{ $t('Records') }} ({{ currentRecords.length }})</h2>
                            <ul v-if="currentRecords.length">
                                <li v-for="(record, index) in currentRecords" :key="index">
                                    <span>{{ record.user }} — {{ record.percent }}% — {{ record.date }}</span>
                                    <button
                                        class="admin-records-button admin-records-button-secondary"
                                        type="button"
                                        :aria-label="$t('Remove record')"
                                        @click="removeRecord(index)"
                                        :disabled="busy"
                                    >×</button>
                                </li>
                            </ul>
                            <div class="admin-records-record-form">
                                <label>
                                    {{ $t('Player') }}
                                    <input v-model.trim="recordDraft.user" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Percentage') }}
                                    <input v-model="recordDraft.percent" type="number" min="0" max="100" step="any" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Date') }}
                                    <input v-model="recordDraft.date" type="date" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Video link') }}
                                    <input v-model.trim="recordDraft.link" type="text" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Refresh rate (Hz)') }}
                                    <input v-model="recordDraft.hz" type="number" min="1" step="1" :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Phrase (optional)') }}
                                    <input v-model.trim="recordDraft.phrase" :disabled="busy">
                                </label>
                                <label class="admin-records-mobile">
                                    <input v-model="recordDraft.mobile" type="checkbox" :disabled="busy">
                                    {{ $t('Mobile record') }}
                                </label>
                                <button class="admin-records-button admin-records-button-secondary" type="button" @click="addRecord" :disabled="busy">
                                    {{ $t('Add record') }}
                                </button>
                            </div>
                        </section>
                        <button class="admin-records-button" type="submit" :disabled="busy">
                            {{ busy ? $t('Loading...') : $t('Save changes') }}
                        </button>
                    </form>
                    <section v-else class="admin-records-empty">
                        <p>{{ $t('Choose an entry from the list or create a new one.') }}</p>
                    </section>
                    </div>
                </section>

                <p v-if="error" class="admin-records-message admin-records-error" role="alert">{{ error }}</p>
                <p v-if="success" class="admin-records-message admin-records-success" role="status">{{ success }}</p>
            </section>
        </main>
    `,
    data: () => ({
        recordsApiUrl: recordsApiUrl.replace(/\/$/, ''),
        token: sessionStorage.getItem('records-admin-token') || '',
        authorized: Boolean(sessionStorage.getItem('records-admin-token')),
        username: '',
        password: '',
        categories: [
            { id: 'verifications', label: 'Verifications' },
            { id: 'completions', label: 'Completions' },
            { id: 'records', label: 'Records' },
        ],
        selectedCategory: 'verifications',
        levels: [],
        levelEntries: [],
        runEntries: [],
        newLevelRank: 1,
        selectedName: '',
        newLevelName: '',
        levelForm: emptyLevel(),
        runForm: emptyRun(),
        isNewLevel: false,
        busy: false,
        error: '',
        success: '',
        recordDraft: {
            user: '',
            percent: '',
            date: new Date().toISOString().slice(0, 10),
            link: '',
            hz: '',
            phrase: '',
            mobile: false,
        },
    }),
    computed: {
        categoryItems() {
            if (this.selectedCategory === 'verifications') {
                return this.runEntries.map((run, index) => ({
                    path: run.path,
                    name: run.name,
                    rank: index + 1,
                    summary: run.expectedplacement || '',
                }));
            }

            return this.levelEntries
                .filter((level) => level.records.some((record) =>
                    this.selectedCategory === 'completions'
                        ? Number(record.percent) === 100
                        : Number(record.percent) < 100,
                ))
                .map((level) => {
                    const count = level.records.filter((record) =>
                        this.selectedCategory === 'completions'
                            ? Number(record.percent) === 100
                            : Number(record.percent) < 100,
                    ).length;
                    return {
                        path: level.path,
                        name: level.name,
                        rank: level.rank,
                        summary: `${count} ${this.$t('Records').toLowerCase()}`,
                    };
                });
        },
        currentRecords() {
            return this.selectedCategory === 'verifications'
                ? this.runForm.records
                : this.levelForm.records;
        },
    },
    async mounted() {
        try {
            const [levels, runs] = await Promise.all([fetchList(), fetchRuns()]);
            if (!levels || !runs) throw new Error('Failed to load level catalogs');
            this.levelEntries = levels
                .map(([level], index) => level ? { ...level, rank: index + 1 } : null)
                .filter(Boolean);
            this.levels = this.levelEntries.map((level) => level.path);
            this.newLevelRank = this.levelEntries.length + 1;
            this.runEntries = runs.map(([run]) => run).filter(Boolean);
        } catch {
            this.error = this.$t('The level and verification lists could not be loaded.');
        }
    },
    methods: {
        async request(path, options = {}) {
            const headers = new Headers(options.headers || {});
            if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
            if (options.body) headers.set('Content-Type', 'application/json');

            let response;
            try {
                response = await fetch(`${this.recordsApiUrl}${path}`, { ...options, headers });
            } catch {
                throw new Error(this.$t('Unable to contact the records service.'));
            }

            const result = await response.json().catch(() => ({}));
            if (response.status === 401 && path !== '/api/login') {
                this.logout();
                throw new Error(this.$t('Your session has expired. Sign in again.'));
            }
            if (!response.ok) {
                throw new Error(result.error || this.$t('Unable to contact the records service.'));
            }
            return result;
        },
        async login() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const result = await this.request('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ username: this.username, password: this.password }),
                });
                this.token = result.token;
                sessionStorage.setItem('records-admin-token', this.token);
                this.authorized = true;
                this.password = '';
                if (this.categoryItems.length) {
                    await this.selectItem(this.categoryItems[0]);
                }
            } catch (error) {
                this.error = error.message === 'Invalid credentials'
                    ? this.$t('Invalid username or password.')
                    : error.message;
            } finally {
                this.busy = false;
            }
        },
        selectCategory(category) {
            if (!this.categories.some((item) => item.id === category)) return;
            this.selectedCategory = category;
            this.selectedName = '';
            this.levelForm = emptyLevel();
            this.runForm = emptyRun();
            this.isNewLevel = false;
            this.error = '';
            this.success = '';
        },
        async selectItem(item) {
            this.selectedName = item.path;
            await this.loadSelected();
        },
        async loadSelected() {
            if (!this.selectedName) return;
            this.busy = true;
            this.error = '';
            this.success = '';
            this.isNewLevel = false;
            try {
                const path = this.selectedCategory === 'verifications'
                    ? `/data/runs/${encodeURIComponent(this.selectedName)}.json`
                    : `/data/${encodeURIComponent(this.selectedName)}.json`;
                const response = await fetch(path, { cache: 'no-store' });
                if (!response.ok) throw new Error(String(response.status));
                const level = await response.json();
                if (this.selectedCategory === 'verifications') {
                    this.runForm = {
                        ...emptyRun(level.name || this.selectedName),
                        id: level.id == null ? '' : String(level.id),
                        author: level.author || '',
                        expectedplacement: level.expectedplacement || '',
                        verifier: level.verifier || '',
                        verification: level.verification || '',
                        percentToQualify: String(level.percentToQualify ?? '0'),
                        records: Array.isArray(level.records) ? level.records.map((record) => ({ ...record })) : [],
                    };
                } else {
                    this.levelForm = {
                        ...emptyLevel(level.name || this.selectedName),
                        id: level.id == null ? '' : String(level.id),
                        subtitle: level.subtitle ?? '-',
                        author: level.author || '',
                        verifier: level.verifier || '',
                        aredl: level.aredl || '',
                        verificationDate: level.verificationDate || '',
                        tagsText: Array.isArray(level.tags) ? level.tags.join('\n') : '',
                        filtersText: Array.isArray(level.filters) ? level.filters.join('\n') : '',
                        verification: level.verification || '',
                        percentToQualify: String(level.percentToQualify ?? '100'),
                        positionHistory: Array.isArray(level.positionHistory)
                            ? level.positionHistory.map((entry) => ({
                                date: entry.date || '',
                                change: entry.change == null ? '' : String(entry.change),
                                position: entry.position == null ? '' : String(entry.position),
                                reason: entry.reason || '',
                            }))
                            : [],
                        records: Array.isArray(level.records) ? level.records.map((record) => ({ ...record })) : [],
                    };
                }
            } catch {
                this.error = this.$t('Error: {message}', { message: this.selectedName });
                this.selectedName = '';
                this.levelForm = emptyLevel();
                this.runForm = emptyRun();
            } finally {
                this.busy = false;
            }
        },
        createItem() {
            if (this.selectedCategory === 'verifications') {
                this.createRun();
            } else {
                this.createLevel();
            }
        },
        createLevel() {
            const name = this.newLevelName.trim();
            if (!levelNamePattern.test(name)) {
                this.error = this.$t('Enter a level file name using letters, numbers, spaces, apostrophes, underscores or hyphens.');
                this.success = '';
                return;
            }
            if (!Number.isInteger(this.newLevelRank) ||
                this.newLevelRank < 1 ||
                this.newLevelRank > this.levelEntries.length + 1) {
                this.error = this.$t('Enter a valid position in the top.');
                this.success = '';
                return;
            }
            if (this.levels.includes(name)) {
                this.selectedName = name;
                this.loadSelected();
                return;
            }
            this.error = '';
            this.success = '';
            this.isNewLevel = true;
            this.selectedName = name;
            this.levelForm = emptyLevel(name);
            this.runForm = emptyRun();
        },
        createRun() {
            const name = this.newLevelName.trim();
            if (!levelNamePattern.test(name)) {
                this.error = this.$t('Enter a level file name using letters, numbers, spaces, apostrophes, underscores or hyphens.');
                this.success = '';
                return;
            }
            if (this.runEntries.some((run) => run.path === name)) {
                this.selectedName = name;
                this.loadSelected();
                return;
            }
            this.error = '';
            this.success = '';
            this.isNewLevel = true;
            this.selectedName = name;
            this.runForm = emptyRun(name);
            this.levelForm = emptyLevel();
        },
        addRecord() {
            try {
                if (!this.recordDraft.user.trim()) {
                    throw new Error(this.$t('Enter a player name.'));
                }
                if (!this.recordDraft.date || Number.isNaN(Date.parse(this.recordDraft.date))) {
                    throw new Error(this.$t('Enter a valid record date.'));
                }
                if (this.recordDraft.percent === '') {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }
                const percent = Number(this.recordDraft.percent);
                if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }

                const record = {
                    user: this.recordDraft.user,
                    date: this.recordDraft.date,
                    link: this.recordDraft.link || 'No video',
                    percent,
                };
                if (this.recordDraft.hz) record.hz = Number(this.recordDraft.hz);
                if (this.recordDraft.phrase) record.phrase = this.recordDraft.phrase;
                if (this.recordDraft.mobile) record.mobile = true;
                this.currentRecords.push(record);
                this.recordDraft = {
                    user: '',
                    percent: '',
                    date: new Date().toISOString().slice(0, 10),
                    link: '',
                    hz: '',
                    phrase: '',
                    mobile: false,
                };
                this.error = '';
            } catch (error) {
                this.error = error.message;
            }
        },
        removeRecord(index) {
            this.currentRecords.splice(index, 1);
        },
        addHistoryEntry() {
            this.levelForm.positionHistory.push({
                date: '',
                change: '',
                position: '',
                reason: '',
            });
        },
        removeHistoryEntry(index) {
            this.levelForm.positionHistory.splice(index, 1);
        },
        async saveLevel() {
            if (this.selectedCategory === 'verifications') {
                await this.saveRun();
                return;
            }
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const id = Number(this.levelForm.id);
                const percentToQualify = Number(this.levelForm.percentToQualify);
                if (!Number.isSafeInteger(id) || id < 1) {
                    throw new Error(this.$t('Enter a valid numeric level ID.'));
                }
                if (!Number.isFinite(percentToQualify) || percentToQualify < 0 || percentToQualify > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }

                const positionHistory = this.levelForm.positionHistory.map((entry) => ({
                    date: entry.date.trim(),
                    change: entry.change === '' ? null : Number(entry.change),
                    position: Number(entry.position),
                    reason: entry.reason.trim(),
                }));
                if (this.isNewLevel) {
                    positionHistory.push({
                        date: formatHistoryDate(),
                        change: null,
                        position: this.newLevelRank,
                        reason: 'Added to list',
                    });
                }
                const level = {
                    id,
                    name: this.levelForm.name.trim(),
                    subtitle: this.levelForm.subtitle.trim() || '-',
                    author: this.levelForm.author.trim(),
                    verifier: this.levelForm.verifier.trim(),
                    aredl: this.levelForm.aredl.trim(),
                    verificationDate: this.levelForm.verificationDate,
                    tags: this.levelForm.tagsText.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean),
                    filters: this.levelForm.filtersText.split(/\r?\n/).map((filter) => filter.trim()).filter(Boolean),
                    verification: this.levelForm.verification.trim(),
                    percentToQualify: String(percentToQualify),
                    positionHistory,
                    records: this.levelForm.records,
                };
                if (!level.name) throw new Error(this.$t('Enter a level name.'));
                for (const entry of level.positionHistory) {
                    if (!/^\d{2}-\d{2}-\d{4}$/.test(entry.date) ||
                        !Number.isInteger(entry.position) || entry.position < 1 ||
                        (entry.change !== null && !Number.isInteger(entry.change)) ||
                        !entry.reason) {
                        throw new Error(this.$t('Complete each history entry with a date, position and reason.'));
                    }
                }

                const files = [{
                    path: `data/${this.selectedName}.json`,
                    content: JSON.stringify(level, null, 4),
                }];
                const updatedLevels = [...this.levels];
                if (this.isNewLevel) {
                    updatedLevels.splice(this.newLevelRank - 1, 0, this.selectedName);
                }
                if (this.isNewLevel) {
                    files.push({
                        path: 'data/_list.json',
                        content: JSON.stringify(updatedLevels, null, 4),
                    });
                }

                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({ files }),
                });
                this.levels = updatedLevels;
                const entriesByPath = new Map(this.levelEntries.map((entry) => [entry.path, entry]));
                entriesByPath.set(this.selectedName, { ...level, path: this.selectedName });
                this.levelEntries = updatedLevels.map((path, index) => ({
                    ...entriesByPath.get(path),
                    rank: index + 1,
                }));
                this.newLevelRank = this.levelEntries.length + 1;
                this.isNewLevel = false;
                this.success = this.$t('Level saved successfully.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        async saveRun() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const id = Number(this.runForm.id);
                if (!Number.isSafeInteger(id) || id < 1) {
                    throw new Error(this.$t('Enter a valid numeric level ID.'));
                }
                const percentToQualify = Number(this.runForm.percentToQualify);
                if (!Number.isFinite(percentToQualify) || percentToQualify < 0 || percentToQualify > 100) {
                    throw new Error(this.$t('Enter a percentage between 0 and 100.'));
                }
                const run = {
                    id,
                    name: this.runForm.name.trim(),
                    author: this.runForm.author.trim(),
                    expectedplacement: this.runForm.expectedplacement.trim(),
                    verifier: this.runForm.verifier.trim(),
                    verification: this.runForm.verification.trim(),
                    percentToQualify: String(percentToQualify),
                    records: this.runForm.records,
                };
                if (!run.name) throw new Error(this.$t('Enter a level name.'));

                const files = [{
                    path: `data/runs/${this.selectedName}.json`,
                    content: JSON.stringify(run, null, 4),
                }];
                const updatedRuns = this.runEntries.map(({ path }) => path);
                if (this.isNewLevel) {
                    updatedRuns.push(this.selectedName);
                    files.push({
                        path: 'data/runs/_runs.json',
                        content: JSON.stringify(updatedRuns, null, 4),
                    });
                }
                await this.request('/api/files', {
                    method: 'POST',
                    body: JSON.stringify({ files }),
                });
                if (this.isNewLevel) {
                    this.runEntries.push({ ...run, path: this.selectedName, records: run.records });
                } else {
                    const index = this.runEntries.findIndex(({ path }) => path === this.selectedName);
                    if (index >= 0) this.runEntries.splice(index, 1, { ...run, path: this.selectedName });
                }
                this.isNewLevel = false;
                this.success = this.$t('Level saved successfully.');
            } catch (error) {
                this.error = error.message;
            } finally {
                this.busy = false;
            }
        },
        logout() {
            sessionStorage.removeItem('records-admin-token');
            this.token = '';
            this.authorized = false;
            this.password = '';
            this.selectedName = '';
            this.levelForm = emptyLevel();
            this.runForm = emptyRun();
            this.isNewLevel = false;
            this.success = '';
        },
    },
};
