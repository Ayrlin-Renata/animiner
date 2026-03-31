/**
 * api.js
 * Handles all GraphQL communications and search execution logic.
 */

import { state, updateSeenValues } from './state.js';
import { filterResults } from './filter.js';

const ANILIST_URL = 'https://graphql.anilist.co';

export const QUERIES = {
  MEDIA: `
    query ($search: String, $type: MediaType, $page: Int, $sort: [MediaSort], 
           $id: Int, $id_not: Int, $id_in: [Int], $id_not_in: [Int],
           $idMal: Int, $idMal_not: Int, $idMal_in: [Int], $idMal_not_in: [Int],
           $startDate: FuzzyDateInt, $startDate_greater: FuzzyDateInt, $startDate_lesser: FuzzyDateInt,
           $endDate: FuzzyDateInt, $endDate_greater: FuzzyDateInt, $endDate_lesser: FuzzyDateInt,
           $season: MediaSeason, $seasonYear: Int, 
           $format: MediaFormat, $format_in: [MediaFormat], $format_not: MediaFormat, $format_not_in: [MediaFormat],
           $status: MediaStatus, $status_in: [MediaStatus], $status_not: MediaStatus, $status_not_in: [MediaStatus],
           $episodes: Int, $episodes_greater: Int, $episodes_lesser: Int,
           $duration: Int, $duration_greater: Int, $duration_lesser: Int,
           $chapters: Int, $chapters_greater: Int, $chapters_lesser: Int,
           $volumes: Int, $volumes_greater: Int, $volumes_lesser: Int,
           $isAdult: Boolean, $genre: String, $genre_in: [String], $genre_not_in: [String],
           $tag: String, $tag_in: [String], $tag_not_in: [String],
           $minimumTagRank: Int, $tagCategory: String, $tagCategory_in: [String], $tagCategory_not_in: [String],
           $onList: Boolean, $licensedBy: String, $licensedBy_in: [String], $licensedById: Int, $licensedById_in: [Int],
           $averageScore: Int, $averageScore_not: Int, $averageScore_greater: Int, $averageScore_lesser: Int,
           $popularity: Int, $popularity_not: Int, $popularity_greater: Int, $popularity_lesser: Int,
           $source: MediaSource, $source_in: [MediaSource], $countryOfOrigin: CountryCode, $isLicensed: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { total hasNextPage currentPage }
        media(search: $search, type: $type, sort: $sort, 
              id: $id, id_not: $id_not, id_in: $id_in, id_not_in: $id_not_in,
              idMal: $idMal, idMal_not: $idMal_not, idMal_in: $idMal_in, idMal_not_in: $idMal_not_in,
              startDate: $startDate, startDate_greater: $startDate_greater, startDate_lesser: $startDate_lesser,
              endDate: $endDate, endDate_greater: $endDate_greater, endDate_lesser: $endDate_lesser,
              season: $season, seasonYear: $seasonYear, format: $format, format_in: $format_in, format_not: $format_not, format_not_in: $format_not_in,
              status: $status, status_in: $status_in, status_not: $status_not, status_not_in: $status_not_in,
              episodes: $episodes, episodes_greater: $episodes_greater, episodes_lesser: $episodes_lesser,
              duration: $duration, duration_greater: $duration_greater, duration_lesser: $duration_lesser,
              chapters: $chapters, chapters_greater: $chapters_greater, chapters_lesser: $chapters_lesser,
              volumes: $volumes, volumes_greater: $volumes_greater, volumes_lesser: $volumes_lesser,
              isAdult: $isAdult, genre: $genre, genre_in: $genre_in, genre_not_in: $genre_not_in,
              tag: $tag, tag_in: $tag_in, tag_not_in: $tag_not_in,
              minimumTagRank: $minimumTagRank, tagCategory: $tagCategory, tagCategory_in: $tagCategory_in, tagCategory_not_in: $tagCategory_not_in,
              onList: $onList, licensedBy: $licensedBy, licensedBy_in: $licensedBy_in, licensedById: $licensedById, licensedById_in: $licensedById_in,
              averageScore: $averageScore, averageScore_not: $averageScore_not, averageScore_greater: $averageScore_greater, averageScore_lesser: $averageScore_lesser,
              popularity: $popularity, popularity_not: $popularity_not, popularity_greater: $popularity_greater, popularity_lesser: $popularity_lesser,
              source: $source, source_in: $source_in, countryOfOrigin: $countryOfOrigin, isLicensed: $isLicensed) {
          id title { romaji english native } format type status description bannerImage genres source
          startDate { year month day } endDate { year month day }
          coverImage { extraLarge large }
          averageScore meanScore popularity trending favourites episodes duration chapters volumes
          isLocked synonyms hashtag
          tags { name category rank }
          studios { edges { node { name } isMain } }
          characters(perPage: 6) { edges { role node { name { full } image { large } } } }
          staff(perPage: 6) { edges { role node { name { full } image { large } } } }
          relations { edges { relationType node { id title { romaji } coverImage { medium } } } }
        }
      }
    }
  `,
  CHARACTER: `
    query ($search: String, $page: Int, $id: Int, $isBirthday: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        characters(search: $search, id: $id, isBirthday: $isBirthday) {
          id name { full native userPreferred } image { large } description gender age bloodType favourites
          media(perPage: 1) { nodes { title { romaji } coverImage { medium } } }
        }
      }
    }
  `,
  STAFF: `
    query ($search: String, $page: Int, $id: Int, $isBirthday: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        staff(search: $search, id: $id, isBirthday: $isBirthday) {
          id name { full native userPreferred } image { large } description gender age bloodType favourites
          languageV2 primaryOccupations homeTown
        }
      }
    }
  `,
  STUDIO: `
    query ($search: String, $page: Int, $id: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        studios(search: $search, id: $id) {
          id name isAnimationStudio favourites
          media(perPage: 1) { nodes { coverImage { medium } } }
        }
      }
    }
  `,
  USER: `
    query ($search: String, $page: Int, $id: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        users(search: $search, id: $id) {
          id name avatar { large } about
        }
      }
    }
  `
};

