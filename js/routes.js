import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Changelog from './pages/Changelog.js';
import Runs from './pages/Runs.js';
import Tags from './pages/Tags.js';
import TagDetail from './pages/TagDetail.js';
import Comparator from './pages/Comparator.js';

export default [
    { path: '/', component: List },
    { path: '/compare', component: Comparator },
    { path: '/runs', component: Runs },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/changelog', component: Changelog },
    { path: '/tags', component: Tags },
    { path: '/tags/:tagId', component: TagDetail },
];
