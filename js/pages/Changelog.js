export default {
  name: "ChangelogPage",
  data() {
    return {
      communityChangelog: [],
      changelog: [],
    };
  },
  computed: {
    displayedChangelog() {
      return [...this.communityChangelog, ...this.changelog].sort((left, right) => {
        const parseDate = (value) => {
          const [day, month, year] = value.split("-").map(Number);
          return Date.UTC(year, month - 1, day);
        };
        return parseDate(right.date) - parseDate(left.date);
      });
    },
  },
  async mounted() {
    try {
      const response = await fetch("/data/_changelog.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Changelog returned ${response.status}.`);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("Changelog data must be an array.");
      this.communityChangelog = entries.map((entry) => ({
        ...entry,
        message: entry.message.split(/\r?\n/).map((line) => line.trim()).join("<br>"),
      }));
    } catch (error) {
      console.error("Failed to load community changelog entries.", error);
    }
  },
  template: `
    <main class="page-changelog-container">
      <div class="page-changelog">
        <div class="changelog-container">
          <div
            v-for="(entry, index) in displayedChangelog"
            :key="entry.date + entry.message + index"
            :class="['changelog-entry', { featured: entry.featured }]"
          >
            <p class="type-label-lg changelog-date">{{ entry.date }}</p>
            <p class="changelog-message" v-html="localizedMessage(entry.message)"></p>
          </div>
        </div>
      </div>
    </main>
  `,
  methods: {
    localizedMessage(message) {
      return message
        .split(/(<br\s*\/?>)/i)
        .map((part) => {
          if (/^<br\s*\/?>$/i.test(part)) return part;
          const text = part.trim();
          if (!text) return part;
          const translated = this.$t(text);
          if (translated !== text) return this.escapeHtml(translated);

          const placement = text.match(/^• Placed (.+) at \(#(\d+)\), above (.+) and below (.+)\.$/);
          if (placement && document.documentElement.lang === "es") {
            return this.escapeHtml(`• ${placement[1]} se colocó en el puesto #${placement[2]}, por encima de ${placement[3]} y por debajo de ${placement[4]}.`);
          }

          return this.escapeHtml(translated !== text ? translated : text);
        })
        .join("");
    },
    escapeHtml(value) {
      return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]);
    },
  },
};
