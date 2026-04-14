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
    LIST: 'list',
    REFERENCE: 'reference'
};

export const GROUP_TYPES = {
    ALL: 'ALL',       // Every item must match ALL rules (AND profile)
    ANY: 'ANY',       // At least one item must match ALL rules (AND profile)
    NONE: 'NONE',     // Zero items must match ALL rules (AND profile)
    NOT_ALL: 'NOT_ALL',   // At least one item must FAIL at least one rule
    SOME_ANY: 'SOME_ANY', // At least one item matches AT LEAST ONE rule (Fuzzy)
    NONE_ANY: 'NONE_ANY'  // Zero items match EVEN ONE rule (Strict exclude)
};

export const RELATION_TYPES = [
    'ANY',
    'ADAPTATION',
    'PREQUEL',
    'SEQUEL',
    'PARENT',
    'SIDE_STORY',
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
    { label: 'filter.fields.id', path: 'id', type: 'number' },
    { label: 'filter.fields.title_romaji', path: 'title.romaji', type: 'string' },
    { label: 'filter.fields.title_english', path: 'title.english', type: 'string' },
    { label: 'filter.fields.title_native', path: 'title.native', type: 'string' },
    { label: 'filter.fields.format', path: 'format', type: 'enum', options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
    { label: 'filter.fields.type', path: 'type', type: 'enum', options: ['ANIME', 'MANGA'] },
    { label: 'filter.fields.status', path: 'status', type: 'enum', options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
    { label: 'filter.fields.genres', path: 'genres', type: 'collection', seenKey: 'genres' },
    { label: 'filter.fields.tag_name', path: 'tags.name', type: 'collection', seenKey: 'tags' },
    { label: 'filter.fields.tag_category', path: 'tags.category', type: 'collection' },
    { label: 'filter.fields.average_score', path: 'averageScore', type: 'number' },
    { label: 'filter.fields.popularity', path: 'popularity', type: 'number' },
    { label: 'filter.fields.start_year', path: 'startDate.year', type: 'number' },
];

export const COLLECTION_PATHS = {
    CHARACTERS: 'characters.edges',
    STAFF: 'staff.edges',
    STUDIOS: 'studios.edges',
    TAGS: 'tags',
    LOGIC: 'ROOT' // Special path for manual boolean logic
};

/**
 * Humanizes technical filter reasons for UI tooltips.
 */
export function formatReasonForUser(rule, technicalReason) {
    if (!technicalReason && rule.type === 'RELATION') {
        return `Relation rule (${rule.relationTypes?.join(', ') || 'ANY'}) failed logic.`;
    }

    // Attempt to map path to label
    let label = rule.label || rule.path;

    if (technicalReason && technicalReason.includes(' (Actual:')) {
        const val = rule.value;
        const actualRaw = technicalReason.split("(Actual: '")[1]?.replace("')", "") || 'unknown';

        // SPECIAL CASE: Descriptions & Regex - Don't show the "Actual" data block unless tiny
        if (rule.path === 'description' || rule.operator === 'regex_match') {
            switch (rule.operator) {
                case 'contains': return `Description does not contain '${val}'`;
                case 'not_contains': return `Description contains forbidden '${val}'`;
                case 'regex_match': return `Pattern /${val}/ not found in description`;
                case 'not_equals': return `Description matches forbidden exact text`;
                default: break; // Fall through to standard truncated logic
            }
        }

        // Handle comma-separated lists (like tags)
        let actual = actualRaw;
        if (actualRaw.includes(',')) {
            const arr = actualRaw.split(',').map(s => s.trim());
            if (arr.length > 3) {
                actual = `${arr.slice(0, 3).join(', ')} (+${arr.length - 3} more)`;
            }
        } else if (actualRaw.length > 50) {
            actual = actualRaw.substring(0, 47) + '...';
        }

        switch (rule.operator) {
            case 'contains': return `${label} missing '${val}'`;
            case 'not_contains': return `${label} contains forbidden '${val}'`;
            case 'equals': return `${label} must be '${val}' (Actual: '${actual}')`;
            case 'not_equals': return `${label} cannot be '${val}'`;
            case 'greater_than': return `${label} too low (${actual} < ${val})`;
            case 'less_than': return `${label} too high (${actual} > ${val})`;
            case 'regex_match': return `${label} matches forbidden pattern`;
            default: return technicalReason;
        }
    }

    if (rule.type === 'GROUP' || rule.type === 'RELATION') {
        const type = rule.type === 'RELATION' ? 'Relation Group' : 'Group';
        return `${type} (${rule.quantifier || 'ALL'}) failed criteria.`;
    }

    return technicalReason || "Unknown requirement failed.";
}

/**
 * Recursively finds the specific leaf node failure and builds a bulleted path.
 */
export function findDeepFailure(item, rule, result, depth = 0) {
    if (!result || result.success) return null;

    // We only want to add a visible indent/bullet line if we have something new to "say"
    // like a Relation name, a Reference name, or a Labeled group.

    const indent = "  ".repeat(depth);
    const bullet = (depth > 0) ? `\n${indent}• ` : "";

    // REFERENCE handling
    if (rule.type === 'reference') {
        const refLabel = rule.value;
        const targetGroup = state.groupRefs?.[refLabel];
        if (targetGroup) {
            const subRes = evaluateRule(item, targetGroup);
            const subReason = findDeepFailure(item, targetGroup, subRes, depth + 1);
            return `${bullet}[Reference: ${refLabel}] ${subReason}`;
        }
    }

    // RELATION handling
    if (rule.type === 'RELATION') {
        const subRules = rule.rules || [];
        const relations = item.relations?.edges || [];
        const relationTypes = rule.relationTypes || (rule.relationType ? [rule.relationType] : ['ANY']);
        const filteredRels = relationTypes.includes('ANY') ? relations : relations.filter(e => relationTypes.includes(e.relationType));

        if (filteredRels.length === 0) return bullet + formatReasonForUser(rule, result.reason);

        for (const edge of filteredRels) {
            for (const sr of subRules) {
                const res = evaluateRule(edge.node, sr);
                if (!res.success) {
                    const subReason = findDeepFailure(edge.node, sr, res, depth + 1);
                    const title = edge.node.title?.romaji || edge.node.title?.english || 'Unknown Relation';
                    return `${bullet}[${edge.relationType}: ${title}] ${subReason}`;
                }
            }
        }
    }

    // GROUP handling
    if (rule.rules && rule.rules.length > 0) {
        const subResults = rule.rules.map(sr => ({ rule: sr, result: evaluateRule(item, sr) }));

        if (rule.quantifier === 'ALL' || rule.quantifier === 'EVERY') {
            const firstFail = subResults.find(r => !r.result.success);
            if (firstFail) {
                const labelPart = firstFail.rule.label ? `[${firstFail.rule.label}] ` : '';
                const subReason = findDeepFailure(item, firstFail.rule, firstFail.result, depth + (firstFail.rule.label ? 1 : 0));

                if (firstFail.rule.label) {
                    return `${bullet}${labelPart} ${subReason}`;
                }
                // No label? Just return the sub-reason without a new bullet level
                return subReason;
            }
        }

        if (rule.quantifier === 'NONE' || rule.quantifier === 'NONE_ANY') {
            const firstPass = subResults.find(r => r.result.success);
            if (firstPass) {
                const label = firstPass.rule.label || firstPass.rule.path;
                let val = getValueByPath(item, firstPass.rule.path);
                if (Array.isArray(val)) {
                    val = val.length > 3 ? `${val.slice(0, 3).join(', ')} (+${val.length - 3} more)` : val.join(', ');
                } else if (typeof val === 'string' && val.length > 50) {
                    val = val.substring(0, 47) + '...';
                }
                return `${bullet}Forbidden Match: ${label} is '${val}'`;
            }
        }

        if (rule.quantifier === 'ANY' || rule.quantifier === 'SOME' || rule.quantifier === 'SOME_ANY') {
            const firstFail = subResults[0];
            const msg = findDeepFailure(item, firstFail.rule, firstFail.result, depth + 1);
            const prefix = depth === 0 ? "None of the required conditions met:" : "";
            return `${prefix} ${msg}`;
        }
    }

    // Leaf node: format technical reason and wrap in bullet if nested
    return bullet + formatReasonForUser(rule, result.reason);
}

export const RECURSIVE_CATEGORIES = {
    IDENTIFIERS: 'identifiers',
    TIMELINE: 'timeline',
    FORMATS: 'formats',
    CONTENT: 'content',
    METRICS: 'metrics',
    STUDIOS: 'studios',
    CHARACTERS: 'characters',
    STAFF: 'staff',
    USER: 'user',
    REFERENCES: 'references'
};

// Map used to decide which category to show in the UI builder.
export const SEARCH_MODE_CATEGORIES = {
    MEDIA: [
        RECURSIVE_CATEGORIES.IDENTIFIERS,
        RECURSIVE_CATEGORIES.TIMELINE,
        RECURSIVE_CATEGORIES.FORMATS,
        RECURSIVE_CATEGORIES.CONTENT,
        RECURSIVE_CATEGORIES.METRICS,
        RECURSIVE_CATEGORIES.REFERENCES
    ],
    CHARACTER: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.CHARACTERS, RECURSIVE_CATEGORIES.REFERENCES],
    STAFF: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.STAFF, RECURSIVE_CATEGORIES.REFERENCES],
    STUDIO: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.STUDIOS, RECURSIVE_CATEGORIES.REFERENCES],
    USER: [RECURSIVE_CATEGORIES.IDENTIFIERS, RECURSIVE_CATEGORIES.USER, RECURSIVE_CATEGORIES.REFERENCES],
};

