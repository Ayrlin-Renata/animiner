/**
 * filter.js
 * Core logic for evaluating recursive constraints on AniList objects.
 * Supports path traversal for nested arrays (e.g. studios.edges.node.name).
 */

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

export const COLLECTION_PATHS = {
    CHARACTERS: 'characters.edges',
    STAFF: 'staff.edges',
    STUDIOS: 'studios.edges'
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
 */
export function evaluateRule(item, rule) {
    const { path, operator, value, type } = rule;
    let actualValue = getValueByPath(item, path);

    // Special handling for fuzzy dates (objects { year, month, day })
    if (actualValue && typeof actualValue === 'object' && 'year' in actualValue) {
        actualValue = (actualValue.year || 0) * 10000 + (actualValue.month || 0) * 100 + (actualValue.day || 0);
    }

    const target = value?.toString().toLowerCase().trim();

    // Special handling for LIST detection (comma separated values)
    const isListValue = value?.includes(',');

    if (type === FIELD_TYPES.LIST || isListValue) {
        const list = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
        const itemValStr = actualValue?.toString().toLowerCase();
        
        if (operator === OPERATORS.EQUALS || operator === OPERATORS.IS) {
            return list.includes(itemValStr);
        }
        if (operator === OPERATORS.NOT_EQUALS) {
            return !list.includes(itemValStr);
        }
    }

    if (type === 'GROUP') {
        const collection = getValueByPath(item, path);
        if (!collection || !Array.isArray(collection)) return false;
        
        const quantifier = rule.quantifier || GROUP_TYPES.ANY;
        const subRules = rule.rules || [];
        
        // If no sub-rules, treat as "any item exists" or similar
        if (subRules.length === 0) return collection.length > 0;

        const matchingItems = collection.filter(subItem => 
            subRules.every(subRule => evaluateRule(subItem, subRule))
        );

        if (quantifier === GROUP_TYPES.ANY) return matchingItems.length > 0;
        if (quantifier === GROUP_TYPES.ALL) return matchingItems.length === collection.length && collection.length > 0;
        if (quantifier === GROUP_TYPES.NONE) return matchingItems.length === 0;
        return true;
    }

    switch (operator) {
        case OPERATORS.CONTAINS:
            if (Array.isArray(actualValue)) {
                return actualValue.some(v => v?.toString().toLowerCase().includes(target));
            }
            return actualValue?.toString().toLowerCase().includes(target);

        case OPERATORS.NOT_CONTAINS:
            if (Array.isArray(actualValue)) {
                return !actualValue.some(v => v?.toString().toLowerCase().includes(target));
            }
            return !actualValue?.toString().toLowerCase().includes(target);

        case OPERATORS.EQUALS:
        case OPERATORS.IS:
            if (Array.isArray(actualValue)) {
                return actualValue.some(v => v?.toString().toLowerCase() === target);
            }
            // Handle boolean
            if (target === 'true' || target === 'false') return String(actualValue) === target;
            return actualValue?.toString().toLowerCase() === target;

        case OPERATORS.NOT_EQUALS:
            if (Array.isArray(actualValue)) {
                return !actualValue.some(v => v?.toString().toLowerCase() === target);
            }
            return actualValue?.toString().toLowerCase() !== target;

        case OPERATORS.GREATER:
            return safeParseNumber(actualValue) > safeParseNumber(value);

        case OPERATORS.LESSER:
            return safeParseNumber(actualValue) < safeParseNumber(value);

        case OPERATORS.BETWEEN:
            const numbers = value.split(/[- ]+/).map(safeParseNumber);
            const [min, max] = numbers;
            const valNumber = safeParseNumber(actualValue);
            return valNumber >= min && valNumber <= max;

        case OPERATORS.REGEX_MATCH:
            try {
                if (!actualValue) return false;
                const re = new RegExp(value, 'i');
                return re.test(actualValue.toString());
            } catch (e) { return false; }

        case OPERATORS.REGEX_NOT_MATCH:
            try {
                if (!actualValue) return true;
                const re = new RegExp(value, 'i');
                return !re.test(actualValue.toString());
            } catch (e) { return true; }

        default:
            return true;
    }
}

/**
 * Filters results based on all active rules (Logical AND).
 */
export function filterResults(results, rules) {
    if (!rules || rules.length === 0) return results;
    return results.filter(item => rules.every(rule => evaluateRule(item, rule)));
}