export async function executeSearch(onProgress, onComplete) {
  state.isScanning = true;
  state.isCancelled = false;
  state.page = 1;
  state.results = [];

  try {
    let foundMatchesCount = 0;
    while (foundMatchesCount < state.targetMatches && !state.isCancelled) {
      const currentStatus = `Scanning Page ${state.page}...`;
      onProgress({ status: currentStatus, scanned: state.results.length, found: foundMatchesCount });
      
      if (state.rateLimitRemaining < 5) {
        onProgress({ status: 'Waiting for rate limit...', rateLimit: true });
        await new Promise(r => setTimeout(r, (state.rateLimitReset * 1000) + 1000));
      }

      const body = {
        query: QUERIES[state.searchMode],
        variables: getApiVariables()
      };

      const res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const headers = res.headers;
      state.rateLimitRemaining = parseInt(headers.get('X-RateLimit-Remaining') || '90');
      state.rateLimitReset = parseInt(headers.get('X-RateLimit-Reset') || '0');

      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      const { data, errors } = await res.json();
      if (errors) {
          console.error('GraphQL Errors:', errors);
          break;
      }

      const listKey = state.searchMode === 'MEDIA' ? 'media' : 
                      state.searchMode === 'CHARACTER' ? 'characters' :
                      state.searchMode === 'STAFF' ? 'staff' :
                      state.searchMode === 'STUDIO' ? 'studios' : 'users';

      const items = data?.Page?.[listKey] || [];
      state.hasNextPage = data?.Page?.pageInfo?.hasNextPage || false;
      
      state.results = [...state.results, ...items];
      updateSeenValues(items, state.searchMode);

      const filtered = filterResults(state.results, state.rules);
      foundMatchesCount = filtered.length;
      
      // Crucial: Pass status here as well
      onProgress({ 
        status: currentStatus, 
        scanned: state.results.length, 
        found: foundMatchesCount, 
        filteredItems: filtered 
      });

      if (!state.hasNextPage || foundMatchesCount >= state.targetMatches) break;
      state.page++;
    }
  } catch (e) {
    console.error('Search failed:', e);
    onProgress({ status: 'Error occurred during search' });
  } finally {
    state.isScanning = false;
    const finalStatus = state.isCancelled ? 'Search Cancelled' : 'Search Complete';
    const filtered = filterResults(state.results, state.rules);
    onProgress({ status: finalStatus, scanned: state.results.length, found: filtered.length, filteredItems: filtered });
    onComplete(filtered);
  }
}