export const FIELDS = {
    [RECURSIVE_CATEGORIES.IDENTIFIERS]: [
        { label: 'filter.fields.id', path: 'id', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.idMal', path: 'idMal', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.TIMELINE]: [
        { label: 'filter.fields.start_year', path: 'startDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.start_date', path: 'startDate', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.end_year', path: 'endDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.end_date', path: 'endDate', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.season', path: 'season', type: FIELD_TYPES.ENUM, options: ['WINTER', 'SPRING', 'SUMMER', 'FALL'] },
        { label: 'filter.fields.season_year', path: 'seasonYear', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.airing_at', path: 'airingAt', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.FORMATS]: [
        { label: 'filter.fields.type', path: 'type', type: FIELD_TYPES.ENUM, options: ['ANIME', 'MANGA'] },
        { label: 'filter.fields.format', path: 'format', type: FIELD_TYPES.ENUM, options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
        { label: 'filter.fields.status', path: 'status', type: FIELD_TYPES.ENUM, options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
        { label: 'filter.fields.source', path: 'source', type: FIELD_TYPES.ENUM, options: ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER', 'NOVEL', 'DOUJINSHI', 'ANIME', 'WEB_NOVEL', 'LIVE_ACTION', 'GAME', 'COMIC', 'MULTIMEDIA_PROJECT', 'PICTURE_BOOK'] },
        { label: 'filter.fields.country', path: 'countryOfOrigin', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.is_adult', path: 'isAdult', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.is_licensed', path: 'isLicensed', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.is_locked', path: 'isLocked', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.is_favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN }
    ],
    [RECURSIVE_CATEGORIES.CONTENT]: [
        { label: 'filter.fields.episodes', path: 'episodes', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.duration', path: 'duration', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.chapters', path: 'chapters', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.volumes', path: 'volumes', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.genres', path: 'genres', type: FIELD_TYPES.COLLECTION, seenKey: 'genres' },
        { label: 'filter.fields.synonyms', path: 'synonyms', type: FIELD_TYPES.COLLECTION },
        { label: 'filter.fields.hashtag', path: 'hashtag', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.title_romaji', path: 'title.romaji', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.title_english', path: 'title.english', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.title_native', path: 'title.native', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.description', path: 'description', type: FIELD_TYPES.STRING }
    ],
    [RECURSIVE_CATEGORIES.METRICS]: [
        { label: 'filter.fields.average_score', path: 'averageScore', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.mean_score', path: 'meanScore', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.popularity', path: 'popularity', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.trending', path: 'trending', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.on_list', path: 'onList', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.licensed_by', path: 'licensedBy', type: FIELD_TYPES.COLLECTION }
    ],
    [RECURSIVE_CATEGORIES.STUDIOS]: [
        { label: 'filter.fields.studio_name', path: 'studios.edges.node.name', type: FIELD_TYPES.COLLECTION, seenKey: 'studios' },
        { label: 'filter.fields.studio_id', path: 'studios.edges.node.id', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.is_animation_studio', path: 'isAnimationStudio', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.is_favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN }
    ],
    [RECURSIVE_CATEGORIES.CHARACTERS]: [
        { label: 'filter.fields.char_name', path: 'characters.edges.node.name.full', type: FIELD_TYPES.COLLECTION, seenKey: 'characterNames' },
        { label: 'filter.fields.char_gender', path: 'gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'filter.fields.char_age', path: 'age', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.blood_type', path: 'bloodType', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.is_favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.birthday', path: 'dateOfBirth', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.STAFF]: [
        { label: 'filter.fields.staff_name', path: 'staff.edges.node.name.full', type: FIELD_TYPES.COLLECTION, seenKey: 'staffNames' },
        { label: 'filter.fields.staff_gender', path: 'gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'filter.fields.staff_age', path: 'age', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.language', path: 'languageV2', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.occupations', path: 'primaryOccupations', type: FIELD_TYPES.COLLECTION },
        { label: 'filter.fields.home_town', path: 'homeTown', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.blood_type', path: 'bloodType', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.is_favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN },
        { label: 'filter.fields.birthday', path: 'dateOfBirth', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.death_date', path: 'dateOfDeath', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.USER]: [
        { label: 'filter.fields.username', path: 'name', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.user_id', path: 'id', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.REFERENCES]: [
        { label: 'filter.fields.labeled_group', path: '__REFERENCE__', type: FIELD_TYPES.REFERENCE }
    ]
};

export const SUB_FIELDS = {
    [COLLECTION_PATHS.CHARACTERS]: [
        { label: 'filter.fields.role', path: 'role', type: FIELD_TYPES.ENUM, options: ['MAIN', 'SUPPORTING', 'BACKGROUND'] },
        { label: 'filter.fields.char_name', path: 'node.name.full', type: FIELD_TYPES.STRING, seenKey: 'characterNames' },
        { label: 'filter.fields.char_gender', path: 'node.gender', type: FIELD_TYPES.STRING, seenKey: 'genders' },
        { label: 'filter.fields.char_age', path: 'node.age', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.voice_actor', path: 'voiceActor.name.full', type: FIELD_TYPES.STRING, seenKey: 'staffNames' }
    ],
    [COLLECTION_PATHS.STAFF]: [
        { label: 'filter.fields.role', path: 'role', type: FIELD_TYPES.STRING },
        { label: 'filter.fields.staff_name', path: 'node.name.full', type: FIELD_TYPES.STRING, seenKey: 'staffNames' },
        { label: 'filter.fields.staff_gender', path: 'node.gender', type: FIELD_TYPES.STRING, seenKey: 'genders' }
    ],
    [COLLECTION_PATHS.STUDIOS]: [
        { label: 'filter.fields.studio_name', path: 'node.name', type: FIELD_TYPES.STRING, seenKey: 'studios' },
        { label: 'filter.fields.main_studio', path: 'isMain', type: FIELD_TYPES.BOOLEAN }
    ],
    [COLLECTION_PATHS.TAGS]: [
        { label: 'filter.fields.tag_name', path: 'name', type: FIELD_TYPES.STRING, seenKey: 'tags' },
        { label: 'filter.fields.tag_rank', path: 'rank', type: FIELD_TYPES.NUMBER },
        { label: 'filter.fields.tag_category', path: 'category', type: FIELD_TYPES.STRING }
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
    [FIELD_TYPES.LIST]: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS],
    [FIELD_TYPES.REFERENCE]: [OPERATORS.EQUALS]
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
 * @param callStack - optional Set to track references and prevent deadlocks
 */
export function evaluateRule(item, rule, callStack = new Set()) {
    const { type, path, operator, value } = rule;

    const matches = {};
    const addMatch = (sourcePath, term) => {
        if (!term) return;
        const normalized = term.toString().toLowerCase().trim();
        if (normalized.length < 2) return;

        // LOCAL tracking (for internal group logic)
        if (!matches[sourcePath]) matches[sourcePath] = new Set();
        matches[sourcePath].add(normalized);

        // GLOBAL tracking (for card display)
        if (rule._globalCollector) {
            rule._globalCollector(sourcePath, normalized);
        }
    };

    const mergeMatches = (otherMatches) => {
        if (!otherMatches || Object.keys(otherMatches).length === 0) return;
        Object.entries(otherMatches).forEach(([p, terms]) => {
            if (!matches[p]) matches[p] = new Set();
            if (Array.isArray(terms) || terms instanceof Set) {
                terms.forEach(t => {
                    if (typeof t === 'string' && t.length >= 2) {
                        const norm = t.toLowerCase().trim();
                        matches[p].add(norm);
                        if (rule._globalCollector) rule._globalCollector(p, norm);
                    }
                });
            } else if (typeof terms === 'string') {
                addMatch(p, terms);
            }
        });
    };

    // SAFETY GUARD: If value is empty/invalid but required, we skip (success=true)
    if (value === '' || value === null || value === undefined) {
        if (rule.type !== 'GROUP' && rule.type !== 'RELATION' &&
            type !== 'boolean' && type !== 'reference' && operator !== 'is' && operator !== 'equals' && operator !== 'not_equals') {
            return { success: true, isHardSuccess: false, matches: {} };
        }
    }

    if (type === 'reference' || type === 'REFERENCE' || path === '__REFERENCE__' || path === 'REFERENCE') {
        const refLabel = value;
        const targetGroup = state.groupRefs?.[refLabel];

        if (!targetGroup) return { success: true, matches: {} };

        if (callStack.has(refLabel)) {
            if (state.isScanning) {
                console.warn(`Circular reference detected for alias: ${refLabel}. Evaluation aborted.`);
            }
            return { success: true, matches: {} };
        }

        callStack.add(refLabel);
        const refResult = evaluateRule(item, targetGroup, callStack);
        callStack.delete(refLabel);

        if (refResult.success) {
            mergeMatches(refResult.matches);
        }

        return {
            success: refResult.success,
            isHardSuccess: refResult.isHardSuccess !== false,
            matches,
            reason: refResult.success ? null : `Reference '${refLabel}' failed: ${refResult.reason || 'Unknown reason'}`
        };
    }

    if (rule.type === 'GROUP' || type === 'GROUP') {
        const quantifier = rule.quantifier || 'ANY';
        const subRules = (rule.rules || []).map(sr => ({
            ...sr,
            _globalCollector: rule._globalCollector
        }));

        // Special handling for LOGIC/ROOT groups that apply to the current object
        if (rule.path === COLLECTION_PATHS.LOGIC) {
            if (subRules.length === 0) return { success: true, matches: {} };
            const subResults = subRules.map(sr => evaluateRule(item, sr, callStack));

            let success = false;
            let hasHardMatch = false;
            switch (quantifier) {
                case 'ALL':
                case 'EVERY': success = subResults.every(r => r.success); break;
                case 'ANY':
                case 'SOME':
                case 'SOME_ANY': success = subResults.some(r => r.success && r.isHardSuccess !== false); break;
                case 'NONE':
                case 'NONE_ANY': success = !subResults.some(r => r.success && r.isHardSuccess !== false); break;
                case 'NOT_ALL': success = !subResults.every(r => r.success); break;
                default: success = true; break;
            }

            // A group is considered a "hard match" if any of its successful contributing rules were hard matches
            if (success) {
                if (quantifier === 'ALL' || quantifier === 'EVERY' || quantifier === 'NOT_ALL') {
                    hasHardMatch = subResults.some(r => r.success && r.isHardSuccess !== false);
                } else if (quantifier === 'ANY' || quantifier === 'SOME' || quantifier === 'SOME_ANY') {
                    hasHardMatch = true; // For ANY/SOME, if it passed, it MUST have had a hard match (per logic above)
                } else if (quantifier === 'NONE' || quantifier === 'NONE_ANY') {
                    hasHardMatch = false; // A NONE group passing is a soft success (absence of match)
                }
            }

            if (success) {
                if (quantifier !== 'NONE' && quantifier !== 'NONE_ANY' && quantifier !== 'NOT_ALL') {
                    subResults.forEach(r => { if (r.success) mergeMatches(r.matches); });
                }
            }

            let reason = null;
            if (!success) {
                const fails = subResults.filter(r => !r.success).map(r => r.reason).filter(Boolean);
                reason = `Group (${quantifier}) failed. Sub-fails: [${fails.join('; ')}]`;
            }

            return { success, isHardSuccess: hasHardMatch, matches, reason };
        }

        // Standard Collection Groups (Characters, Staff, etc.)
        const collection = getValueByPath(item, path);
        if (!collection || !Array.isArray(collection)) {
            // Empty collections succeed on negative checks (NONE, NOT_ALL) but fail on positive ones (ALL, ANY)
            const negSuccess = (quantifier === 'NONE' || quantifier === 'NONE_ANY');
            return {
                success: negSuccess,
                matches: {},
                reason: negSuccess ? null : `Collection '${path || 'Unknown'}' is empty or not found.`
            };
        }

        const subResults = collection.map(entry => {
            const entryResults = subRules.map(sr => evaluateRule(entry, sr, callStack));
            const entryMatches = {};
            entryResults.forEach(r => {
                Object.entries(r.matches).forEach(([p, terms]) => {
                    const fullPath = `${path}.${p}`;
                    if (!entryMatches[fullPath]) entryMatches[fullPath] = new Set();
                    terms.forEach(t => entryMatches[fullPath].add(t));
                });
            });

            // Inner profiles are usually ALL (AND logic), unless user chose SOME_ANY or NONE_ANY
            const isFuzzy = (quantifier === 'SOME_ANY' || quantifier === 'NONE_ANY');
            return {
                innerSuccess: isFuzzy ? entryResults.some(r => r.success) : entryResults.every(r => r.success),
                matches: entryMatches
            };
        });

        let allPass = false;
        switch (quantifier) {
            case 'ALL':
            case 'EVERY': allPass = subResults.every(r => r.innerSuccess); break;
            case 'ANY':
            case 'SOME': allPass = subResults.some(r => r.innerSuccess); break;
            case 'NONE': allPass = !subResults.some(r => r.innerSuccess); break;
            case 'NOT_ALL': allPass = !subResults.every(r => r.innerSuccess); break;
            case 'SOME_ANY': allPass = subResults.some(r => r.innerSuccess); break;
            case 'NONE_ANY': allPass = !subResults.some(r => r.innerSuccess); break;
        }
        subResults.forEach(r => { if (r.innerSuccess) mergeMatches(r.matches); });

        let reason = null;
        if (!allPass) {
            const fails = subResults.filter(r => !r.innerSuccess).map(r => r.matches); // This is not right
            // For collection groups, we just summarize
            reason = `Collection Group '${path || 'Unknown'}' (${quantifier}) failed criteria.`;
        }

        return { success: allPass, matches: matches, reason };
    }

    if (rule.type === 'RELATION') {
        let { relationTypes, relationType, quantifier, isOptional } = rule;

        // Backwards compatibility migration
        if (!relationTypes) relationTypes = relationType ? [relationType] : ['ANY'];

        const subRules = rule.rules || [];
        const relations = item.relations?.edges || [];

        const filteredRels = relationTypes.includes('ANY') ? relations : relations.filter(e => {
            const rt = e.relationType?.toUpperCase();
            return relationTypes.some(type => type.toUpperCase() === rt);
        });

        if (filteredRels.length === 0) {
            if (isOptional) return { success: true, isHardSuccess: false, matches: {}, reason: null };
            const success = (quantifier === 'NONE' || quantifier === 'NONE_ANY');
            return {
                success,
                isHardSuccess: success,
                matches: {},
                reason: success ? null : `No relations found for mandatory types: ${relationTypes.join(', ')}`
            };
        }

        const subResults = filteredRels.map(edge => {
            const relCollector = (p, t) => {
                if (rule._globalCollector) rule._globalCollector(`relations.${p}`, t);
            };
            const subRulesWithCollector = subRules.map(sr => ({
                ...sr,
                _globalCollector: relCollector
            }));

            // Fresh callStack for the relation node because it's a different data context.
            // This prevents false "Circular Reference" hits when a relation references a group 
            // that is also its own parent in the logical tree.
            const entryResults = subRulesWithCollector.map(sr => evaluateRule(edge.node, sr, new Set()));

            const entryMatches = {};
            entryResults.forEach(r => {
                Object.entries(r.matches).forEach(([p, terms]) => {
                    const fullPath = `relations.${p}`;
                    if (!entryMatches[fullPath]) entryMatches[fullPath] = new Set();
                    terms.forEach(t => entryMatches[fullPath].add(t));
                });
            });

            const isFuzzy = (quantifier === 'SOME_ANY' || quantifier === 'NONE_ANY');
            return {
                innerSuccess: isFuzzy ? entryResults.some(r => r.success) : entryResults.every(r => r.success),
                isHardSuccess: entryResults.some(r => r.success && r.isHardSuccess !== false),
                matches: entryMatches
            };
        });

        let allPass = false;
        switch (quantifier) {
            case 'ALL': allPass = subResults.every(r => r.innerSuccess); break;
            case 'ANY': allPass = subResults.some(r => r.innerSuccess && r.isHardSuccess !== false); break;
            case 'NONE': allPass = !subResults.some(r => r.innerSuccess && r.isHardSuccess !== false); break;
            case 'NOT_ALL': allPass = !subResults.every(r => r.innerSuccess); break;
            case 'SOME_ANY': allPass = subResults.some(r => r.innerSuccess && r.isHardSuccess !== false); break;
            case 'NONE_ANY': allPass = !subResults.some(r => r.innerSuccess && r.isHardSuccess !== false); break;
        }

        if (allPass) {
            if (quantifier !== 'NONE' && quantifier !== 'NONE_ANY') {
                subResults.forEach(r => { if (r.innerSuccess) mergeMatches(r.matches); });
            }
        }

        let reason = null;
        if (!allPass) {
            reason = `Relation rule (${relationTypes.join(', ')}) failed logic.`;
        }

        let hasHardMatch = false;
        if (allPass) {
            if (quantifier === 'ALL' || quantifier === 'NOT_ALL') {
                hasHardMatch = subResults.some(r => r.innerSuccess && r.isHardSuccess !== false);
            } else if (quantifier === 'ANY' || quantifier === 'SOME_ANY' || quantifier === 'SOME') {
                hasHardMatch = true;
            } else if (quantifier === 'NONE' || quantifier === 'NONE_ANY') {
                hasHardMatch = false; // Soft success for none (absence)
            }
        }

        return { success: allPass, isHardSuccess: hasHardMatch, matches: matches, reason };
    }

    // Leaf Rule Logic
    let success = false;
    let actualValue = getValueByPath(item, path);
    // CLEAN description to avoid matching HTML tags for highlights
    if (path === 'description' && actualValue) {
        actualValue = actualValue.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[^>]+(>|$)/g, "");
    }

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
        let reason = null;
        if (!success) {
            reason = `${path} ${operator} LIST [${list.join(', ')}] (Actual: '${itemValStr}')`;
        }
        return { success, matches, reason };
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
                        addMatch(path, 'regex:' + value);
                        matchesFound.forEach(m => addMatch(path, 'badge:' + m.trim()));
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

    let reason = null;
    if (!success) {
        reason = `${path} ${operator} '${value}' (Actual: '${actualValue}')`;
    }

    return { success, isHardSuccess: success, matches, reason };
}

/**
 * Filters results based on all active rules (Logical AND).
 */
export function filterResults(results, rules) {
    if (!rules || rules.length === 0) return results;

    let debugTriggered = false;
    return results.filter(item => {
        // GLOBAL EXCLUSION CHECK (Instant Visibility Logic)
        const id = item.id;
        const mode = state.searchMode;

        // 1. Blacklist Check
        if (!state.showBlacklisted) {
            const isBlacklisted = (state.blacklist[mode] || []).some(b => (typeof b === 'object' ? b.id : b) === id);
            if (isBlacklisted) {
                return false;
            }
        }

        // 2. Watched Check
        if (!state.showWatched) {
            const isWatched = (state.watched[mode] || []).some(w => (typeof w === 'object' ? w.id : w) === id);
            if (isWatched) {
                return false;
            }
        }

        // 3. Seen History Check (with session stability)
        if (!state.showSeen && !item._sessionSeen) { // Escape if seen in this specific session
            const isSeen = (state.seen[mode] || []).some(s => (typeof s === 'object' ? s.id : s) === id);
            if (isSeen) {
                return false;
            }
        }

        // Apply rules if any are present
        if (!rules || rules.length === 0) return true;

        const itemMatchBuffer = {};
        const collector = (path, term) => {
            if (term === null || term === undefined) return;
            if (!itemMatchBuffer[path]) itemMatchBuffer[path] = new Set();
            itemMatchBuffer[path].add(term);
        };

        const ruleResults = rules.map(rule => ({
            rule,
            result: evaluateRule(item, { ...rule, _globalCollector: collector })
        }));

        const passesCore = ruleResults.filter(r => r.rule.type !== 'RELATION').every(r => r.result.success);
        const failsRelations = ruleResults.some(r => r.rule.type === 'RELATION' && !r.result.success);

        const isFullMatch = passesCore && !failsRelations;
        const isPartialMatch = passesCore && failsRelations;

        if (!isFullMatch && !isPartialMatch && !debugTriggered && state.isScanning) {
            const findDeepFailure = (res) => {
                const fail = res.find(r => !r.result.success);
                if (!fail) return null;
                if (fail.rule.type === 'GROUP' || fail.rule.type === 'RELATION') {
                    const subResults = (fail.rule.rules || []).map(sr => ({ rule: sr, result: evaluateRule(item, sr) }));
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

        const shouldShow = isFullMatch || (isPartialMatch && state.showRelationFiltered);

        if (shouldShow) {
            item._matchDetails = {};
            Object.entries(itemMatchBuffer).forEach(([p, termsSet]) => {
                item._matchDetails[p] = [...termsSet];
            });

            item._isPartialMatch = isPartialMatch;

            // CAPTURE FAILURE REASON (for tooltips)
            if (isPartialMatch) {
                const failingRel = ruleResults.find(r => r.rule.type === 'RELATION' && !r.result.success);
                if (failingRel) {
                    item._filterFailReason = findDeepFailure(item, failingRel.rule, failingRel.result);
                }
            }
        }

        return shouldShow;
    });
}
