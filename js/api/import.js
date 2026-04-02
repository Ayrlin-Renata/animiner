/**
 * js/api/import.js
 * Logic for fetching and transforming AniList User List data.
 */

import { auth } from './auth.js';
import { state, saveSettings } from '../state.js';

const ANILIST_URL = 'https://graphql.anilist.co';

const VIEWER_QUERY = `
query {
  Viewer {
    id
    name
  }
}
`;

const IMPORT_QUERY = `
query ($userName: String, $userId: Int) {
  MediaListCollection(userName: $userName, userId: $userId, type: ANIME) {
    lists {
      name
      status
      entries {
        media {
          id
          title { romaji english native }
          coverImage { large }
          format
          type
        }
      }
    }
  }
}
`;

/**
 * Fetches the user's MediaListCollection from AniList.
 * @param {string} userName - Optional username for public import.
 * @returns {Promise<Object>} - The raw collection data.
 */
async function fetchUserLists(userName = null) {
  const token = auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const variables = {};
  
  // If no username is provided, we try to fetch the current authenticated user's ID
  if (!userName && token) {
    const viewerResponse = await fetch(ANILIST_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: VIEWER_QUERY })
    });
    const viewerJson = await viewerResponse.json();
    if (viewerJson.errors) throw new Error(viewerJson.errors[0].message);
    if (!viewerJson.data.Viewer) throw new Error("Could not find authenticated user.");
    
    variables.userId = viewerJson.data.Viewer.id;
  } else if (userName) {
    variables.userName = userName;
  } else {
    throw new Error('Username or Login required for import.');
  }

  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: IMPORT_QUERY, variables })
  });

  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  
  if (!json.data.MediaListCollection) {
    throw new Error("No data found for this user.");
  }

  return json.data.MediaListCollection;
}

/**
 * Maps and merges AniList lists into the global state.
 * @param {Object} collection - The MediaListCollection data.
 */
export function mergeImportedData(collection) {
  if (!collection || !collection.lists) return { added: 0 };

  const mode = 'MEDIA'; // Targeted mode for initial version
  let addedCount = 0;

  collection.lists.forEach(list => {
    const status = list.status;
    const entries = list.entries || [];

    entries.forEach(entry => {
      const media = entry.media;
      const title = media.title.english || media.title.romaji || media.title.native;
      const item = {
          id: media.id,
          title,
          image: media.coverImage.large,
          _imported: true
      };

      if (status === 'COMPLETED') {
          if (addToStateList('watched', mode, item)) addedCount++;
      } else if (status === 'PLANNING' || status === 'CURRENT' || status === 'PAUSED') {
          if (addToStateList('seen', mode, item)) addedCount++;
      } else if (status === 'DROPPED') {
          if (addToStateList('blacklist', mode, item)) addedCount++;
      }
    });
  });

  if (addedCount > 0) saveSettings();
  return { added: addedCount };
}

/**
 * Helper to add to state list if not already present or higher priority.
 * Priority: Blacklist > Watched > Seen.
 */
function addToStateList(listName, mode, item) {
  const targetList = state[listName][mode];
  const id = item.id;

  // Check if already in THIS list
  if (targetList.some(i => (typeof i === 'object' ? i.id : i) === id)) return false;

  // CROSS-LIST PRIORITY CHECKS
  // 1. If we are adding to Seen, check if already in Watched or Blacklist
  if (listName === 'seen') {
      if (state.watched[mode].some(i => (typeof i === 'object' ? i.id : i) === id)) return false;
      if (state.blacklist[mode].some(i => (typeof i === 'object' ? i.id : i) === id)) return false;
  }
  // 2. If we are adding to Watched, check if already in Blacklist
  if (listName === 'watched') {
      if (state.blacklist[mode].some(i => (typeof i === 'object' ? i.id : i) === id)) return false;
      // If was in Seen, remove it
      state.seen[mode] = state.seen[mode].filter(i => (typeof i === 'object' ? i.id : i) !== id);
  }
  // 3. If we are adding to Blacklist, remove from Watched/Seen
  if (listName === 'blacklist') {
      state.watched[mode] = state.watched[mode].filter(i => (typeof i === 'object' ? i.id : i) !== id);
      state.seen[mode] = state.seen[mode].filter(i => (typeof i === 'object' ? i.id : i) !== id);
  }

  targetList.push(item);
  return true;
}

export const importer = {
  fetchUserLists,
  mergeImportedData
};
