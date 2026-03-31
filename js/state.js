/**
 * state.js
 * Manages application state and cache persistence.
 */

export const state = {
  results: [],
  rules: [],
  loading: false,
  isScanning: false,
  isCancelled: false,
  page: 1,
  hasNextPage: false,
  sort: 'POPULARITY_DESC',
  targetMatches: 50,
  rateLimitRemaining: 90,
  rateLimitReset: 0,
  searchMode: 'MEDIA', // MEDIA, CHARACTER, STAFF, STUDIO, USER
  seenValues: {
    genres: [],
    tags: [],
    studios: [],
    characterNames: [],
    staffNames: [],
    formats: ['TV', 'TV_SHORT', 'MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC', 'MANGA', 'NOVEL', 'ONE_SHOT']
  }
};

export function updateSeenValues(items, mode) {
  if (mode === 'MEDIA') {
    items.forEach(m => {
      m.genres?.forEach(g => addSeen('genres', g));
      m.tags?.forEach(t => addSeen('tags', t.name));
      m.studios?.edges?.forEach(e => addSeen('studios', e.node.name));
      m.characters?.edges?.forEach(e => addSeen('characterNames', e.node.name.full));
      m.staff?.edges?.forEach(e => addSeen('staffNames', e.node.name.full));
    });
  } else if (mode === 'CHARACTER') {
    items.forEach(c => addSeen('characterNames', c.name.full));
  } else if (mode === 'STAFF') {
    items.forEach(s => addSeen('staffNames', s.name.full));
  } else if (mode === 'STUDIO') {
    items.forEach(s => addSeen('studios', s.name));
  }
  
  localStorage.setItem('al_search_workspace_cache', JSON.stringify(state.seenValues));
}

function addSeen(key, val) {
  if (val && !state.seenValues[key].includes(val)) {
    state.seenValues[key].push(val);
  }
}

export async function loadCache() {
  try {
    const response = await fetch('/initialCache.json');
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