function getApiVariables() {
  const mainSearch = document.getElementById('mainSearch').value;
  const vars = {
    search: mainSearch || undefined,
    page: state.page,
  };

  if (state.searchMode === 'MEDIA') {
     vars.type = document.getElementById('mediaType')?.value || 'ANIME';
     vars.sort = [document.getElementById('mediaSort')?.value || 'POPULARITY_DESC'];
  }

  // Map rules to API variables for push-down filtering
  state.rules.forEach(rule => {
    const val = rule.value;
    const op = rule.operator;
    const path = rule.path;

    if (path === 'id') {
      if (op === 'equals') vars.id = parseInt(val);
      if (op === 'not_equals') vars.id_not = parseInt(val);
    } else if (path === 'idMal') {
      if (op === 'equals') vars.idMal = parseInt(val);
      if (op === 'not_equals') vars.idMal_not = parseInt(val);
    } else if (path === 'isAdult') {
      if (op === 'is') vars.isAdult = (val === 'true');
    } else if (path === 'isLicensed') {
      if (op === 'is') vars.isLicensed = (val === 'true');
    } else if (path === 'format') {
      if (op === 'equals') vars.format = val;
      if (op === 'not_equals') vars.format_not = val;
    } else if (path === 'status') {
      if (op === 'equals') vars.status = val;
      if (op === 'not_equals') vars.status_not = val;
    } else if (path === 'episodes') {
        if (op === 'equals') vars.episodes = parseInt(val);
        if (op === 'greater_than') vars.episodes_greater = parseInt(val);
        if (op === 'less_than') vars.episodes_lesser = parseInt(val);
    } else if (path === 'duration') {
        if (op === 'equals') vars.duration = parseInt(val);
        if (op === 'greater_than') vars.duration_greater = parseInt(val);
        if (op === 'less_than') vars.duration_lesser = parseInt(val);
    } else if (path === 'chapters') {
        if (op === 'equals') vars.chapters = parseInt(val);
        if (op === 'greater_than') vars.chapters_greater = parseInt(val);
        if (op === 'less_than') vars.chapters_lesser = parseInt(val);
    } else if (path === 'volumes') {
        if (op === 'equals') vars.volumes = parseInt(val);
        if (op === 'greater_than') vars.volumes_greater = parseInt(val);
        if (op === 'less_than') vars.volumes_lesser = parseInt(val);
    } else if (path === 'averageScore') {
      if (op === 'equals') vars.averageScore = parseInt(val);
      if (op === 'greater_than') vars.averageScore_greater = parseInt(val);
      if (op === 'less_than') vars.averageScore_lesser = parseInt(val);
    } else if (path === 'popularity') {
      if (op === 'equals') vars.popularity = parseInt(val);
      if (op === 'greater_than') vars.popularity_greater = parseInt(val);
      if (op === 'less_than') vars.popularity_lesser = parseInt(val);
    } else if (path === 'genres') {
      if (op === 'contains') vars.genre = val;
    } else if (path === 'tags.name') {
      if (op === 'contains') vars.tag = val;
    } else if (path === 'season') {
      if (op === 'equals') vars.season = val;
    } else if (path === 'seasonYear') {
      if (op === 'equals') vars.seasonYear = parseInt(val);
    } else if (path === 'source') {
      if (op === 'equals') vars.source = val;
    } else if (path === 'countryOfOrigin') {
      if (op === 'equals') vars.countryOfOrigin = val;
    }
  });

  return vars;
}
