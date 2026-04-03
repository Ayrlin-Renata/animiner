/**
 * js/ui/modal/logic.js
 * Utility logic for the Details Modal.
 */

import { state } from '../../state.js';

export function highlightText(text, terms) {
  if (!text || !terms || terms.length === 0) return text;
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  const escapedTerms = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
  return text.replace(regex, '<mark class="match-highlight">$1</mark>');
}

export function formatDescription(html, item) {
  if (!html) return 'No description available.';
  const terms = item?._matchDetails?.['description'] || [];
  const clean = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "");
  return highlightText(clean, terms);
}

export function getAnilistUrl(item) {
    const base = 'https://anilist.co';
    if (state.searchMode === 'MEDIA') {
        const type = item.type?.toLowerCase() || 'anime';
        return `${base}/${type}/${item.id}`;
    }
    const slug = state.searchMode.toLowerCase();
    if (slug === 'user') return `${base}/user/${item.name}`;
    return `${base}/${slug}/${item.id}`;
}

/**
 * Helper to parse episode counts from AniList role strings like "(eps 1-12)", "(ep 1)", "(eps 1, 3, 5)"
 */
function parseEpisodeCount(info) {
  if (!info) return 0;
  
  // Handle ranges like 1-12
  const rangeMatch = info.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return Math.abs(parseInt(rangeMatch[2]) - parseInt(rangeMatch[1])) + 1;
  }
  
  // Handle lists like 1, 3, 5
  const matches = info.match(/\d+/g);
  return matches ? matches.length : 0;
}

/**
 * Helper to render status badges (seen, watched, blacklisted) for media items.
 */
export function renderStatusBadge(id, mediaType = 'ANIME') {
    if (!id) return '';
    // AniList uses ANIME/MANGA, which map to MEDIA/MANGA search modes
    const mode = mediaType.toUpperCase() === 'MANGA' ? 'MANGA' : 'MEDIA';
    
    const isBlacklisted = (state.blacklist[mode] || []).some(b => (typeof b === 'object' ? b.id : b) === id);
    const isWatched = (state.watched[mode] || []).some(w => (typeof w === 'object' ? w.id : w) === id);
    const isSeen = (state.seen[mode] || []).some(s => (typeof s === 'object' ? s.id : s) === id);

    if (isBlacklisted) return '<div class="badge-corner badge-blacklisted"><i data-lucide="shield-off"></i></div>';
    if (isWatched) return '<div class="badge-corner badge-watched"><i data-lucide="check-circle"></i></div>';
    if (isSeen) return '<div class="badge-corner badge-seen"><i data-lucide="eye"></i></div>';
    
    return '';
}

window.getStaffPriority = function(role) {
  const fullRole = (role || '').trim();
  if (!fullRole) return 0;

  // 1. Separate Base Role from Parenthetical Info
  const idx = fullRole.indexOf('(');
  const base = (idx !== -1 ? fullRole.substring(0, idx) : fullRole).trim().toLowerCase();
  const info = (idx !== -1 ? fullRole.substring(idx) : '').toLowerCase();

  let score = 30; // Default score
  let isLowPriorityTier = false;

  // 2. TIER 6: ADR/Dubbing/Localization (Priority 10-15)
  if (base.includes('adr') || base.includes('dubbing') || base.includes('localization') || 
      base.includes('casting') || base.includes('publicity') || base.includes('translation') ||
      info.includes('adr') || info.includes('dubbing') || info.includes('localization')) {
    score = 10;
    isLowPriorityTier = true;
    
    if (base.includes('director')) score = 14;
    else if (base.includes('script') || base.includes('writer')) score = 12;
    else if (base.includes('engineer') || base.includes('mixer') || base.includes('editor')) score = 11;
  }

  // 3. MAIN TIERED SCORING
  if (!isLowPriorityTier) {
    if (base.includes('original creator') || base.includes('original story') || base.includes('story & art')) {
      score = 100;
    } else if (base.includes('chief director') || (base.includes('director') && !base.includes('animation') && !base.includes('art') && !base.includes('photography') && !base.includes('sound') && !base.includes('unit') && !base.includes('episode') && !base.includes('adr'))) {
      score = 90;
    } else if (base.includes('series composition') || base.includes('script composition')) {
      score = 85;
    } else if (base.includes('character design') || base.includes('original character design')) {
      score = 80;
    } else if (base.includes('monster design') || base.includes('mechanical design') || base.includes('prop design') || base.includes('design works') || base.includes('creature design') || base.includes('clothing design')) {
      score = 78;
    } else if (base.includes('script') || base.includes('screenplay') || base.includes('adaptation')) {
      score = 75;
    } else if (base.includes('music') || base.includes('composer')) {
      score = 70;
    } else if (base.includes('chief animation director')) {
      score = 65;
    } else if (base.includes('animation director') || base.includes('action director') || base.includes('supervisor')) {
      score = 62;
    } else if (base.includes('art director') || base.includes('art board') || base.includes('art design')) {
      score = 60;
    } else if (base.includes('storyboard')) {
      score = 58;
    } else if (base.includes('episode director') || (base.includes('director') && base.includes('unit')) || base.includes('unit director')) {
      score = 57;
    } else if (base.includes('sound director') || base.includes('sound direction')) {
      score = 56;
    } else if (base.includes('key animation')) {
      score = 55;
    } else if (base.includes('director of photography') || base.includes('photography')) {
      score = 53;
    } else if (base.includes('background art') || base.includes('color design') || base.includes('art board')) {
      score = 52;
    } else if (base.includes('layout')) {
      score = 50;
    } else if (base.includes('producer') && !base.includes('assistant')) {
      score = 45;
    } else if (base.includes('planning')) {
      score = 40;
    } else if (base.includes('theme song')) {
      score = 30; // Performance default
      if (base.includes('composition') || base.includes('lyrics') || base.includes('arrangement')) {
        score = 35; // Writers/Composers prioritized over performers
      }
    } else if (base.includes('editing')) {
      score = 35;
    } else if (base.includes('in-between') || base.includes('finishing') || base.includes('paint')) {
      score = 25;
    } else if (base.includes('assistant') || base.includes('production manager') || base.includes('coordinator')) {
      score = 20;
    } else if (base.includes('special thanks') || base.includes('sponsor') || base.includes('publicity') || base.includes('committee')) {
      score = 5;
    }
  }
  
  // 4. Nuance Modifiers
  if (base.includes('chief') || base.includes('executive')) score += 3;
  if (base.includes('assistant') || base.includes('associate')) score -= 5;
  if (info.includes('op') || info.includes('ed')) score += 2;
  
  // 5. Episode Count Tie-Breaker (Max 0.5 bonus to prevent tier jumping)
  const epCount = parseEpisodeCount(info);
  score += Math.min(epCount * 0.01, 0.5);
  
  return score;
};
