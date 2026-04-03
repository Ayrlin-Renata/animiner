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

window.getStaffPriority = function(role) {
  const r = (role || '').toLowerCase();
  let score = 30;
  
  if (r.includes('adr') || r.includes('dubbing') || r.includes('casting') || 
      r.includes('localization') || r.includes('publicity') || r.includes('translation')) {
    return 10;
  }
  
  if (r.includes('original creator') || r.includes('original story') || r.includes('story & art')) score = 100;
  else if (r.includes('director') && !r.includes('assistant') && !r.includes('unit')) score = 90;
  else if (r.includes('series composition')) score = 85;
  else if (r.includes('character design') || r.includes('original character design')) score = 80;
  else if (r.includes('script') || r.includes('screenplay')) score = 75;
  else if (r.includes('music') || r.includes('composer')) score = 70;
  else if (r.includes('chief animation director')) score = 65;
  else if (r.includes('animation director') || r.includes('action director')) score = 62;
  else if (r.includes('art director')) score = 60;
  else if (r.includes('key animation') || r.includes('layout')) score = 55;
  else if (r.includes('background art') || r.includes('color design')) score = 50;
  else if (r.includes('producer')) score = 45;
  else if (r.includes('sound direction') || r.includes('sound director')) score = 40;
  else if (r.includes('in-between') || r.includes('finishing')) score = 25;
  else if (r.includes('assistant') || r.includes('production manager') || r.includes('coordinator')) score = 20;
  
  if (r.includes('chief') || r.includes('executive')) score += 5;
  if (r.includes('assistant') || r.includes('unit')) score -= 15;
  
  return score;
};
