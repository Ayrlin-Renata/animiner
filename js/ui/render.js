/**
 * js/ui/render.js
 * Rendering results and progress management.
 */

import { UI, updateDatalist } from './base.js';
import { state } from '../state.js';
import { openModal } from './modal/index.js';
import { filterResults } from '../filter.js';

/**
 * Updates the progress banner with current search status.
 */
export function updateProgress(data) {
  if (!UI.progressBanner) return;

  UI.progressBanner.classList.remove('hidden');

  // Toggle buttons visibility based on scanning state
  if (state.isScanning) {
    UI.searchBtn?.classList.add('hidden');
    UI.cancelBtn?.classList.remove('hidden');
  } else {
    UI.searchBtn?.classList.remove('hidden');
    UI.cancelBtn?.classList.add('hidden');
  }

  if (data.status) {
    UI.scanStatus.textContent = data.status;
  }

  if (data.scanned !== undefined) UI.scannedCount.textContent = data.scanned;
  if (data.found !== undefined) UI.foundCount.textContent = data.found;

  if (data.rateLimit) {
    UI.rateLimitNotice.classList.remove('hidden');
  } else {
    UI.rateLimitNotice.classList.add('hidden');
  }

  // Clear previous results on new scan start (Page 1)
  if (state.isScanning && state.page === 1 && (!data.filteredItems || data.filteredItems.length === 0)) {
    renderResultsList([], true); // Force clear
    UI.noResults?.classList.add('hidden');
  }

  if (data.filteredItems && data.filteredItems.length > 0) {
    renderResultsList(data.filteredItems, false); // Incremental
  }

  // Refresh datalist as new values come in
  updateDatalist();
}

/**
 * Renders a list of items to the results grid.
 */
export function renderResultsList(rawItems, forceClear = false) {
  if (!UI.resultsGrid) return;

  // 1. Handle Full Clear (New search or toggle change)
  if (forceClear) {
    UI.resultsGrid.innerHTML = '';
    state.renderedIds.clear();
  }

  // 2. Filter raw items
  const items = filterResults(rawItems, state.rules);

  if (items.length === 0 && forceClear) {
    if (!state.isScanning) UI.noResults.classList.remove('hidden');
    return;
  }
  
  if (items.length > 0) {
    UI.noResults.classList.add('hidden');
  }

  // 3. Identify ONLY new items to append
  const newItems = items.filter(item => !state.renderedIds.has(item.id));
  if (newItems.length === 0) return;

  const fragment = document.createDocumentFragment();

  newItems.forEach(item => {
    const id = item.id;
    const mode = state.searchMode;
    
    // Track ID
    state.renderedIds.add(id);

    // STATUS BADGE CALCULATIONS (High priority wins)
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

    // Winning Conditions (Badges)
    const details = item._matchDetails || {};
    let reasonHtml = '';

    // 1. Tags (Max 5)
    const matchedTags = [...(details['tags.name'] || []), ...(details['genres'] || [])];
    const visibleTags = matchedTags.slice(0, 5);
    reasonHtml += visibleTags.map(t => `<span class="match-badge">${t}</span>`).join('');

    // 2. Keywords (Description matches, distinct style)
    const keywords = details['description'] || [];
    if (keywords.length > 0) {
      reasonHtml += keywords.slice(0, 5).map(kw => `<span class="keyword-badge">${kw}</span>`).join('');
    }

    card.innerHTML = `
      ${badgeHtml}
      <img src="${image || 'https://via.placeholder.com/200x300?text=No+Image'}" alt="${title}" loading="lazy">
      <div class="card-actions-top">
        <button class="action-card-btn watched-btn ${isWatched ? 'active' : ''}" title="${isWatched ? 'Unmark Watched' : 'Mark as Watched'}" onclick="event.stopPropagation(); window.toggleWatched(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}')">
          <i data-lucide="check-circle"></i>
        </button>
        <button class="action-card-btn block-btn ${isBlacklisted ? 'active' : ''}" title="${isBlacklisted ? 'Remove Block' : 'Block this result'}" onclick="event.stopPropagation(); window.blockItem(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}')">
          <i data-lucide="shield-off"></i>
        </button>
      </div>
      <div class="info">
        <h3>${title}</h3>
        <div class="meta">${meta}</div>
        <div class="match-reasons">${reasonHtml}</div>
      </div>
    `;

    card.addEventListener('click', () => openModal(item));
    fragment.appendChild(card);
  });

  UI.resultsGrid.appendChild(fragment);

  // Scoped icon creation is much faster than scanning the whole page
  if (window.lucide) {
      window.lucide.createIcons({ 
          root: UI.resultsGrid // Target just the results grid or the fragment (using the grid here as it's the parent)
      });
  }
}
