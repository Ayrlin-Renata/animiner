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
          tags { name category rank isGeneralSpoiler isMediaSpoiler }
          studios { edges { node { name siteUrl } isMain } }
          characters(perPage: 12) { 
            edges { 
              role 
              node { 
                name { full } 
                image { large } 
                gender 
                age 
              } 
            } 
          }
          staff(perPage: 8) { 
            edges { 
              role 
              node { 
                name { full } 
                image { large } 
                gender 
                age 
              } 
            } 
          }
          relations { 
            edges { 
              relationType 
              node { 
                id 
                title { romaji english } 
                format 
                type
                status
                genres
                averageScore
                popularity
                startDate { year }
                tags { name category rank }
                coverImage { medium } 
              } 
            } 
          }
          recommendations(sort: [RATING_DESC, ID], perPage: 7) { 
            nodes { 
              mediaRecommendation { 
                id 
                title { romaji english } 
                type
                coverImage { medium } 
              } 
            } 
          }
          stats { 
            statusDistribution { status amount } 
            scoreDistribution { score amount } 
          }
          externalLinks { url site icon color type language }
          trailer { id site thumbnail }
        }
      }
    }
  `,
  CHARACTER: `
    query ($search: String, $page: Int, $id: Int, $id_not: Int, $id_in: [Int], $id_not_in: [Int], $isBirthday: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        characters(search: $search, id: $id, id_not: $id_not, id_in: $id_in, id_not_in: $id_not_in, isBirthday: $isBirthday) {
          id name { full native userPreferred } image { large } description gender age bloodType favourites
          media(perPage: 1) { nodes { title { romaji } coverImage { medium } } }
        }
      }
    }
  `,
  STAFF: `
    query ($search: String, $page: Int, $id: Int, $id_not: Int, $id_in: [Int], $id_not_in: [Int], $isBirthday: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        staff(search: $search, id: $id, id_not: $id_not, id_in: $id_in, id_not_in: $id_not_in, isBirthday: $isBirthday) {
          id name { full native userPreferred } image { large } description gender age bloodType favourites
          languageV2 primaryOccupations homeTown
        }
      }
    }
  `,
  STUDIO: `
    query ($search: String, $page: Int, $id: Int, $id_not: Int, $id_in: [Int], $id_not_in: [Int]) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        studios(search: $search, id: $id, id_not: $id_not, id_in: $id_in, id_not_in: $id_not_in) {
          id name isAnimationStudio favourites
          media(perPage: 1) { nodes { coverImage { medium } } }
        }
      }
    }
  `,
  USER: `
    query ($search: String, $page: Int, $id: Int, $isModerator: Boolean) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        users(search: $search, id: $id, isModerator: $isModerator) {
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
      
      // DIAGNOSTIC LOGGING
      console.log(`[Search] Page ${state.page} Response:`, { 
        variables: body.variables, 
        hasData: !!data?.Page,
        itemCount: data?.Page?.[state.searchMode === 'MEDIA' ? 'media' : 'items']?.length || 0,
        errors: errors 
      });

      if (errors) {
          console.error('GraphQL Errors:', errors);
          break;
      }

      const listKey = state.searchMode === 'MEDIA' ? 'media' : 
                      state.searchMode === 'CHARACTER' ? 'characters' :
                      state.searchMode === 'STAFF' ? 'staff' :
                      state.searchMode === 'STUDIO' ? 'studios' : 'users';

      const items = (data?.Page?.[listKey] || []).filter(item => {
        const id = item.id;
        const isBlacklisted = state.blacklist[state.searchMode].some(b => (typeof b === 'object' ? b.id : b) === id);
        if (isBlacklisted) return false;
        
        if (!state.showWatched) {
            const isWatched = state.watched[state.searchMode].some(w => (typeof w === 'object' ? w.id : w) === id);
            if (isWatched) return false;
        }
        return true;
      });
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

  // Helper to parse lists
  const parseList = (str) => str.split(',').map(s => s.trim()).filter(s => s !== '');
  const parseIntList = (str) => parseList(str).map(val => parseInt(val)).filter(val => !isNaN(val));

  /**
   * Recursively extract API-compatible filters from a rule list and its nested groups.
   * ONLY rules that are logically mandatory (ALL of ALL) can be pushed to the global API request.
   */
  const extractApiFilters = (rules, isMandatory = true) => {
    rules.forEach(rule => {
      if (rule.type === 'GROUP') {
        // A path is only mandatory if it's an ALL group inside a mandatory parent
        const childrenAreMandatory = isMandatory && rule.quantifier === 'ALL';
        
        if (childrenAreMandatory) {
          extractApiFilters(rule.rules || [], true);
        } else if (isMandatory && (rule.quantifier === 'ANY' || rule.quantifier === 'NONE')) {
          // SMART CONSOLIDATION: If a mandatory ANY group has children with the same path, 
          // we can still optimize it. (e.g. Mandatory AND (Genre A OR Genre B) -> genre_in: [A,B])
          const childRules = (rule.rules || []).filter(r => r.type !== 'GROUP');
          if (childRules.length > 0) {
            const firstPath = childRules[0].path;
            const allSamePath = childRules.every(r => r.path === firstPath);
            if (allSamePath && (firstPath === 'genres' || firstPath.startsWith('tags.'))) {
              const allValues = childRules.map(r => r.value).join(',');
              const mockRule = { 
                path: firstPath, 
                operator: rule.quantifier === 'ANY' ? 'equals' : 'not_equals', 
                value: allValues 
              };
              applyRuleToVars(mockRule, rule.quantifier);
            }
          }
          // But their deeper children are definitely NOT mandatory path
          extractApiFilters(rule.rules || [], false);
        } else {
          // Path is optional (ANY or NONE)
          extractApiFilters(rule.rules || [], false);
        }
        return;
      }

      // Leaf rules: Only apply to global variables if they are in a mandatory path
      if (isMandatory) {
        applyRuleToVars(rule, 'ALL');
      }
    });
  };

  const applyRuleToVars = (rule, groupType) => {
    const val = rule.value || '';
    const path = rule.path;
    const op = rule.operator;
    const isList = val.includes(',');

    let apiArg = path;

    if (path === 'id' || path === 'idMal') {
        if (op === 'not_equals') apiArg = isList ? `${path}_not_in` : `${path}_not`;
        else if (op === 'equals' && isList) apiArg = `${path}_in`;
    } else if (path === 'startDate' || path === 'endDate' || path === 'airingAt') {
        if (op === 'greater_than') apiArg = `${path}_greater`;
        else if (op === 'less_than') apiArg = `${path}_lesser`;
    } else if (path === 'episodes' || path === 'duration' || path === 'chapters' || path === 'volumes' || 
               path === 'averageScore' || path === 'popularity' || path === 'trending') {
        if (op === 'greater_than') apiArg = `${path}_greater`;
        else if (op === 'less_than') apiArg = `${path}_lesser`;
        else if (op === 'not_equals') apiArg = `${path}_not`;
    } else if (path === 'format' || path === 'status') {
        if (op === 'not_equals') apiArg = isList ? `${path}_not_in` : `${path}_not`;
        else if (op === 'equals' && isList) apiArg = `${path}_in`;
    } else if (path === 'genres') {
        const targetVal = val.toLowerCase().trim();
        const matchesExact = (state.seenValues.genres || []).some(g => g.toLowerCase().trim() === targetVal);
        if (op === 'equals' || (op === 'contains' && matchesExact)) apiArg = 'genre_in';
        else if (op === 'not_equals' || (op === 'not_contains' && matchesExact)) apiArg = 'genre_not_in';
        else apiArg = null;
    } else if (path === 'tags.name') {
        const targetVal = val.toLowerCase().trim();
        const matchesExact = (state.seenValues.tags || []).some(t => t.toLowerCase().trim() === targetVal);
        if (op === 'equals' || (op === 'contains' && matchesExact)) apiArg = 'tag_in';
        else if (op === 'not_equals' || (op === 'not_contains' && matchesExact)) apiArg = 'tag_not_in';
        else apiArg = null;
    } else if (path === 'tags.category') {
        if (op === 'equals') apiArg = 'tagCategory_in';
        else if (op === 'not_equals') apiArg = 'tagCategory_not_in';
        else apiArg = null;
    } else if (path === 'tags.rank') {
        apiArg = 'minimumTagRank';
    } else if (path === 'seasonYear') {
        apiArg = 'seasonYear';
    }

    if (apiArg) {
        const isNotInArg = apiArg.endsWith('_not_in') || apiArg === 'genre_not_in' || apiArg === 'tag_not_in' || apiArg === 'tagCategory_not_in';
        const isInArg = (apiArg.endsWith('_in') && !isNotInArg) || apiArg === 'genre_in' || apiArg === 'tag_in' || apiArg === 'tagCategory_in';

        if (isInArg || isNotInArg) {
            const intList = parseIntList(val);
            const strList = parseList(val);
            const finalVal = intList.length === strList.length && intList.length > 0 ? intList : strList;
            
            if (isInArg && groupType === 'ALL') {
               if (!vars[apiArg]) vars[apiArg] = finalVal;
               return; 
            }

            if (vars[apiArg]) {
               vars[apiArg] = [...new Set([...vars[apiArg], ...finalVal])];
            } else {
               vars[apiArg] = finalVal;
            }
        } else if (path === 'isAdult' || path === 'isLicensed' || path === 'isLocked' || path === 'isFavourite') {
            vars[apiArg] = (val === 'true');
        } else if (apiArg === 'minimumTagRank' || apiArg.includes('Score') || path === 'popularity' || path === 'trending' || 
                   path === 'episodes' || path === 'duration' || path === 'chapters' || path === 'volumes' || 
                   path === 'id' || path === 'idMal' || path === 'seasonYear') {
            const parsed = parseInt(val);
            if (!isNaN(parsed)) {
                vars[apiArg] = parsed;
            }
        } else {
            if (val.trim() === '') return; // Skip empty string filters for the API
            if (groupType === 'ALL' && vars[apiArg]) return;
            vars[apiArg] = val;
        }
    }
  };

  extractApiFilters(state.rules);

  // Debug: Log the variables being sent
  console.log('API Variables:', vars);

  return vars;
}
