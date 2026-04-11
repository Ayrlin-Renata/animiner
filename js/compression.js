/**
 * js/compression.js
 * Utilities for condensing filter state into minimal URL parameters.
 */

const KEY_MAP = {
    searchMode: 'sm',
    targetMatches: 'tm',
    sort: 'st',
    mediaType: 'mt',
    startPage: 'sp',
    rules: 'rl',
    path: 'pt',
    operator: 'op',
    value: 'vl',
    type: 'tp',
    quantifier: 'qn',
    relationTypes: 'rt',
    alias: 'al',
    collapsed: 'cl',
    isOptional: 'io'
};

const REV_KEY_MAP = Object.fromEntries(Object.entries(KEY_MAP).map(([k, v]) => [v, k]));

const OP_MAP = {
    equals: 'e',
    not_equals: 'ne',
    greater_than: 'gt',
    less_than: 'lt',
    between: 'b',
    contains: 'c',
    not_contains: 'nc',
    is: 'i',
    regex_match: 're',
    regex_not_match: 'nre'
};

const REV_OP_MAP = Object.fromEntries(Object.entries(OP_MAP).map(([k, v]) => [v, k]));

const PATH_MAP = {
    'startDate.year': 'sy',
    'startDate': 'sd',
    'endDate.year': 'ey',
    'endDate': 'ed',
    'season': 'sn',
    'seasonYear': 'sn-y',
    'format': 'fm',
    'status': 'st',
    'genres': 'g',
    'tags.name': 'tn',
    'tags.category': 'tc',
    'tags.rank': 'tr',
    'averageScore': 'as',
    'popularity': 'pop',
    'description': 'd',
    'studios.edges.node.name': 'snn',
    'characters.edges.node.name.full': 'cnf',
    'staff.edges.node.name.full': 'vnf',
    'ROOT': '_'
};

const REV_PATH_MAP = Object.fromEntries(Object.entries(PATH_MAP).map(([k, v]) => [v, k]));

/**
 * Compresses a rule object recursively.
 */
function compressRule(rule) {
    const compact = {};
    
    if (rule.type) compact[KEY_MAP.type] = rule.type;
    if (rule.path) compact[KEY_MAP.path] = PATH_MAP[rule.path] || rule.path;
    if (rule.operator) compact[KEY_MAP.operator] = OP_MAP[rule.operator] || rule.operator;
    if (rule.value !== undefined && rule.value !== '') compact[KEY_MAP.value] = rule.value;
    if (rule.quantifier) compact[KEY_MAP.quantifier] = rule.quantifier;
    if (rule.relationTypes) compact[KEY_MAP.relationTypes] = rule.relationTypes;
    if (rule.alias) compact[KEY_MAP.alias] = rule.alias;
    if (rule.collapsed) compact[KEY_MAP.collapsed] = 1;
    if (rule.isOptional) compact[KEY_MAP.isOptional] = 1;
    
    if (rule.rules && rule.rules.length > 0) {
        compact[KEY_MAP.rules] = rule.rules.map(compressRule);
    }
    
    return compact;
}

/**
 * Decompresses a rule object recursively.
 */
function decompressRule(compact) {
    const rule = {};
    
    for (const [key, val] of Object.entries(compact)) {
        const fullKey = REV_KEY_MAP[key];
        if (!fullKey) continue;
        
        let fullVal = val;
        if (fullKey === 'path') fullVal = REV_PATH_MAP[val] || val;
        if (fullKey === 'operator') fullVal = REV_OP_MAP[val] || val;
        if (fullKey === 'rules') fullVal = val.map(decompressRule);
        if (fullKey === 'collapsed') fullVal = !!val;
        if (fullKey === 'isOptional') fullVal = !!val;
        
        rule[fullKey] = fullVal;
    }
    
    return rule;
}

export function compressFilterData(state) {
    const data = {
        [KEY_MAP.searchMode]: state.searchMode,
        [KEY_MAP.targetMatches]: state.targetMatches,
        [KEY_MAP.sort]: state.sort,
        [KEY_MAP.mediaType]: state.mediaType,
        [KEY_MAP.startPage]: state.startPage,
        [KEY_MAP.rules]: state.rules.map(compressRule)
    };
    
    return btoa(encodeURIComponent(JSON.stringify(data)));
}

export function decompressFilterData(encoded) {
    try {
        const compact = JSON.parse(decodeURIComponent(atob(encoded)));
        const state = {};
        
        if (compact[KEY_MAP.searchMode])    state.searchMode = compact[KEY_MAP.searchMode];
        if (compact[KEY_MAP.targetMatches]) state.targetMatches = compact[KEY_MAP.targetMatches];
        if (compact[KEY_MAP.sort])          state.sort = compact[KEY_MAP.sort];
        if (compact[KEY_MAP.mediaType])     state.mediaType = compact[KEY_MAP.mediaType];
        if (compact[KEY_MAP.startPage])     state.startPage = compact[KEY_MAP.startPage];
        if (compact[KEY_MAP.rules])         state.rules = compact[KEY_MAP.rules].map(decompressRule);
        
        return state;
    } catch (e) {
        console.error('Failed to decompress filter data', e);
        return null;
    }
}
