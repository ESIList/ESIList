export default {
  name: "ChangelogPage",
  data() {
    return {
      changelog: [
        {
          date: "9-02-2026",
          message: `
            • Leyak has been placed at #6, between Troll Level and Acu.<br>
            • Future Funk III has been placed at #10, between Future Funk II and Super Mario Wave.<br>
            • Super Mario Wave has been placed at #11, between Future Funk III and Game Time.<br>
          `,
          featured: true,
        },
        {
          date: "23-10-2026",
          message: `
            • Initial release of ESIList v1.0<br>
            • Added levels to the list:<br>
            (#1) NOMAD<br>
            (#2) Rauchkammer<br>
          `,
          featured: true,
        },
      ],
    };
  },
  template: `
    <main class="page-changelog-container">
      <div class="page-changelog">
        <div class="changelog-container">
          <div
            v-for="(entry, index) in changelog"
            :key="index"
            :class="['changelog-entry', { featured: entry.featured }]"
          >
            <p class="type-label-lg changelog-date">{{ entry.date }}</p>
            <p class="changelog-message" v-html="entry.message"></p>
          </div>
        </div>
      </div>
    </main>
  `,
};
