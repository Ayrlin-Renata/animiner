/**
 * filter.js
 * Core logic for evaluating recursive constraints on AniList objects.
 * Supports path traversal for nested arrays (e.g. studios.edges.node.name).
 */

import { state } from './state.js';

export const FIELD_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    COLLECTION: 'collection',
    BOOLEAN: 'boolean',
    ENUM: 'enum',
    LIST: 'list'
};

export const GROUP_TYPES = {
    ANY: 'ANY',
    ALL: 'ALL',
    NONE: 'NONE'
};

export const RELATION_TYPES = [
    'ANY',
    'ADAPTATION',
    'PREQUEL',
    'SEQUEL',
    'PARENT',
    'SIDE_STORY',
    'CHARACTER',
    'SUMMARY',
    'ALTERNATIVE',
    'SPIN_OFF',
    'OTHER',
    'SOURCE',
    'COMPILATION',
    'CONTAINS'
];

// Fields available on relation nodes (subset of full media fields)
export const RELATION_FIELDS = [
    { label: 'ID', path: 'id', type: 'number' },
    { label: 'Title', path: 'title.romaji', type: 'string' },
    { label: 'Format', path: 'format', type: 'enum', options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
    { label: 'Type', path: 'type', type: 'enum', options: ['ANIME', 'MANGA'] },
    { label: 'Status', path: 'status', type: 'enum', options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
    { label: 'Genre', path: 'genres', type: 'collection', seenKey: 'genres' },
    { label: 'Tag Name', path: 'tags.name', type: 'collection', seenKey: 'tags' },
    { label: 'Tag Category', path: 'tags.category', type: 'collection' },
    { label: 'Average Score', path: 'averageScore', type: 'number' },
    { label: 'Popularity', path: 'popularity', type: 'number' },
    { label: 'Start Year', path: 'startDate.year', type: 'number' },
];

export const COLLECTION_PATHS = {
    CHARACTERS: 'characters.edges',
    STAFF: 'staff.edges',
    STUDIOS: 'studios.edges',
    LOGIC: 'ROOT' // Special path for manual boolean logic
};

export const RECURSIVE_CATEGORIES = {
    IDENTIFIERS: 'Identifiers',
    TIMELINE: 'Timeline',
    FORMATS: 'Formats & Status',
    CONTENT: 'Content',
    METRICS: 'Metrics & Users',
    STUDIO: 'Studio',
    CHARACTER: 'Character',
    STAFF: 'Staff',
    USER: 'User'
};

// Map used to decide which category to show in the UI builder.
export const SEARCH_MODE_CATEGORIES = {
    MEDIA: [
        RECURSIVE_CATEGORIES.IDENTIFIERS,
        RECURSIVE_CATEGORIES.TIMELINE,
        RECURSIVE_CATEGORIES.FORMATS,
        RECURSIVE_CATEGORIES.CONTENT,
        RECURSIVE_CATEGORIES.METRICS,
        RECURSIVE_CATEGORIES.STUDIO,
        RECURSIVE_CATEGORIES.CHARACTER,
        RECURSIVE_CATEGORIES.STAFF,
    ],
    CHARACTER: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.CHARACTER],
    STAFF: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.STAFF],
    STUDIO: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.STUDIO],
    USER: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.USER],
};

