import { state, loadCache, saveSettings, loadSettings } from './state.js';
import { auth } from './api/auth.js';
import { UI, addRuleUI, addGroupUI, addRelationGroupUI, resetUI, updateProgress, renderResultsList, syncUI, toggleFilters, updateToggleFilterAccent } from './ui.js';
import { getDragAfterElement, resetDragState } from './ui/builder.js';
import { executeSearch } from './api.js';
import { openBlacklistManager, openWatchedManager, openSeenManager, openImportModal } from './ui/modal/index.js';
import { FIELDS, SUB_FIELDS, RELATION_FIELDS } from './filter.js';
import { compressFilterData, decompressFilterData } from './compression.js';
import { validateFilters } from './validation.js';
import { showSearchWarning } from './ui/modal/warning.js';
import * as i18n from './i18n.js';

async function init() {
  window.authLogin = () => auth.login();
  await loadCache();
  await i18n.init();
  i18n.localizeDOM();
  loadSettings();
  
  // Storage Consent Logic
  if (state.storageConsent === null) {
    setTimeout(() => {
        UI.storageConsent?.classList.add('show');
    }, 1000);
  }

  UI.acceptStorage.onclick = () => {
    state.storageConsent = true;
    UI.storageConsent?.classList.remove('show');
    saveSettings();
  };

  UI.declineStorage.onclick = () => {
    state.storageConsent = false;
    UI.storageConsent?.classList.remove('show');
    // No saveSettings here ensures we remain in "Session Only" mode
  };
  
  // AniList OAuth Callback
  const alToken = auth.handleCallback();
  if (alToken) {
      setTimeout(() => {
          if (window.openImportModal) window.openImportModal();
      }, 500);
  }

  // Import Button
  if (UI.importBtn) {
    UI.importBtn.onclick = () => {
        if (window.openImportModal) window.openImportModal();
    };
  }
  
  // URL Overrides (Compressed)
  const urlParams = new URLSearchParams(window.location.search);
  const filterData = urlParams.get('f');
  if (filterData) {
    const decompressed = decompressFilterData(filterData);
    if (decompressed) {
        state.searchMode = decompressed.searchMode || state.searchMode;
        state.targetMatches = decompressed.targetMatches || state.targetMatches;
        state.startPage = decompressed.startPage || state.startPage;
        state.sort = decompressed.sort || state.sort;
        state.mediaType = decompressed.mediaType || state.mediaType;
        state.rules = decompressed.rules || [];

        // Clear the URL to prevent subsequent refreshes from overriding localStorage
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('f');
        window.history.replaceState({}, '', newUrl.toString());
    }
  }

  // Initial UI state - do this AFTER state is finalized from URL
  if (state.rules.length > 0) {
    resetUI(true);
    state.rules.forEach(rule => {
      if (rule.type === 'GROUP') {
        addGroupUI(rule);
      } else if (rule.type === 'RELATION') {
        addRelationGroupUI(rule);
      } else {
        addRuleUI(rule);
      }
    });
    syncUI();
  } else {
    resetUI();
  }
  
  // Event listeners
  const runSearch = () => {
    updateStateFromUI();
    
    // Pre-search validation
    const warnings = validateFilters(state.rules);
    if (warnings.length > 0) {
        showSearchWarning(warnings, () => {
            // Callback for "Search Anyway"
            proceedWithSearch();
        });
    } else {
        proceedWithSearch();
    }
  };

  const proceedWithSearch = () => {
    toggleFilters(true); // Auto-collapse on search
    
    // Clear results grid and tracking before new search
    renderResultsList([], true); 

    executeSearch(updateProgress, (results) => {
      renderResultsList(results, false); // Results are already built up incrementally in onProgress
    });
  };

  UI.searchBtn.onclick = runSearch;

  if (UI.filterSearchBtn) {
    UI.filterSearchBtn.onclick = runSearch;
  }

  UI.cancelBtn.onclick = () => {
    state.isCancelled = true;
  };

  UI.addRuleBtn.onclick    = () => { addRuleUI();            updateToggleFilterAccent(); };
  UI.addGroupBtn.onclick   = () => { addGroupUI();           updateToggleFilterAccent(); };
  if (UI.addRelationBtn) {
    UI.addRelationBtn.onclick = () => { addRelationGroupUI(); updateToggleFilterAccent(); };
  }

  // Watch rootGroup for rule removals to update accent and auto-save
  if (UI.rootGroup) {
    new MutationObserver(() => updateToggleFilterAccent())
      .observe(UI.rootGroup, { childList: true, subtree: false });
    
    // Auto-save on any change within the builder
    UI.rootGroup.addEventListener('change', () => updateStateFromUI());
    UI.rootGroup.addEventListener('input', () => {
        // debounce slightly for performance
        clearTimeout(window._saveTimer);
        window._saveTimer = setTimeout(() => updateStateFromUI(), 500);
    });
  }

  UI.searchMode.onchange = (e) => {
    state.searchMode = e.target.value;
    resetUI();
    saveSettings();
  };

  UI.targetResults.onchange = () => {
    updateStateFromUI();
    saveSettings();
  };

  UI.startPage.onchange = () => {
    updateStateFromUI();
    saveSettings();
  };

  if (UI.mediaType) {
    UI.mediaType.onchange = () => {
        updateStateFromUI();
        saveSettings();
    };
  }

  if (UI.mediaSort) {
    UI.mediaSort.onchange = () => {
        updateStateFromUI();
        saveSettings();
    };
  }

  UI.closeModal.onclick = () => {
    UI.modalOverlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
  };

  UI.modalOverlay.onclick = (e) => {
    if (e.target === UI.modalOverlay) {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
  };

  if (UI.blacklistBtn) {
    UI.blacklistBtn?.addEventListener('click', () => openBlacklistManager('ALL'));
  }
  UI.watchedBtn?.addEventListener('click', () => openWatchedManager('ALL'));
  
  if (UI.seenBtn) {
    UI.seenBtn.addEventListener('click', () => openSeenManager('ALL'));
  }
  
  const showWatchedToggle = document.getElementById('showWatchedToggle');
  if (showWatchedToggle) {
    showWatchedToggle.checked = state.showWatched;
    showWatchedToggle.addEventListener('change', (e) => {
      state.showWatched = e.target.checked;
      saveSettings();
      // Immediate refresh of the current results view (Full re-render for toggle changes)
      renderResultsList(state.results, true);
    });
  }

  const showSeenToggle = document.getElementById('showSeenToggle');
  if (showSeenToggle) {
    showSeenToggle.checked = state.showSeen;
    showSeenToggle.addEventListener('change', (e) => {
      state.showSeen = e.target.checked;
      saveSettings();
      // Seen items are NOT removed immediately from current results,
      // but we still refresh to show/hide based on the toggle. (Full re-render)
      renderResultsList(state.results, true);
    });
  }

  const showBlacklistedToggle = document.getElementById('showBlacklistedToggle');
  if (showBlacklistedToggle) {
    showBlacklistedToggle.checked = state.showBlacklisted;
    showBlacklistedToggle.addEventListener('change', (e) => {
      state.showBlacklisted = e.target.checked;
      saveSettings();
      // Full re-render for visibility toggle
      renderResultsList(state.results, true);
    });
  }

  const showRelationFilteredToggle = document.getElementById('showRelationFilteredToggle');
  if (showRelationFilteredToggle) {
    showRelationFilteredToggle.checked = state.showRelationFiltered;
    showRelationFilteredToggle.addEventListener('change', (e) => {
      state.showRelationFiltered = e.target.checked;
      saveSettings();
      // Instant refresh of results logic
      renderResultsList(state.results, true);
    });
  }

  if (UI.toggleFiltersBtn) {
    UI.toggleFiltersBtn.onclick = () => toggleFilters();
  }

  if (UI.shareBtn) {
    UI.shareBtn.onclick = () => {
        updateStateFromUI();
        const encoded = compressFilterData(state);
        const url = new URL(window.location.href);
        url.searchParams.set('f', encoded);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            const originalHTML = UI.shareBtn.innerHTML;
            UI.shareBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
            setTimeout(() => {
                UI.shareBtn.innerHTML = originalHTML;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
        });
    };
  }

  UI.rootGroup.dataset.accepts = 'MEDIA';

  UI.rootGroup.ondragover = (e) => {
    const draggable = window.draggedElement;
    if (!draggable) return;

    // Validation Check
    const context = draggable.dataset.context;
    const accepts = UI.rootGroup.dataset.accepts;
    const isCompatible = (context === accepts) || (context === 'GROUP' && accepts === 'MEDIA');

    const indicator = document.getElementById('dropIndicator');

    if (!isCompatible) {
        UI.rootGroup.classList.add('drag-invalid');
        if (indicator) indicator.classList.add('hidden');
        return;
    }

    e.preventDefault();
    UI.rootGroup.classList.remove('drag-invalid');
    if (indicator) indicator.classList.remove('hidden');

    const container = UI.rootGroup;
    const afterElement = getDragAfterElement(container, e.clientY, draggable);
    
    if (indicator) {
        if (afterElement == null) {
            container.appendChild(indicator);
        } else {
            container.insertBefore(indicator, afterElement);
        }
    }
  };

  UI.rootGroup.ondragenter = (e) => {
    e.preventDefault();
    UI.rootGroup.classList.add('drag-over');
  };
  UI.rootGroup.ondragleave = (e) => {
    if (!UI.rootGroup.contains(e.relatedTarget)) {
        UI.rootGroup.classList.remove('drag-over');
        UI.rootGroup.classList.remove('drag-invalid');
    }
  };
  UI.rootGroup.ondrop = (e) => {
    e.preventDefault();
    const draggable = window.draggedElement;
    const indicator = document.getElementById('dropIndicator');
    const container = UI.rootGroup;

    if (draggable && !container.classList.contains('drag-invalid')) {
        if (indicator && indicator.parentElement === container) {
            container.insertBefore(draggable, indicator);
        }
    }
    resetDragState();
  };

  // Debug tool
  window.exportFilters = () => {
    console.log("Current Filter State (for debugging):");
    console.log(JSON.stringify(state.rules, null, 2));
  };

  // Ensure icons are initialized
  if (window.lucide) window.lucide.createIcons();
}

function updateStateFromUI() {
  state.groupRefs = {}; // Reset before collection
  state.rules = collectRulesRecursive(UI.rootGroup);
  state.targetMatches = parseInt(UI.targetResults?.value || '50');
  state.startPage = parseInt(UI.startPage?.value || '1');
  state.sort = UI.mediaSort?.value || state.sort;
  state.mediaType = UI.mediaType?.value || state.mediaType;
  saveSettings();
}

function collectRulesRecursive(container) {
  const rules = [];
  Array.from(container.children).forEach(child => {
    if (child.classList.contains('rule-row')) {
      const rule = parseRuleRow(child);
      if (rule) rules.push(rule);
    } else if (child.classList.contains('rule-group-box')) {
      if (child.dataset.type === 'RELATION') {
        const rel = parseRelationBox(child);
        if (rel) rules.push(rel);
      } else {
        const group = parseGroupbox(child);
        if (group) rules.push(group);
      }
    }
  });
  return rules;
}

function parseRelationBox(box) {
  const checkboxes = Array.from(box.querySelectorAll('.multi-select-dropdown input:checked')).map(cb => cb.value);
  const relationTypes = checkboxes.length ? checkboxes : ['ANY'];
  const reqSelect = box.querySelector('.group-requirement');
  const isOptional = reqSelect ? reqSelect.value === 'OPTIONAL' : false;

  const quantifier   = box.querySelector('.group-quantifier')?.value || 'NONE';
  const alias        = box.querySelector('.group-label-input')?.value.trim() || undefined;
  const collapsed    = box.classList.contains('collapsed');
  const container    = box.querySelector('.group-rules-container');
  
  const rule = {
    type: 'RELATION',
    relationTypes,
    quantifier,
    isOptional,
    alias,
    collapsed,
    rules: collectRulesRecursive(container)
  };
  
  if (alias) state.groupRefs[alias] = rule;
  return rule;
}

function parseRuleRow(row) {
  const path = row.dataset.path;
  const type = row.dataset.type;
  const label = row.dataset.label;

  if (!path) return null;

  return {
    path,
    label,
    type,
    operator: row.querySelector('.op-select').value,
    value: (row.querySelector('.val-input') || row.querySelector('.val-select'))?.value || ''
  };
}

function parseGroupbox(box) {
  const path = box.querySelector('.group-path').value;
  const quantifier = box.querySelector('.group-quantifier').value;
  const alias = box.querySelector('.group-label-input')?.value.trim() || undefined;
  const collapsed = box.classList.contains('collapsed');
  const container = box.querySelector('.group-rules-container');
  
  const rule = {
    type: 'GROUP',
    path,
    quantifier,
    alias,
    collapsed,
    rules: collectRulesRecursive(container)
  };
  
  if (alias) state.groupRefs[alias] = rule;
  return rule;
}

// Trigger search (externally callable)
export function runSearch() {
  document.getElementById('runSearchBtn')?.click();
}

window.runSearch = runSearch;

// Global initialization
window.addEventListener('DOMContentLoaded', init);
