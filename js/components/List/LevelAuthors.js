export default {
    props: {
        author: {
            type: String,
            required: true,
        },
        verifier: {
            type: String,
            required: true,
        },
    },
    template: `
        <div class="level-authors">
            <template v-if="author === verifier">
                <div class="type-title-sm">{{ $t('Creator & Verifier') }}</div>
                <p class="type-body">
                    <router-link
                        :to="{ path: '/leaderboard', query: { player: verifier } }"
                        class="verifier-link"
                    >
                        {{ author }}
                    </router-link>
                </p>
            </template>

            <template v-else>
                <div class="type-title-sm">{{ $t('Creator') }}</div>
                <p class="type-body">
                    <span>{{ author }}</span>
                </p>

                <div class="type-title-sm">{{ $t('Verifier') }}</div>
                <p class="type-body">
                    <router-link
                        :to="{ path: '/leaderboard', query: { player: verifier } }"
                        class="verifier-link"
                    >
                        {{ verifier }}
                    </router-link>
                </p>
            </template>
        </div>
    `,
};
