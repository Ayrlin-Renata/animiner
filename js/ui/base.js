/**
 * js/ui/base.js
 * UI Base Registry and State Sync.
 */

import { state } from '../state.js';

export const UI = {
  mainSearch: document.getElementById('mainSearch'),
  searchMode: document.getElementById('searchMode'),
  targetResults: document.getElementById('targetResults'),
  mediaSort: document.getElementById('mediaSort'),
  mediaType: document.getElementById('mediaType'),
  searchBtn: document.getElementById('searchBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  addRuleBtn: document.getElementById('addRuleBtn'),
  addGroupBtn: document.getElementById('addGroupBtn'),
  blacklistBtn: document.getElementById('blacklistBtn'),
  watchedBtn: document.getElementById('watchedBtn'),
  seenBtn: document.getElementById('seenBtn'),
  shareBtn: document.getElementById('shareBtn'),
  toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
  filterContent: document.getElementById('filterContent'),
  rootGroup: document.getElementById('rootGroup'),
  resultsGrid: document.getElementById('resultsGrid'),
  loading: document.getElementById('loading'),
  noResults: document.getElementById('noResults'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalContent: document.getElementById('modalContent'),
  closeModal: document.getElementById('closeModal'),
  datalistContainer: document.getElementById('datalistContainer'),
  progressBanner: document.getElementById('progressBanner'),
  scannedCount: document.getElementById('scannedCount'),
  foundCount: document.getElementById('foundCount'),
  scanStatus: document.getElementById('scanStatus'),
  rateLimitNotice: document.getElementById('rateLimitNotice'),
  filterSearchBtn: document.getElementById('filterSearchBtn'),
  addRelationBtn:  document.getElementById('addRelationBtn'),
  showWatchedToggle: document.getElementById('showWatchedToggle'),
  showSeenToggle: document.getElementById('showSeenToggle'),
  showBlacklistedToggle: document.getElementById('showBlacklistedToggle'),
  storageConsent: document.getElementById('storageConsent'),
  acceptStorage: document.getElementById('acceptStorage'),
  declineStorage: document.getElementById('declineStorage'),
  importBtn: document.getElementById('importBtn'),
  startPage: document.getElementById('startPage'),
  langSelect: document.getElementById('langSelect'),
};

/**
 * Updates the datalist with unique values seen during the session.
 */
export function updateDatalist() {
  if (!UI.datalistContainer) return;
  
  UI.datalistContainer.innerHTML = '';
  
  Object.keys(state.seenValues).forEach(key => {
    const values = state.seenValues[key];
    if (Array.isArray(values) && values.length > 0) {
      const dl = document.createElement('datalist');
      dl.id = `dl-${key}`;
      
      values.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        dl.appendChild(opt);
      });
      
      UI.datalistContainer.appendChild(dl);
    }
  });

  // Also update any existing comboboxes that depend on seen values
  document.querySelectorAll('.combobox-input[data-seen-key]').forEach(input => {
    const key = input.dataset.seenKey;
    const values = state.seenValues[key] || [];
    const results = input.parentNode.querySelector('.combobox-results');
    if (results && results.classList.contains('show')) {
        input.dispatchEvent(new Event('input'));
    }
  });
}

/**
 * Synchronizes the global search controls with current state.
 */
export function syncUI() {
    if (UI.searchMode) UI.searchMode.value = state.searchMode;
    if (UI.targetResults) UI.targetResults.value = state.targetMatches;
    if (UI.startPage) UI.startPage.value = state.startPage;
    if (UI.mediaType) UI.mediaType.value = state.mediaType;
    if (UI.mediaSort) UI.mediaSort.value = state.sort;
    if (UI.langSelect) UI.langSelect.value = state.locale;
    
    const isMedia = state.searchMode === 'MEDIA';
    const sortCtrl = document.getElementById('mediaSortControl');
    const typeCtrl = document.getElementById('mediaTypeControl');
    if (sortCtrl) sortCtrl.style.display = isMedia ? 'flex' : 'none';
    if (typeCtrl) typeCtrl.style.display = isMedia ? 'flex' : 'none';

    updateToggleFilterAccent();
}

/**
 * Accents the toggle filters button and shows/hides the filter summary banner.
 */
export function updateToggleFilterAccent() {
    const btn = UI.toggleFiltersBtn;
    if (!btn) return;

    const rootGroup = UI.rootGroup;
    const ruleCount  = rootGroup ? rootGroup.querySelectorAll('.rule-row').length : 0;
    const groupCount = rootGroup ? rootGroup.querySelectorAll('.rule-group-box').length : 0;
    const totalCount = ruleCount + groupCount;

    btn.classList.toggle('has-filters', totalCount > 0);

    // Inject banner once, then update content
    let banner = document.getElementById('filterSummaryBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'filterSummaryBanner';
        banner.className = 'filter-summary-banner hidden';
        // Insert after the constraint-builder heading
        const heading = document.querySelector('.constraint-builder h3');
        if (heading) heading.after(banner);
    }

    const isHidden = UI.filterContent?.classList.contains('hidden-height');
    if (totalCount > 0 && isHidden) {
        banner.innerHTML = `
            <div class="filter-summary-stats">
                <div class="stat">
                    <span class="stat-label">${i18n.t('labels.constraints')}</span>
                    <span class="stat-value highlight">${ruleCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">${i18n.t('labels.groups')}</span>
                    <span class="stat-value">${groupCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">${i18n.t('labels.status')}</span>
                    <span class="stat-value" style="color: var(--accent-hover); font-size: 1rem;">${i18n.t('labels.active')}</span>
                </div>
            </div>
        `;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}
