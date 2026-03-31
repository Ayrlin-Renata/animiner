/**
 * js/ui/render.js
 * Rendering results and progress management.
 */

import { UI, updateDatalist } from './base.js';
import { state } from '../state.js';
import { openModal } from './modal.js';

/**
 * Updates the progress banner with current search status.
 */
export function updateProgress(data) {
  if (!UI.progressBanner) return;

  UI.progressBanner.classList.remove('hidden');
  
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

  if (data.filteredItems && data.filteredItems.length > 0) {
    renderResultsList(data.filteredItems);
  }
  
  // Refresh datalist as new values come in
  updateDatalist();
}

/**
 * Renders a list of items to the results grid.
 */
export function renderResultsList(items) {
  if (!UI.resultsGrid) return;
  
  if (items.length === 0 && !state.isScanning) {
    UI.resultsGrid.innerHTML = '';
    UI.noResults.classList.remove('hidden');
    return;
  }
  UI.noResults.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'media-card glass';
    
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

    card.innerHTML = `
      <img src="${image || 'https://via.placeholder.com/200x300?text=No+Image'}" alt="${title}" loading="lazy">
      <button class="block-card-btn" title="Block this result" onclick="event.stopPropagation(); window.blockItem(${item.id}, '${(title || '').replace(/'/g, "\\'")}', '${image || ''}')">
        <i data-lucide="shield-off"></i>
      </button>
      <div class="info">
        <h3>${title}</h3>
        <div class="meta">${meta}</div>
      </div>
    `;
    
    card.addEventListener('click', () => openModal(item));
    fragment.appendChild(card);
  });
  
  UI.resultsGrid.innerHTML = '';
  UI.resultsGrid.appendChild(fragment);
  if (window.lucide) window.lucide.createIcons();
}
