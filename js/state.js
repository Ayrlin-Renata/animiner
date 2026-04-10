/**
 * state.js
 * Manages application state and cache persistence.
 */

export const state = {
  results: [],
  rules: [],
  groupRefs: {},
  loading: false,
  isScanning: false,
  isCancelled: false,
  page: 1,
  hasNextPage: false,
  sort: 'POPULARITY_DESC',
  mediaType: 'ANIME',
  targetMatches: 50,
  startPage: 1,
  rateLimitRemaining: 90,
  rateLimitReset: 0,
  searchMode: 'MEDIA', // MEDIA, CHARACTER, STAFF, STUDIO, USER
  blacklist: {
    MEDIA: [],
    CHARACTER: [],
    STAFF: [],
    STUDIO: [],
    USER: []
  },
  watched: {
    MEDIA: [],
    CHARACTER: [],
    STAFF: [],
    STUDIO: [],
    USER: []
  },
  seen: {
    MEDIA: [],
    CHARACTER: [],
    STAFF: [],
    STUDIO: [],
    USER: []
  },
  showWatched: false,
  showSeen: false,
  showBlacklisted: false,
  storageConsent: null, // null = not asked, true = accepted, false = declined
  seenValues: {
    genres: [],
    tags: [],
    studios: [],
    characterNames: [],
    staffNames: [],
    genders: ['Male', 'Female', 'Non-binary'],
    formats: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT']
  },
  renderedIds: new Set()
};

export function updateSeenValues(items, mode) {
  if (mode === 'MEDIA') {
    items.forEach(m => {
      m.genres?.forEach(g => addSeen('genres', g));
      m.tags?.forEach(t => addSeen('tags', t.name));
      m.studios?.edges?.forEach(e => addSeen('studios', e.node.name));
      m.characters?.edges?.forEach(e => {
        addSeen('characterNames', e.node.name?.full);
        addSeen('genders', e.node.gender);
      });
      m.staff?.edges?.forEach(e => {
        addSeen('staffNames', e.node.name?.full);
        addSeen('genders', e.node.gender);
      });
    });
  } else if (mode === 'CHARACTER') {
    items.forEach(c => {
      addSeen('characterNames', c.name?.full);
      addSeen('genders', c.gender);
    });
  } else if (mode === 'STAFF') {
    items.forEach(s => {
      addSeen('staffNames', s.name?.full);
      addSeen('genders', s.gender);
    });
  } else if (mode === 'STUDIO') {
    items.forEach(s => addSeen('studios', s.name));
  }
  
  if (state.storageConsent) {
    localStorage.setItem('al_search_workspace_cache', JSON.stringify(state.seenValues));
  }
}

function addSeen(key, val) {
  if (val && !state.seenValues[key].includes(val)) {
    state.seenValues[key].push(val);
  }
}

export function clearRenderedIds() {
  state.renderedIds.clear();
}

export function saveSettings() {
  const settings = {
    searchMode: state.searchMode,
    targetMatches: state.targetMatches,
    startPage: state.startPage,
    sort: state.sort,
    mediaType: state.mediaType,
    rules: state.rules,
    blacklist: state.blacklist,
    watched: state.watched,
    seen: state.seen,
    showWatched: state.showWatched,
    showSeen: state.showSeen,
    showBlacklisted: state.showBlacklisted,
    storageConsent: state.storageConsent
  };
  if (state.storageConsent) {
    localStorage.setItem('al_search_settings_v4', JSON.stringify(settings));
  }
}

export function loadSettings() {
  const local = localStorage.getItem('al_search_settings_v4');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      state.searchMode = parsed.searchMode || state.searchMode;
      state.targetMatches = parsed.targetMatches || state.targetMatches;
      state.startPage = parsed.startPage || state.startPage;
      state.sort = parsed.sort || state.sort;
      state.mediaType = parsed.mediaType || state.mediaType;
      state.rules = parsed.rules || state.rules;
      state.blacklist = parsed.blacklist || state.blacklist;
      state.watched = parsed.watched || state.watched;
      state.seen = parsed.seen || state.seen;
      state.showWatched = parsed.showWatched ?? state.showWatched;
      state.showSeen = parsed.showSeen ?? state.showSeen;
      state.showBlacklisted = parsed.showBlacklisted ?? state.showBlacklisted;
      state.storageConsent = parsed.storageConsent ?? state.storageConsent;
      return true;
    } catch (e) { console.error('Failed to parse settings'); }
  }
  return false;
}

export async function loadCache() {
  try {
    const response = await fetch('initialCache.json');
    if (response.ok) {
        const initial = await response.json();
        Object.keys(initial).forEach(key => {
          if (state.seenValues[key]) state.seenValues[key] = initial[key];
        });
    }
  } catch (e) { console.warn('No initial cache found'); }

  const local = localStorage.getItem('al_search_workspace_cache');
  if (local) {
    const parsed = JSON.parse(local);
    Object.keys(state.seenValues).forEach(key => {
      state.seenValues[key] = [...new Set([...state.seenValues[key], ...(parsed[key] || [])])];
    });
  }
}
