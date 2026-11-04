import { recordsApiUrl } from '../admin/config.js';

const levelNamePattern = /^[A-Za-z0-9][A-Za-z0-9 _'-]{0,99}$/;

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
                    <div class="admin-records-controls">
                        <label>
                            {{ $t('Choose a level') }}
                            <select v-model="selectedName" @change="loadLevel" :disabled="busy">
                                <option value="">{{ $t('Choose a level') }}</option>
                                <option v-for="name in levels" :key="name" :value="name">{{ name }}</option>
                            </select>
                        </label>
                        <form class="admin-records-create" @submit.prevent="createLevel">
                            <label>
                                {{ $t('Level file name') }}
                                <input v-model.trim="newLevelName" maxlength="100" :disabled="busy">
                            </label>
                            <button class="admin-records-button admin-records-button-secondary" type="submit" :disabled="busy">
                                {{ $t('Create level') }}
                            </button>
                            <small>{{ $t('Create a new level file and add it to the end of the list.') }}</small>
                        </form>
                    </div>

                    <div v-if="selectedName" class="admin-records-json">
                        <div class="admin-records-json-heading">
                            <label for="level-json">{{ $t('JSON editor') }}</label>
                            <button class="admin-records-button admin-records-button-secondary" type="button" @click="formatJson" :disabled="busy">
                                {{ $t('Format JSON') }}
                            </button>
                        </div>
                        <p class="admin-records-hint">{{ $t('Edit the complete level JSON, including its records array.') }}</p>
                        <textarea id="level-json" v-model="jsonText" spellcheck="false" :disabled="busy"></textarea>
                        <section class="admin-records-records">
                            <h2>{{ $t('Records') }} ({{ records.length }})</h2>
                            <ul v-if="records.length">
                                <li v-for="(record, index) in records" :key="index">
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
                            <form class="admin-records-record-form" @submit.prevent="addRecord">
                                <label>
                                    {{ $t('Player') }}
                                    <input v-model.trim="recordDraft.user" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Percentage') }}
                                    <input v-model="recordDraft.percent" type="number" min="0" max="100" step="any" required :disabled="busy">
                                </label>
                                <label>
                                    {{ $t('Date') }}
                                    <input v-model="recordDraft.date" type="date" required :disabled="busy">
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
                                <button class="admin-records-button admin-records-button-secondary" type="submit" :disabled="busy">
                                    {{ $t('Add record') }}
                                </button>
                            </form>
                        </section>
                        <button class="admin-records-button" type="button" @click="saveLevel" :disabled="busy || !jsonText">
                            {{ busy ? $t('Loading...') : $t('Save changes') }}
                        </button>
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
        levels: [],
        selectedName: '',
        newLevelName: '',
        jsonText: '',
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
        records() {
            try {
                const level = JSON.parse(this.jsonText);
                return Array.isArray(level.records) ? level.records : [];
            } catch {
                return [];
            }
        },
    },
    async mounted() {
        try {
            const response = await fetch('/data/_list.json', { cache: 'no-store' });
            if (!response.ok) throw new Error(String(response.status));
            const levels = await response.json();
            if (!Array.isArray(levels) || !levels.every((name) => typeof name === 'string')) {
                throw new Error('Invalid level list');
            }
            this.levels = levels;
        } catch {
            this.error = this.$t('The level list could not be loaded.');
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
                if (this.levels.length) {
                    this.selectedName = this.levels[0];
                    await this.loadLevel();
                }
            } catch (error) {
                this.error = error.message === 'Invalid credentials'
                    ? this.$t('Invalid username or password.')
                    : error.message;
            } finally {
                this.busy = false;
            }
        },
        async loadLevel() {
            if (!this.selectedName) return;
            this.busy = true;
            this.error = '';
            this.success = '';
            this.isNewLevel = false;
            try {
                const response = await fetch(`/data/${encodeURIComponent(this.selectedName)}.json`, { cache: 'no-store' });
                if (!response.ok) throw new Error(String(response.status));
                this.jsonText = JSON.stringify(await response.json(), null, 4);
            } catch {
                this.error = this.$t('Error: {message}', { message: this.selectedName });
                this.selectedName = '';
                this.jsonText = '';
            } finally {
                this.busy = false;
            }
        },
        createLevel() {
            const name = this.newLevelName.trim();
            if (!levelNamePattern.test(name)) {
                this.error = this.$t('Enter a level file name using letters, numbers, spaces, apostrophes, underscores or hyphens.');
                this.success = '';
                return;
            }
            if (this.levels.includes(name)) {
                this.selectedName = name;
                this.loadLevel();
                return;
            }
            this.error = '';
            this.success = '';
            this.isNewLevel = true;
            this.selectedName = name;
            this.jsonText = JSON.stringify({ name, records: [] }, null, 4);
        },
        formatJson() {
            try {
                this.jsonText = JSON.stringify(JSON.parse(this.jsonText), null, 4);
                this.error = '';
            } catch (error) {
                this.error = this.$t('Error: {message}', { message: error.message });
            }
        },
        addRecord() {
            try {
                const level = JSON.parse(this.jsonText);
                if (!level || Array.isArray(level) || !Array.isArray(level.records)) {
                    throw new Error(this.$t('The JSON must be an object with a name and a records array.'));
                }
                const percent = Number(this.recordDraft.percent);
                if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
                    throw new Error(this.$t('The JSON must be an object with a name and a records array.'));
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
                level.records.push(record);
                this.jsonText = JSON.stringify(level, null, 4);
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
            try {
                const level = JSON.parse(this.jsonText);
                if (!Array.isArray(level.records)) {
                    throw new Error(this.$t('The JSON must be an object with a name and a records array.'));
                }
                level.records.splice(index, 1);
                this.jsonText = JSON.stringify(level, null, 4);
                this.error = '';
            } catch (error) {
                this.error = error.message;
            }
        },
        async saveLevel() {
            this.busy = true;
            this.error = '';
            this.success = '';
            try {
                const level = JSON.parse(this.jsonText);
                if (!level || Array.isArray(level) || typeof level !== 'object' ||
                    typeof level.name !== 'string' || !Array.isArray(level.records)) {
                    throw new Error(this.$t('The JSON must be an object with a name and a records array.'));
                }

                const files = [{
                    path: `data/${this.selectedName}.json`,
                    content: JSON.stringify(level, null, 4),
                }];
                const updatedLevels = this.isNewLevel ? [...this.levels, this.selectedName] : this.levels;
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
                this.isNewLevel = false;
                this.jsonText = JSON.stringify(level, null, 4);
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
            this.jsonText = '';
            this.isNewLevel = false;
            this.success = '';
        },
    },
};
