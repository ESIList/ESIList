export default {
  name: "ChangelogPage",
  data() {
    return {
      changelog: [
                {
          date: "26-10-2026",
          message: `
            • Release of ESIList v1.1<br>
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
              (#38) HEARTBEAT<br>
              (#39) BETRAYAL OF FATE<br>
              (#40) SNOWFALL STORM<br>
              (#41) OVERTIME<br>
              (#42) EVIL INSIDE<br>
              (#43) GALAXY GAS<br>
              (#44) CHOPSTEP<br>
              (#45) AFTERMATH<br>
              (#46) IDOLS<br>
              (#47) TORSION<br>
              (#48) STARBREAKER<br>
              (#49) MAYBE POSSIBLY THING<br>
              (#50) MASMECRESCENT<br>
              (#51) GLIDE<br>
              (#52) SUBVERSIVE<br>
              (#53) THE ULTIMATE PHASE<br>
              (#54) ANOTHER PHASE<br>
              (#55) REVERENCE<br>
              (#56) FEXTY<br>
              (#57) FALLING UP<br>
              (#58) DORADURA<br>
              (#59) CROWD CONTROL<br>
              (#60) FISH FISH GODMODE<br>
              (#61) BROKEN SIGNAL<br>
              (#62) DISMAL DUSTSTORM<br>
              (#63) PUMPED UP KICKS<br>
              (#64) BREAKOUT<br>
              (#65) REANIMATE<br>
              (#66) TROLLMACHINE<br>
              (#67) I NEVER DREAM<br>
              (#68) VOIDED<br>
              (#69) THE FLAWLESS<br>
              (#70) ALLEGIANCE<br>
              (#71) HYPERSONIC<br>
              (#72) HYDRATIC<br>
              (#73) MELTDOWN<br>
              (#74) HELIOS<br>
              (#75) ROBOTCHIEF EXPOSAL<br>
              (#76) MAKE IT DROP<br>
              (#77) PROTEUS<br>
              (#78) JRJRJR<br>
              (#79) FINKOR<br>
              (#80) RETENTION<br>
              (#81) LOST LOVE<br>
              (#82) DARK ODYSSEY<br>
              (#83) NAPALM<br>
              (#84) MYOCARDIA<br>
              (#85) HURRICANE<br>
              (#86) FORBIDDEN ISLE<br>
              (#87) PLASMATIC<br>
              (#88) REDEMPTION<br>
              (#89) CYBERSONIC<br>
              (#90) MY WORST LEVEL<br>
              (#91) HEATSEEKER<br>
              (#92) VERISIMILITUDE<br>
              (#93) PHANTASMAGORIA<br>
              (#94) COSMIC WAR<br>
              (#95) CATACLYSM<br>
              (#96) TANTRUM<br>
              (#97) THE WINGED SWORD<br>
              (#98) MISTY MOUNTAINS<br>
              (#99) BRIMTANIC PARADISE<br>
              (#100) AZURITE<br>
              (#101) WITHOUT U<br>
              (#102) BUNNIES I GUESS<br>
              (#103) MIZURETA<br>
              (#104) NIWA<br>
              (#105) TROLL LEVEL<br>
              (#106) ACU<br>
              (#107) RAUCHKAMMER<br>
              (#108) PRECIPITANCE<br>
              (#109) GLISTEN<br>
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
