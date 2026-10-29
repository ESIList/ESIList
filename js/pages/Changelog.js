export default {
  name: "ChangelogPage",
  data() {
    return {
      changelog: [
        {
          date: "29-10-2026",
          message: `
            • Release of ESIList v1.3<br>
            • The leaderboard page now shows the player's phrases under each verification, completion and progress.
          `,
          featured: true,
        },
        {
          date: "28-10-2026",
          message: `
            • Release of ESIList v1.2<br>
            • The domain has been indexed and the page is accesible on Google by the name "ESIList".
          `,
          featured: true,
        },
        {
          date: "27-10-2026",
          message: `
            • Release of ESIList v1.1<br>
            • Added the position history to all levels.
            • Fixed that clicking on a verifier's name would take you to the global graph instead of their leaderboard page.
            • Fixed that clicking on a record's profile icon would take you to the global graph instead of their leaderboard page.
          `,
          featured: true,
        },
        {
          date: "26-10-2026",
          message: `
            • Initial release of ESIList v1.0<br>
            • Added levels to the list:<br>
              (#1) NOMAD<br>
              (#2) TARTARUS<br>
              (#3) ORDINARY<br>
              (#4) VERDANT LANDSCAPE<br>
              (#5) BPATA MPAKA<br>
              (#6) IN THIS<br>
              (#7) LEVIGO<br>
              (#8) ZODIAC<br>
              (#9) RUST<br>
              (#10) NHELV<br>
              (#11) SHARDSCAPES<br>
              (#12) SPECTRUM CYCLONE<br>
              (#13) CONGREGATION<br>
              (#14) YATAGARASU<br>
              (#15) LUMINA<br>
              (#16) XO<br>
              (#17) SONIC WAVE<br>
              (#18) SONIC WAVE REBIRTH<br>
              (#19) SUNSET SANDSTORM<br>
              (#20) FIREPOWER<br>
              (#21) APOLLO 11<br>
              (#22) KILLBOT<br>
              (#23) BLACK BLIZZARD<br>
              (#24) DELTA INTERFACE<br>
              (#25) ARTIFICIAL ASCENT<br>
              (#26) STATIC IGNITION<br>
              (#27) QUANTUM PROCESSING<br>
              (#28) ANOXYSM<br>
              (#29) ATHANATOS<br>
              (#30) COOLIE MAZIE PALOOZI<br>
              (#31) BOOGIE<br>
              (#32) CARCANO<br>
              (#33) BLADE OF JUSTICE<br>
              (#34) TURBULENT VALLEY<br>
              (#35) PRISMATIC HAZE<br>
              (#36) BLOODBATH<br>
              (#37) AUDITORY BREAKER<br>
              (#38) CALLISTO<br>
              (#39) HEARTBEAT<br>
              (#40) BETRAYAL OF FATE<br>
              (#41) SNOWFALL STORM<br>
              (#42) OVERTIME<br>
              (#43) EVIL INSIDE<br>
              (#44) GALAXY GAS<br>
              (#45) CHOPSTEP<br>
              (#46) AFTERMATH<br>
              (#47) IDOLS<br>
              (#48) TORSION<br>
              (#49) STARBREAKER<br>
              (#50) MAYBE POSSIBLY THING<br>
              (#51) MASMECRESCENT<br>
              (#52) GLIDE<br>
              (#53) SUBVERSIVE<br>
              (#54) THE ULTIMATE PHASE<br>
              (#55) ANOTHER PHASE<br>
              (#56) REVERENCE<br>
              (#57) FEXTY<br>
              (#58) FALLING UP<br>
              (#59) DORADURA<br>
              (#60) CROWD CONTROL<br>
              (#61) FISH FISH GODMODE<br>
              (#62) BROKEN SIGNAL<br>
              (#63) DISMAL DUSTSTORM<br>
              (#64) PUMPED UP KICKS<br>
              (#65) BREAKOUT<br>
              (#66) REANIMATE<br>
              (#67) TROLLMACHINE<br>
              (#68) I NEVER DREAM<br>
              (#69) VOIDED<br>
              (#70) THE FLAWLESS<br>
              (#71) ALLEGIANCE<br>
              (#72) HYPERSONIC<br>
              (#73) HYDRATIC<br>
              (#74) MELTDOWN<br>
              (#75) HELIOS<br>
              (#76) ROBOTCHIEF EXPOSAL<br>
              (#77) MAKE IT DROP<br>
              (#78) PROTEUS<br>
              (#79) JRJRJR<br>
              (#80) FINKOR<br>
              (#81) RETENTION<br>
              (#82) LOST LOVE<br>
              (#83) DARK ODYSSEY<br>
              (#84) NAPALM<br>
              (#85) MYOCARDIA<br>
              (#86) HURRICANE<br>
              (#87) FORBIDDEN ISLE<br>
              (#88) PLASMATIC<br>
              (#89) REDEMPTION<br>
              (#90) CYBERSONIC<br>
              (#91) MY WORST LEVEL<br>
              (#92) HEATSEEKER<br>
              (#93) VERISIMILITUDE<br>
              (#94) PHANTASMAGORIA<br>
              (#95) COSMIC WAR<br>
              (#96) CATACLYSM<br>
              (#97) TANTRUM<br>
              (#98) THE WINGED SWORD<br>
              (#99) MISTY MOUNTAINS<br>
              (#100) BRIMTANIC PARADISE<br>
              (#101) AZURITE<br>
              (#102) WITHOUT U<br>
              (#103) BUNNIES I GUESS<br>
              (#104) MIZURETA<br>
              (#105) NIWA<br>
              (#106) TROLL LEVEL<br>
              (#107) ACU<br>
              (#108) RAFF X<br>
              (#109) RAUCHKAMMER<br>
              (#110) PRECIPITANCE<br>
              (#111) GLISTEN<br>
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
