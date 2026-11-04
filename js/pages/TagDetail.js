import { store } from "../main.js";
import { fetchList } from "../content.js";
import tags from "../components/List/Tags.js";
import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";
import { score } from "../score.js";

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="page-tag-detail-container">
            <Spinner />
        </main>

        <main v-else class="page-tag-detail-container">
            <div class="page-tag-detail" :style="{ backgroundColor: tag?.color || 'var(--color-primary)' }">
                <button @click="goBack" class="back-button">&larr; {{ $t('Back') }}</button>
                
                <h1 class="tag-title">{{ $t(tag?.name || '') }}</h1>
                
                <div class="tag-info-cards">
                    <p class="tag-desc">• {{ $t('Description') }}: {{ $t(tag?.description || '') }}
                    <p v-if="tag.bonusEnabled && bonusScore > 0" class="tag-bonus">
                        🏅 {{ $t('Bonus reward for completing all levels with this tag:') }}
                        <strong>+{{ bonusScore.toFixed(3) }}</strong> {{ $t('points') }}
                    </p>
                </div>

                <section class="levels-container">
                    <h2>• {{ $t('Levels with this tag:') }}</h2>
                    <table class="list tag-detail-list">
                        <tbody>
                            <tr v-for="level in levelsWithTag" :key="level.id">
                                <td class="level">
                                    <button @click="selectLevel(level)" class="list-level-btn">
                                        <span v-if="level.rank">#{{ level.rank }} – </span>{{ level.name }} {{ $t('by') }} {{ level.author }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </div>
        </main>
    `,
    data: () => ({
        loading: true,
        list: [],
        levelsWithTag: [],
        tag: null,
        bonusScore: 0,
    }),
    async mounted() {
        const tagId = this.$route.params.tagId;
        this.list = await fetchList();

        this.tag = tags.find(t =>
            t.id.toLowerCase() === String(tagId).toLowerCase() ||
            t.name.toLowerCase() === String(tagId).toLowerCase()
        );

        if (this.tag && this.list) {
            this.levelsWithTag = this.list
                .map(([level], rank) => ({
                    ...level,
                    rank: rank + 1,
                }))
                .filter(level =>
                    Array.isArray(level.tags) && level.tags.some(t =>
                        String(t).toLowerCase() === this.tag.id.toLowerCase() ||
                        String(t).toLowerCase() === this.tag.name.toLowerCase()
                    )
                );

            if (this.tag.bonusEnabled && this.levelsWithTag.length > 0) {
                const totalLevelScore = this.levelsWithTag.reduce((sum, level) => {
                    return sum + score(level.rank, 100, level.percentToQualify || 50);
                }, 0);

                const averageLevelScore = totalLevelScore / (this.levelsWithTag.length * 2);
                this.bonusScore = Math.round(averageLevelScore * 1000) / 1000;
            }
        } else {
            this.levelsWithTag = [];
        }

        this.loading = false;
    },
    methods: {
        goBack() {
            this.$router.push("/tags");
        },
        selectLevel(level) {
            store.selectedLevelId = level.id;
            this.$router.push("/");
        }
    }
};
