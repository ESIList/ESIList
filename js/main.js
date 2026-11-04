import routes from './routes.js';

const themes = [
    { id: 'violet', name: 'Violet', hue: 270, shade: 20 },
    { id: 'ocean', name: 'Ocean', hue: 198, shade: 5 },
    { id: 'forest', name: 'Forest', hue: 132, shade: 5 },
    { id: 'sunset', name: 'Sunset', hue: 20, shade: 5 },
    { id: 'rose', name: 'Rose', hue: 338, shade: 5 },
    { id: 'amber', name: 'Amber', hue: 38, shade: 5 },
    { id: 'arctic', name: 'Arctic', hue: 183, shade: 5 },
    { id: 'midnight', name: 'Midnight', hue: 236, shade: 96 },
    { id: 'graphite', name: 'Graphite', hue: 210, shade: 94 },
    { id: 'custom', name: 'Custom' },
];

const savedTheme = localStorage.getItem('theme');
const legacyDark = JSON.parse(localStorage.getItem('dark') || 'false');
const initialTheme = themes.some(({ id }) => id === savedTheme)
    ? savedTheme
    : legacyDark
        ? 'midnight'
        : 'violet';
const initialThemePreset = themes.find(({ id }) => id === initialTheme);

document.body.dataset.theme = initialTheme;

function boundedNumber(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function applyCustomTheme(hue, shade) {
    const backgroundLightness = 98 - shade * 0.84;
    const isDark = backgroundLightness < 50;
    const foreground = isDark ? '#f5f3fa' : '#1c1722';
    const surfaceLightness = Math.min(98, backgroundLightness + (isDark ? 6 : -5));
    const hoverLightness = Math.min(98, backgroundLightness + (isDark ? 11 : -10));
    const accentLightness = isDark ? 66 : 40;
    const color = (lightness, saturation = 28) => `hsl(${hue} ${saturation}% ${lightness}%)`;
    const variables = {
        '--custom-background': color(backgroundLightness),
        '--custom-on-background': foreground,
        '--custom-background-hover': color(hoverLightness),
        '--custom-on-background-hover': foreground,
        '--custom-primary': color(accentLightness, 70),
        '--custom-primary-disabled': color(32, 45),
        '--custom-on-primary': isDark ? '#17151c' : '#ffffff',
        '--custom-scrollbar-thumb': color(isDark ? 48 : 68, 16),
        '--custom-scrollbar-track': color(surfaceLightness),
        '--custom-surface': color(surfaceLightness),
        '--custom-on-surface': foreground,
        '--custom-surface-hover': color(hoverLightness),
        '--custom-on-surface-hover': foreground,
        '--custom-hue': hue,
        '--custom-accent': color(accentLightness, 70),
    };

    for (const [name, value] of Object.entries(variables)) {
        document.body.style.setProperty(name, value);
    }

    document.body.dataset.themeDark = String(isDark);
    return isDark;
}

const initialHue = boundedNumber(
    initialTheme === 'custom' ? localStorage.getItem('custom-theme-hue') : initialThemePreset?.hue,
    270,
    0,
    360,
);
const initialShade = boundedNumber(
    initialTheme === 'custom' ? localStorage.getItem('custom-theme-shade') : initialThemePreset?.shade,
    20,
    0,
    100,
);
if (initialTheme === 'custom') applyCustomTheme(initialHue, initialShade);

export const store = Vue.reactive({
    themes,
    theme: initialTheme,
    customHue: initialHue,
    customShade: initialShade,
    get dark() {
        return ['midnight', 'graphite'].includes(this.theme) ||
            (this.theme === 'custom' && 98 - this.customShade * 0.84 < 50);
    },
    setTheme(themeId) {
        const selectedTheme = themes.find(({ id }) => id === themeId);
        if (!selectedTheme) return;
        this.theme = themeId;
        document.body.dataset.theme = themeId;
        if (themeId === 'custom') {
            this.customShade = Math.max(0, Math.min(100, this.customShade));
            applyCustomTheme(this.customHue, this.customShade);
        } else {
            this.customHue = selectedTheme.hue;
            this.customShade = selectedTheme.shade;
            localStorage.setItem('custom-theme-hue', String(this.customHue));
            localStorage.setItem('custom-theme-shade', String(this.customShade));
            document.body.dataset.themeDark = String(this.dark);
        }
        localStorage.setItem('theme', themeId);
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    toggleDark() {
        this.customShade = this.dark ? 5 : 96;
        this.setTheme('custom');
    },
    updateCustomTheme(property, value) {
        if (property === 'hue') {
            this.customHue = boundedNumber(value, this.customHue, 0, 360);
            localStorage.setItem('custom-theme-hue', String(this.customHue));
        } else if (property === 'shade') {
            this.customShade = boundedNumber(value, this.customShade, 0, 100);
            localStorage.setItem('custom-theme-shade', String(this.customShade));
        } else {
            return;
        }

        this.setTheme('custom');
    },

    // 🆕 holds the ID of a level selected from another page
    selectedLevelId: null,
});

const app = Vue.createApp({
    data: () => ({ store }),
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);
app.mount('#app');
