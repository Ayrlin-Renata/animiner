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
        { label: 'AL ID (In List)', path: 'id', type: FIELD_TYPES.LIST, apiArg: 'id_in' },
        { label: 'AL ID (Exclude)', path: 'id', type: FIELD_TYPES.NUMBER, apiArg: 'id_not' },
        { label: 'AL ID (Exclude List)', path: 'id', type: FIELD_TYPES.LIST, apiArg: 'id_not_in' },
        { label: 'MAL ID', path: 'idMal', type: FIELD_TYPES.NUMBER },
        { label: 'MAL ID (In List)', path: 'idMal', type: FIELD_TYPES.LIST, apiArg: 'idMal_in' },
        { label: 'MAL ID (Exclude)', path: 'idMal', type: FIELD_TYPES.NUMBER, apiArg: 'idMal_not' },
        { label: 'MAL ID (Exclude List)', path: 'idMal', type: FIELD_TYPES.LIST, apiArg: 'idMal_not_in' }
    ],
    [RECURSIVE_CATEGORIES.TIMELINE]: [
        { label: 'Start Year', path: 'startDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'Start Date (Greater)', path: 'startDate', type: FIELD_TYPES.NUMBER, apiArg: 'startDate_greater' },
        { label: 'Start Date (Lesser)', path: 'startDate', type: FIELD_TYPES.NUMBER, apiArg: 'startDate_lesser' },
        { label: 'End Year', path: 'endDate.year', type: FIELD_TYPES.NUMBER },
        { label: 'End Date (Greater)', path: 'endDate', type: FIELD_TYPES.NUMBER, apiArg: 'endDate_greater' },
        { label: 'End Date (Lesser)', path: 'endDate', type: FIELD_TYPES.NUMBER, apiArg: 'endDate_lesser' },
        { label: 'Season', path: 'season', type: FIELD_TYPES.ENUM, options: ['WINTER', 'SPRING', 'SUMMER', 'FALL'] },
        { label: 'Season Year', path: 'seasonYear', type: FIELD_TYPES.NUMBER },
        { label: 'Airing At (Greater)', path: 'airingAt', type: FIELD_TYPES.NUMBER, apiArg: 'airingAt_greater' },
        { label: 'Airing At (Lesser)', path: 'airingAt', type: FIELD_TYPES.NUMBER, apiArg: 'airingAt_lesser' }
    ],
    [RECURSIVE_CATEGORIES.FORMATS]: [
        { label: 'Type', path: 'type', type: FIELD_TYPES.ENUM, options: ['ANIME', 'MANGA'] },
        { label: 'Format', path: 'format', type: FIELD_TYPES.ENUM, options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
        { label: 'Format (In List)', path: 'format', type: FIELD_TYPES.LIST, apiArg: 'format_in', options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
        { label: 'Format (Exclude)', path: 'format', type: FIELD_TYPES.ENUM, apiArg: 'format_not', options: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT'] },
        { label: 'Status', path: 'status', type: FIELD_TYPES.ENUM, options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
        { label: 'Status (In List)', path: 'status', type: FIELD_TYPES.LIST, apiArg: 'status_in', options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
        { label: 'Status (Exclude)', path: 'status', type: FIELD_TYPES.ENUM, apiArg: 'status_not', options: ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] },
        { label: 'Source', path: 'source', type: FIELD_TYPES.ENUM, options: ['ORIGINAL', 'MANGA', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'VIDEO_GAME', 'OTHER', 'NOVEL', 'DOUJINSHI', 'ANIME', 'WEB_NOVEL', 'LIVE_ACTION', 'GAME', 'COMIC', 'MULTIMEDIA_PROJECT', 'PICTURE_BOOK'] },
        { label: 'Country', path: 'countryOfOrigin', type: FIELD_TYPES.STRING },
        { label: 'Is Adult', path: 'isAdult', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Licensed', path: 'isLicensed', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Locked', path: 'isLocked', type: FIELD_TYPES.BOOLEAN },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN }
    ],
    [RECURSIVE_CATEGORIES.CONTENT]: [
        { label: 'Episodes', path: 'episodes', type: FIELD_TYPES.NUMBER },
        { label: 'Episodes (Greater)', path: 'episodes', type: FIELD_TYPES.NUMBER, apiArg: 'episodes_greater' },
        { label: 'Episodes (Lesser)', path: 'episodes', type: FIELD_TYPES.NUMBER, apiArg: 'episodes_lesser' },
        { label: 'Duration', path: 'duration', type: FIELD_TYPES.NUMBER },
        { label: 'Duration (Greater)', path: 'duration', type: FIELD_TYPES.NUMBER, apiArg: 'duration_greater' },
        { label: 'Duration (Lesser)', path: 'duration', type: FIELD_TYPES.NUMBER, apiArg: 'duration_lesser' },
        { label: 'Chapters', path: 'chapters', type: FIELD_TYPES.NUMBER },
        { label: 'Chapters (Greater)', path: 'chapters', type: FIELD_TYPES.NUMBER, apiArg: 'chapters_greater' },
        { label: 'Chapters (Lesser)', path: 'chapters', type: FIELD_TYPES.NUMBER, apiArg: 'chapters_lesser' },
        { label: 'Volumes', path: 'volumes', type: FIELD_TYPES.NUMBER },
        { label: 'Volumes (Greater)', path: 'volumes', type: FIELD_TYPES.NUMBER, apiArg: 'volumes_greater' },
        { label: 'Volumes (Lesser)', path: 'volumes', type: FIELD_TYPES.NUMBER, apiArg: 'volumes_lesser' },
        { label: 'Genres', path: 'genres', type: FIELD_TYPES.COLLECTION, seenKey: 'genres' },
        { label: 'Genres (In List)', path: 'genres', type: FIELD_TYPES.LIST, seenKey: 'genres', apiArg: 'genre_in' },
        { label: 'Genres (Exclude List)', path: 'genres', type: FIELD_TYPES.LIST, seenKey: 'genres', apiArg: 'genre_not_in' },
        { label: 'Tag Name', path: 'tags.name', type: FIELD_TYPES.COLLECTION, seenKey: 'tags' },
        { label: 'Tag (In List)', path: 'tags.name', type: FIELD_TYPES.LIST, seenKey: 'tags', apiArg: 'tag_in' },
        { label: 'Tag (Exclude List)', path: 'tags.name', type: FIELD_TYPES.LIST, seenKey: 'tags', apiArg: 'tag_not_in' },
        { label: 'Tag Category', path: 'tags.category', type: FIELD_TYPES.COLLECTION },
        { label: 'Tag Category (In List)', path: 'tags.category', type: FIELD_TYPES.LIST, apiArg: 'tagCategory_in' },
        { label: 'Tag Category (Exclude List)', path: 'tags.category', type: FIELD_TYPES.LIST, apiArg: 'tagCategory_not_in' },
        { label: 'Min Tag Rank', path: 'tags.rank', type: FIELD_TYPES.NUMBER, apiArg: 'minimumTagRank' },
        { label: 'Synonyms', path: 'synonyms', type: FIELD_TYPES.COLLECTION },
        { label: 'Hashtag', path: 'hashtag', type: FIELD_TYPES.STRING }
    ],
    [RECURSIVE_CATEGORIES.METRICS]: [
        { label: 'Average Score', path: 'averageScore', type: FIELD_TYPES.NUMBER },
        { label: 'Average Score (Greater)', path: 'averageScore', type: FIELD_TYPES.NUMBER, apiArg: 'averageScore_greater' },
        { label: 'Average Score (Lesser)', path: 'averageScore', type: FIELD_TYPES.NUMBER, apiArg: 'averageScore_lesser' },
        { label: 'Average Score (Exclude)', path: 'averageScore', type: FIELD_TYPES.NUMBER, apiArg: 'averageScore_not' },
        { label: 'Mean Score', path: 'meanScore', type: FIELD_TYPES.NUMBER },
        { label: 'Popularity', path: 'popularity', type: FIELD_TYPES.NUMBER },
        { label: 'Popularity (Greater)', path: 'popularity', type: FIELD_TYPES.NUMBER, apiArg: 'popularity_greater' },
        { label: 'Popularity (Lesser)', path: 'popularity', type: FIELD_TYPES.NUMBER, apiArg: 'popularity_lesser' },
        { label: 'Popularity (Exclude)', path: 'popularity', type: FIELD_TYPES.NUMBER, apiArg: 'popularity_not' },
        { label: 'Trending', path: 'trending', type: FIELD_TYPES.NUMBER },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'On List', path: 'onList', type: FIELD_TYPES.BOOLEAN },
        { label: 'Licensed By', path: 'licensedBy', type: FIELD_TYPES.COLLECTION },
        { label: 'Licensed By (In List)', path: 'licensedBy', type: FIELD_TYPES.LIST, apiArg: 'licensedBy_in' }
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
        { label: 'Char Gender', path: 'gender', type: FIELD_TYPES.STRING },
        { label: 'Char Age', path: 'age', type: FIELD_TYPES.STRING },
        { label: 'Blood Type', path: 'bloodType', type: FIELD_TYPES.STRING },
        { label: 'Favourites', path: 'favourites', type: FIELD_TYPES.NUMBER },
        { label: 'Is Favourite', path: 'isFavourite', type: FIELD_TYPES.BOOLEAN },
        { label: 'Birthday', path: 'dateOfBirth', type: FIELD_TYPES.NUMBER }
    ],
    [RECURSIVE_CATEGORIES.STAFF]: [
        { label: 'Staff Full Name', path: 'staff.edges.node.name.full', type: FIELD_TYPES.COLLECTION, seenKey: 'staffNames' },
        { label: 'Staff Gender', path: 'gender', type: FIELD_TYPES.STRING },
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

export const OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    GREATER: 'greater_than',
    LESSER: 'less_than',
    BETWEEN: 'between',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    IS: 'is'
};

export const OPERATORS_BY_TYPE = {
    [FIELD_TYPES.STRING]: [OPERATORS.CONTAINS, OPERATORS.NOT_CONTAINS, OPERATORS.EQUALS, OPERATORS.NOT_EQUALS],
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

    // Special handling for LIST type (comma separated values)
    if (type === FIELD_TYPES.LIST || operator === OPERATORS.EQUALS || operator === OPERATORS.NOT_EQUALS) {
        if (type === FIELD_TYPES.LIST) {
            const list = value.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
            const itemValStr = actualValue?.toString().toLowerCase();
            const isInList = list.includes(itemValStr);
            return operator === OPERATORS.EQUALS ? isInList : !isInList;
        }
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
            return Number(actualValue) > Number(value);

        case OPERATORS.LESSER:
            return Number(actualValue) < Number(value);

        case OPERATORS.BETWEEN:
            const [min, max] = value.split(/[- ]+/).map(Number);
            const valNumber = Number(actualValue);
            return valNumber >= min && valNumber <= max;

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
