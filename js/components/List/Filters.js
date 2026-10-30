// components/List/Filters.js
//
// Registry of known filters. Order here = order in the filter menu.
//
// You do NOT have to register a filter for it to work: any string you put in a
// level's "filters" array that isn't listed here is created automatically
// (it shows up in the menu after the registered ones, using the text as written).
// Register one here only if you want a nicer display name or a custom order.
//
// In a level's JSON:   "filters": ["wave", "ship", "2.2"]

const filters = [
    // Gamemodes
    { id: "cube", name: "Cube" },
    { id: "ship", name: "Ship" },
    { id: "ball", name: "Ball" },
    { id: "ufo", name: "UFO" },
    { id: "wave", name: "Wave" },
    { id: "robot", name: "Robot" },
    { id: "spider", name: "Spider" },
    { id: "swing", name: "Swing" },
    { id: "duals", name: "Duals" },
    { id: "timings", name: "Timings" },
    { id: "high-cps", name: "High CPS" },
    { id: "slow-paced", name: "Slow Paced" },
    { id: "high-paced", name: "High Paced" },
    { id: "xl", name: "XL" },
    { id: "medium", name: "Medium" },
    { id: "long", name: "Long" },
    { id: "chokepoints", name: "Chokepoints" },
    { id: "gimmicky", name: "Gimmicky" },
    { id: "nerve-control", name: "Nerve Control" },
    { id: "overall", name: "Overall" },
    { id: "learny", name: "Learny" },
    { id: "memory", name: "Memory" },
    { id: "unbalanced", name: "Unbalanced" },
    { id: "clicksync", name: "Clicksync" },
    { id: "unrated", name: "Unrated" },
    { id: "circles", name: "Circles" },

    // Game versions
    { id: "pre-2.1", name: "Pre 2.1" },
    { id: "2.1", name: "2.1" },
    { id: "2.2", name: "2.2" },
];

export default filters;

export function normalizeFilterId(value) {
    return String(value).trim().toLowerCase();
}

// Resolve any filter string to { id, name }, registered or not.
export function resolveFilter(value) {
    const id = normalizeFilterId(value);
    return filters.find((f) => f.id === id) || { id, name: String(value).trim() };
}