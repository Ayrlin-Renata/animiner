/**
 * js/ui/components/results/ResultCard.js
 * Component for rendering result cards for various media types.
 */

import { state } from '../../../state.js';
import { openModal } from '../../modal/index.js';
import { attachTooltip } from '../tooltip.js';

/**
 * Creates a result card element for a given item.
 * @param {Object} item - The media item to render.
 * @returns {HTMLElement} The card element.
 */
export function createResultCard(item) {
    const id = item.id;
    const mode = state.searchMode;

    // Track ID uniquely for this search session
    state.renderedIds.add(id);

    // STATUS BADGE CALCULATIONS (High priority wins: Blacklist > Watch > Seen)
    let badgeType = null;
    let badgeIcon = '';

    const isBlacklisted = (state.blacklist[mode] || []).some(b => (typeof b === 'object' ? b.id : b) === id);
    const isWatched = (state.watched[mode] || []).some(w => (typeof w === 'object' ? w.id : w) === id);
    const isSeen = (state.seen[mode] || []).some(s => (typeof s === 'object' ? s.id : s) === id);

    if (isBlacklisted) {
        badgeType = 'badge-blacklisted';
        badgeIcon = 'shield-off';
    } else if (isWatched) {
        badgeType = 'badge-watched';
        badgeIcon = 'check-circle';
    } else if (isSeen) {
        badgeType = 'badge-seen';
        badgeIcon = 'eye';
    }

    const card = document.createElement('div');
    card.className = 'media-card glass';
    card.dataset.id = id;
    card.dataset.type = 'media-card';

    let badgeHtml = badgeType ? `<div class="badge-corner ${badgeType}"><i data-lucide="${badgeIcon}"></i></div>` : '';

    // Add partial match indicator (Yellow circle in top left)
    if (item._isPartialMatch) {
        badgeHtml += `<div class="match-indicator-mini yellow" title="Matches core filters but fails specific relation rules"><i data-lucide="x-circle"></i></div>`;
    }

    let title = '';
    let image = '';
    let meta = '';

    if (state.searchMode === 'MEDIA') {
        title = item.title.english || item.title.romaji;
        image = item.coverImage.large;
        meta = `<span class="tag">${item.format || ''}</span> <span>${item.startDate?.year || '?'}</span>`;
    } else if (state.searchMode === 'CHARACTER' || state.searchMode === 'STAFF') {
        title = item.name.full;
        image = item.image.large;
        meta = `<span>${item.gender || 'Unknown'}</span>`;
    } else if (state.searchMode === 'STUDIO') {
        title = item.name;
        image = item.media?.nodes?.[0]?.coverImage?.medium || '';
        meta = `<span>${item.isAnimationStudio ? 'Studio' : 'Office'}</span>`;
    } else if (state.searchMode === 'USER') {
        title = item.name;
        image = item.avatar.large;
        meta = `<span>User</span>`;
    }

    const details = item._matchDetails || {};
    let reasonHtml = '';

    // 1. Tags (Max 5)
    const matchedTags = [...(details['tags.name'] || []), ...(details['genres'] || [])].filter(t => !t.startsWith('regex:'))
.map(t => t.startsWith('badge:') ? t.substring(6) : t);
    const visibleTags = matchedTags.slice(0, 5);
    reasonHtml += visibleTags.map(t => `<span class="match-badge">${t}</span>`).join('');

    // 2. Keywords (Description matches, distinct style)
    const keywords = (details['description'] || []).filter(t => !t.startsWith('regex:'))
.map(t => t.startsWith('badge:') ? t.substring(6) : t);
    if (keywords.length > 0) {
        reasonHtml += keywords.slice(0, 5).map(kw => `<span class="keyword-badge">${kw}</span>`).join('');
    }

    card.innerHTML = `
      ${badgeHtml}
      <img src="${image || 'https://via.placeholder.com/200x300?text=No+Image'}" alt="${title}" loading="lazy">
      <div class="card-actions-top">
        <button class="action-card-btn seen-btn ${isSeen ? 'active' : ''}" title="${isSeen ? 'Unmark Seen' : 'Mark as Seen'}" onclick="event.stopPropagation(); window.toggleSeen(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}', undefined, '${item.type || 'ANIME'}')">
          <i data-lucide="eye"></i>
        </button>
        <button class="action-card-btn watched-btn ${isWatched ? 'active' : ''}" title="${isWatched ? 'Unmark Watched' : 'Mark as Watched'}" onclick="event.stopPropagation(); window.toggleWatched(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}', undefined, '${item.type || 'ANIME'}')">
          <i data-lucide="check-circle"></i>
        </button>
        <button class="action-card-btn block-btn ${isBlacklisted ? 'active' : ''}" title="${isBlacklisted ? 'Remove Block' : 'Block this result'}" onclick="event.stopPropagation(); window.toggleBlacklist(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}', undefined, '${item.type || 'ANIME'}')">
          <i data-lucide="shield-off"></i>
        </button>
      </div>
      <div class="info">
        <h3>${title}</h3>
        <div class="meta">${meta}</div>
        <div class="match-reasons">${reasonHtml}</div>
      </div>
    `;

    // ATTACH TOOLTIP IF PARTIAL MATCH
    if (item._isPartialMatch && item._filterFailReason) {
        const indicator = card.querySelector('.match-indicator-mini');
        if (indicator) {
            attachTooltip(indicator, `Partial Match: ${item._filterFailReason}`);
        }
    }

    card.addEventListener('click', () => openModal(item));

    if (window.lucide) window.lucide.createIcons({ root: card });

    return card;
}
