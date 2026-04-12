/**
 * js/ui/render.js
 * Rendering results and progress management.
 */

import { UI, updateDatalist } from './base.js';
import { state } from '../state.js';
import { filterResults } from '../filter.js';
import { createResultCard } from './components/results/index.js';

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

  // Handle explicit API errors
  const errorNotice = document.getElementById('errorNotice');
  if (data.error) {
    UI.scanStatus.classList.add('danger-text');
    if (errorNotice) {
      errorNotice.classList.remove('hidden');
      errorNotice.querySelector('span').textContent = 'API Error: ' + data.error;
    }
  } else {
    UI.scanStatus.classList.remove('danger-text');
    if (errorNotice) errorNotice.classList.add('hidden');
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
    const card = createResultCard(item);
    fragment.appendChild(card);
  });

  UI.resultsGrid.appendChild(fragment);

  // Scoped icon creation is much faster than scanning the whole page
  if (window.lucide) {
    window.lucide.createIcons({
      root: UI.resultsGrid
    });
  }
}