export const FIELDS = {
    [RECURSIVE_CATEGORIES.IDENTIFIERS]: [
        { label: 'AL ID', path: 'id', type: FIELD_TYPES.NUMBER },
        { label: 'MAL ID', path: 'idMal', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.TIMELINE]: [
        { label: 'Start Year', path: 'startDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'Start Date', path: 'startDate', type: FIELD_TYPES.NUMBER },
        { label: 'End Year', path: 'endDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'End Date', path: 'endDate', type: FIELD_TYPES.NUMBER },
        { label: 'Season', path: 'season', type: FIELD_TYPES.ENUM, options: ['WINTER', 'SPRING', 'SUMMER', 'FALL'] },
        { label: 'Season Year', path: 'seasonYear', type: FIELD_TYPES.NUMBER },
        { label: 'Airing At', path: 'airingAt', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.FORMATS]: [
        { label: 'Type', path: 'type', type: FIELD_TYPES.ENUM, options: ['ANIME', 'MANGA'] },
        { label: 'Format', path: 'format', type: FIELD_TYPES.ENUM, options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
        { label: 'Status', path: 'status', type: FIELD_TYPES.ENUM, options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
        { label: 'Source', path: 'source', type: FIELD_TYPES.ENUM, options: ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER', 'NOVEL', 'DOUJINSHI', 'ANIME', 'WEB_NOVEL', 'LIVE_ACTION', 'GAME', 'COMIC', 'MULTIMEDIA_PROJECT', 'PICTURE_BOOK'] },
        { label: 'Country', path: 'countryOfOrigin', type: FIELD_TYPES.STRING },
        { label: 'Is Adult', path: 'isAdult', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Licensed', path: 'isLicensed', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Locked', path: 'isLocked', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN }
    ],
    [RECURSIVE_CATEGORIES.CONTENT]: [
        { label: 'Episodes', path: 'episodes', type: FIELD_TYPES.NUMBER },
        { label: 'Duration', path: 'duration', type: FIELD_TYPES.NUMBER },
        { label: 'Chapters', path: 'chapters', type: FIELD_TYPES.NUMBER },
        { label: 'Volumes', path: 'volumes', type: FIELD_TYPES.NUMBER },
        { label: 'Genres', path: 'genres', type: FIELD_TYPES.COLLECTION, seenKey: 'genres' },
        { label: 'Tag Name', path: 'tags.name', type: FIELD_TYPES.COLLECTION, seenKey: 'tags' },
        { label: 'Tag Category', path: 'tags.category', type: FIELD_TYPES.COLLECTION },
        { label: 'Min Tag Rank', path: 'tags.rank', type: FIELD_TYPES.NUMBER },
        { label: 'Synonyms', path: 'synonyms', type: FIELD_TYPES.COLLECTION },
        { label: 'Hashtag', path: 'hashtag', type: FIELD_TYPES.STRING },
        { label: 'Description', path: 'description', type: FIELD_TYPES.STRING }
    ],
    [RECURSIVE_CATEGORIES.METRICS]: [
        { label: 'Average Score', path: 'averageScore', type: FIELD_TYPES.NUMBER },
        { label: 'Mean Score', path: 'meanScore', type: FIELD_TYPES.NUMBER },
        { label: 'Popularity', path: 'popularity', type: FIELD_TYPES.NUMBER },
        { label: 'Trending', path: 'trending', type: FIELD_TYPES.NUMBER },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'On List', path: 'onList', type: FIELD_TYPES.BOOLEAN },
        { label: 'Licensed By', path: 'licensedBy', type: FIELD_TYPES.COLLECTION }
    ],
    [RECURSIVE_CATEGORIES.STUDIO]: [
        { label: 'Studio Name', path: 'studios.edges.node.name', type: FIELD_TYPES.COLLECTION, seenKey: 'studios' },
        { label: 'Studio ID', path: 'studios.edges.node.id', type: FIELD_TYPES.NUMBER },
        { label: 'Is Animation Studio', path: 'isAnimationStudio', type: FIELD_TYPES.BOOLEAN },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN }
    ],
    [RECURSIVE_CATEGORIES.CHARACTER]: [
        { label: 'Char Full Name', path: 'characters.edges.node.name.full', type: FIELD_TYPES.COLLECTION, seenKey: 'characterNames' },
        { label: 'Char Gender', path: 'gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'Char Age', path: 'age', type: FIELD_TYPES.NUMBER },
        { label: 'Blood Type', path: 'bloodType', type: FIELD_TYPES.STRING },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN },
        { label: 'Birthday', path: 'dateOfBirth', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.STAFF]: [
        { label: 'Staff Full Name', path: 'staff.edges.node.name.full', type: FIELD_TYPES.COLLECTION, seenKey: 'staffNames' },
        { label: 'Staff Gender', path: 'gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'Staff Age', path: 'age', type: FIELD_TYPES.NUMBER },
        { label: 'Language', path: 'languageV2', type: FIELD_TYPES.STRING },
        { label: 'Occupations', path: 'primaryOccupations', type: FIELD_TYPES.COLLECTION },
        { label: 'Home Town', path: 'homeTown', type: FIELD_TYPES.STRING },
        { label: 'Blood Type', path: 'bloodType', type: FIELD_TYPES.STRING },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN },
        { label: 'Birthday', path: 'dateOfBirth', type: FIELD_TYPES.NUMBER },
        { label: 'Date of Death', path: 'dateOfDeath', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.USER]: [
        { label: 'Username', path: 'name', type: FIELD_TYPES.STRING },
        { label: 'User ID', path: 'id', type: FIELD_TYPES.NUMBER }
    ]
};

export const SUB_FIELDS = {
    [COLLECTION_PATHS.CHARACTERS]: [
        { label: 'Role', path: 'role', type: FIELD_TYPES.ENUM, options: ['MAIN', 'SUPPORTING', 'BACKGROUND'] },
        { label: 'Name', path: 'node.name.full', type: FIELD_TYPES.STRING, seenKey: 'characterNames' },
        { label: 'Gender', path: 'node.gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'Age', path: 'node.age', type: FIELD_TYPES.NUMBER },
        { label: 'Voice Actor', path: 'voiceActor.name.full', type: FIELD_TYPES.STRING, seenKey: 'staffNames' }
    ],
    [COLLECTION_PATHS.STAFF]: [
        { label: 'Role', path: 'role', type: FIELD_TYPES.STRING },
        { label: 'Name', path: 'node.name.full', type: FIELD_TYPES.STRING, seenKey: 'staffNames' },
        { label: 'Gender', path: 'node.gender', type: FIELD_TYPES.STRING, seenKey: 'genders' }
    ],
    [COLLECTION_PATHS.STUDIOS]: [
        { label: 'Name', path: 'node.name', type: FIELD_TYPES.STRING, seenKey: 'studios' },
        { label: 'Main Studio', path: 'isMain', type: FIELD_TYPES.BOOLEAN }
    ]
};

export const OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    GREATER: 'greater_than',
    LESSER: 'less_than',
    BETWEEN: 'between',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    IS: 'is',
    REGEX_MATCH: 'regex_match',
    REGEX_NOT_MATCH: 'regex_not_match'
};

export const OPERATORS_BY_TYPE = {
    [FIELD_TYPES.STRING]: [OPERATORS.CONTAINS, OPERATORS.NOT_CONTAINS, OPERATORS.EQUALS, OPERATORS.NOT_EQUALS, OPERATORS.REGEX_MATCH, OPERATORS.REGEX_NOT_MATCH],
    [FIELD_TYPES.NUMBER]: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS, OPERATORS.GREATER, OPERATORS.LESSER, OPERATORS.BETWEEN],
    [FIELD_TYPES.COLLECTION]: [OPERATORS.CONTAINS, OPERATORS.NOT_CONTAINS, OPERATORS.EQUALS, OPERATORS.NOT_EQUALS],
    [FIELD_TYPES.BOOLEAN]: [OPERATORS.IS],
    [FIELD_TYPES.ENUM]: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS],
    [FIELD_TYPES.LIST]: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS]
};

/**
 * Gets value from a nested object using a dot-notated path string.
 * Handles recursion in arrays automatically.
 */
/**
 * Tries to extract the FIRST number from a string (e.g. "45 years" -> 45).
 */
function safeParseNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return NaN;
    const match = val.toString().match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : NaN;
}

export function getValueByPath(obj, path) {
    if (obj === null || obj === undefined || !path) return obj;
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // If the CURRENT level is an array, we map across it
        if (Array.isArray(current)) {
            const remainingPath = parts.slice(i).join('.');
            return current.map(item => getValueByPath(item, remainingPath)).flat();
        }

        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }
    return current;
}

/**
 * Evaluates a single rule against a result item.
 * Returns { success: boolean, terms: string[] } for highlighting match reasons in the UI.
 */
export function evaluateRule(item, rule) {
    const { type, path, operator, value } = rule;

    // Matches object: { [path]: Set<term> }
    const matches = {};
    const addMatch = (sourcePath, term) => {
        if (!term || typeof term !== 'string') return;
        const normalized = term.toLowerCase().trim();
        if (normalized.length < 2) return;
        if (!matches[sourcePath]) matches[sourcePath] = new Set();
        matches[sourcePath].add(normalized);
    };

    const mergeMatches = (otherMatches) => {
        if (!otherMatches) return;
        Object.entries(otherMatches).forEach(([p, terms]) => {
            if (!matches[p]) matches[p] = new Set();
            terms.forEach(t => matches[p].add(t));
        });
    };

    // SAFETY GUARD: If value is empty/invalid but required, we skip (success=true)
    if (value === '' || value === null || value === undefined) {
        if (rule.type !== 'GROUP' && rule.type !== 'RELATION' && 
            type !== 'boolean' && operator !== 'is' && operator !== 'equals' && operator !== 'not_equals') {
            return { success: true, matches: {} };
        }
    }

    if (rule.type === 'GROUP' || type === 'GROUP') {
        const quantifier = rule.quantifier || GROUP_TYPES.ANY;
        const subRules = rule.rules || [];

        // Special handling for LOGIC/ROOT groups that apply to the current object
        if (rule.path === COLLECTION_PATHS.LOGIC) {
            if (subRules.length === 0) return { success: true, matches: {} };
            const subResults = subRules.map(sr => evaluateRule(item, sr));
            subResults.forEach(r => mergeMatches(r.matches));

            if (quantifier === GROUP_TYPES.ALL) return { success: subResults.every(r => r.success), matches: matches };
            if (quantifier === GROUP_TYPES.ANY) return { success: subResults.some(r => r.success), matches: matches };
            if (quantifier === GROUP_TYPES.NONE) return { success: !subResults.some(r => r.success), matches: {} };
            return { success: true, matches: {} };
        }

        // Standard Collection Groups (Characters, Staff, etc.)
        const collection = getValueByPath(item, path);
        if (!collection || !Array.isArray(collection)) return { success: false, matches: {} };
        
        const subResults = collection.map(entry => {
            const entryResults = subRules.map(sr => evaluateRule(entry, sr));
            const entryMatches = {};
            entryResults.forEach(r => {
                Object.entries(r.matches).forEach(([p, terms]) => {
                    // Prepend parent path for collection rules to distinguish them
                    const fullPath = `${path}.${p}`;
                    if (!entryMatches[fullPath]) entryMatches[fullPath] = new Set();
                    terms.forEach(t => entryMatches[fullPath].add(t));
                });
            });
            return { 
                success: quantifier === GROUP_TYPES.ALL ? entryResults.every(r => r.success) : entryResults.some(r => r.success),
                matches: entryMatches
            };
        });

        const allPass = quantifier === GROUP_TYPES.ALL ? subResults.every(r => r.success) : 
                       quantifier === GROUP_TYPES.ANY ? subResults.some(r => r.success) :
                       !subResults.some(r => r.success);
        
        subResults.forEach(r => { if (r.success) mergeMatches(r.matches); });
        return { success: allPass, matches: matches };
    }

    if (rule.type === 'RELATION') {
        const { relationType, quantifier } = rule;
        const subRules = rule.rules || [];
        const relations = item.relations?.edges || [];
        
        const filteredRels = relationType === 'ANY' ? relations : relations.filter(e => e.relationType === relationType);
        if (filteredRels.length === 0) return { success: quantifier === 'NONE', matches: {} };

        const subResults = filteredRels.map(edge => {
            const entryResults = subRules.map(sr => evaluateRule(edge.node, sr));
            const entryMatches = {};
            entryResults.forEach(r => {
                Object.entries(r.matches).forEach(([p, terms]) => {
                    const fullPath = `relations.${p}`;
                    if (!entryMatches[fullPath]) entryMatches[fullPath] = new Set();
                    terms.forEach(t => entryMatches[fullPath].add(t));
                });
            });
            return {
                success: entryResults.every(r => r.success),
                matches: entryMatches
            };
        });

        const allPass = quantifier === 'ALL' ? subResults.every(r => r.success) :
                       quantifier === 'ANY' ? subResults.some(r => r.success) :
                       !subResults.some(r => r.success);
        
        subResults.forEach(r => { if (r.success) mergeMatches(r.matches); });
        return { success: allPass, matches: matches };
    }

    // Leaf Rule Logic
    let success = false;
    let actualValue = getValueByPath(item, path);
    // Special handling for fuzzy dates (objects { year, month, day })
    if (actualValue && typeof actualValue === 'object' && 'year' in actualValue) {
        actualValue = (actualValue.year || 0) * 10000 + (actualValue.month || 0) * 100 + (actualValue.day || 0);
    }
    const target = value?.toString().toLowerCase().trim() || '';

    // Special handling for LIST detection (comma separated values)
    const isListValue = value?.includes(',');
    if (type === FIELD_TYPES.LIST || isListValue) {
        const list = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
        const itemValStr = actualValue?.toString().toLowerCase();
        let success = false;
        if (operator === OPERATORS.EQUALS || operator === OPERATORS.IS) {
            success = list.includes(itemValStr);
        } else if (operator === OPERATORS.NOT_EQUALS) {
            success = !list.includes(itemValStr);
        }
        if (success && itemValStr) addMatch(path, itemValStr);
        return { success, matches };
    }

    switch (operator) {
        case OPERATORS.EQUALS:
        case OPERATORS.IS:
            if (Array.isArray(actualValue)) {
                const found = actualValue.filter(v => v?.toString().toLowerCase() === target);
                success = found.length > 0;
                if (success) found.forEach(f => addMatch(path, f));
            } else {
                success = actualValue?.toString().toLowerCase() === target;
                if (success) addMatch(path, actualValue);
            }
            break;
        case OPERATORS.NOT_EQUALS:
            success = actualValue?.toString().toLowerCase() !== target;
            break;
        case OPERATORS.CONTAINS:
            if (Array.isArray(actualValue)) {
                success = actualValue.some(v => v?.toString().toLowerCase() === target);
                if (success) addMatch(path, target);
            } else {
                success = actualValue?.toString().toLowerCase().includes(target);
                if (success) addMatch(path, target);
            }
            break;
        case OPERATORS.NOT_CONTAINS:
            if (Array.isArray(actualValue)) {
                success = !actualValue.some(v => v?.toString().toLowerCase() === target);
            } else {
                success = !actualValue?.toString().toLowerCase().includes(target);
            }
            break;
        case OPERATORS.GREATER:
            success = parseFloat(actualValue) > parseFloat(value);
            break;
        case OPERATORS.LESSER:
            success = parseFloat(actualValue) < parseFloat(value);
            break;
        case OPERATORS.REGEX_MATCH:
            try {
                if (!actualValue) {
                    success = false;
                } else {
                    const re = new RegExp(value, 'gi');
                    const text = actualValue.toString();
                    const matchesFound = text.match(re);
                    success = !!matchesFound;
                    if (success && matchesFound) {
                        matchesFound.forEach(m => addMatch(path, m.trim()));
                    }
                }
            } catch (e) { success = false; }
            break;
        case OPERATORS.REGEX_NOT_MATCH:
            try {
                if (!actualValue) success = true;
                else {
                    const re = new RegExp(value, 'gi');
                    success = !re.test(actualValue.toString());
                }
            } catch (e) { success = true; }
            break;
        default:
            success = true;
    }

    return { success, matches };
}

/**
 * Filters results based on all active rules (Logical AND).
 */
export function filterResults(results, rules) {
    if (!rules || rules.length === 0) return results;

    let debugTriggered = false;
    return results.filter(item => {
        const ruleResults = rules.map(rule => ({
            rule,
            result: evaluateRule(item, rule)
        }));
        const allPass = ruleResults.every(r => r.result.success);

        if (!allPass && !debugTriggered && state.isScanning) {
            const findDeepFailure = (res) => {
                const fail = res.find(r => !r.result.success);
                if (!fail) return null;
                if (fail.rule.type === 'GROUP' || fail.rule.type === 'RELATION') {
                    // Try to evaluate its children to see why it failed
                    const subResults = (fail.rule.rules || []).map(sr => ({
                        rule: sr,
                        result: evaluateRule(item, sr)
                    }));
                    const deep = findDeepFailure(subResults);
                    return deep || fail;
                }
                return fail;
            };

            const failure = findDeepFailure(ruleResults);
            if (failure) {
                console.warn(`[Filter Debug] "${item.title.romaji || 'Unknown'}" rejected by rule:`, {
                    path: failure.rule.path,
                    op: failure.rule.operator,
                    expected: failure.rule.value,
                    actual: getValueByPath(item, failure.rule.path),
                    cause: (failure.rule.type === 'GROUP' || failure.rule.type === 'RELATION') ? `Group (${failure.rule.quantifier}) failed` : 'Leaf match failed'
                });
            }
            debugTriggered = true;
        }

        if (allPass) {
            // Success TRACE: Deep report of why it matched
            if (state.isScanning) {
                const getDeepTrace = (res) => {
                    return res.map(r => {
                        const base = `${r.rule.path}:${r.result.success ? 'PASS' : 'FAIL'}`;
                        if (r.rule.rules) {
                            const subRes = r.rule.rules.map(sr => ({ rule: sr, result: evaluateRule(item, sr) }));
                            return { [base]: getDeepTrace(subRes) };
                        }
                        return base;
                    });
                };
                console.info(`[Match Trail] "${item.title.romaji}" FOUND:`, getDeepTrace(ruleResults));
            }

            // Attach unique matching terms to the item for highlighting in UI
            // This now uses path-specific tracking to prevent "highlight bleed"
            const allMatches = {};
            ruleResults.forEach(r => {
                if (r.result.matches) {
                    Object.entries(r.result.matches).forEach(([p, terms]) => {
                        if (!allMatches[p]) allMatches[p] = new Set();
                        terms.forEach(t => allMatches[p].add(t));
                    });
                }
            });

            // Convert Sets back to arrays for JSON compatibility and UI consumption
            item._matchDetails = {};
            Object.entries(allMatches).forEach(([p, termsSet]) => {
                item._matchDetails[p] = [...termsSet].filter(t => t && t.length >= 2);
            });
            
            if (state.isScanning) {
                console.info(`[Match Trail] "${item.title.romaji || 'Unknown'}" FOUND. Reasons:`, item._matchDetails);
            }
        }

        return allPass;
    });
}
