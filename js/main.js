import { state, loadCache, saveSettings, loadSettings } from './state.js';
import { UI, addRuleUI, addGroupUI, resetUI, updateProgress, renderResultsList, syncUI, toggleFilters, openBlacklistManager, updateToggleFilterAccent } from './ui.js';
import { executeSearch } from './api.js';
import { FIELDS, SUB_FIELDS } from './filter.js';

async function init() {
  await loadCache();
  const hasSavedSettings = loadSettings();
  
  // Event listeners
  const runSearch = () => {
    updateStateFromUI();
    toggleFilters(true); // Auto-collapse on search
    executeSearch(updateProgress, (results) => {
      renderResultsList(results);
    });
  };

  UI.searchBtn.onclick = runSearch;

  // Bottom filter search button mirrors main search
  if (UI.filterSearchBtn) {
    UI.filterSearchBtn.onclick = runSearch;
  }

  UI.cancelBtn.onclick = () => {
    state.isCancelled = true;
  };

  UI.addRuleBtn.onclick = () => { addRuleUI(); updateToggleFilterAccent(); };
  UI.addGroupBtn.onclick = () => { addGroupUI(); updateToggleFilterAccent(); };

  // Watch rootGroup for rule removals to update accent
  if (UI.rootGroup) {
    new MutationObserver(() => updateToggleFilterAccent())
      .observe(UI.rootGroup, { childList: true, subtree: false });
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

  UI.closeModal.onclick = () => {
    UI.modalOverlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
  };

  // Close modal on click outside
  UI.modalOverlay.onclick = (e) => {
    if (e.target === UI.modalOverlay) {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
  };

  // Initial UI state
  const urlParams = new URLSearchParams(window.location.search);
  const filterData = urlParams.get('f');
  
  let rulesToLoad = state.rules;

  if (filterData) {
    try {
        const decoded = JSON.parse(decodeURIComponent(atob(filterData)));
        state.searchMode = decoded.m || state.searchMode;
        state.rules = decoded.r || [];
        rulesToLoad = state.rules;
    } catch (e) { console.error('Failed to parse URL filters'); }
  }

  if (rulesToLoad.length > 0) {
    resetUI(true);
    rulesToLoad.forEach(rule => {
      if (rule.type === 'GROUP') {
        addGroupUI(rule);
      } else {
        addRuleUI(rule);
      }
    });
    syncUI();
  } else {
    resetUI();
  }

  // Blacklist manager logic
  if (UI.blacklistBtn) {
    UI.blacklistBtn.onclick = () => openBlacklistManager();
  }

  // Toggle Filters logic
  if (UI.toggleFiltersBtn) {
    UI.toggleFiltersBtn.onclick = () => toggleFilters();
  }

  // Share button logic
  if (UI.shareBtn) {
    UI.shareBtn.onclick = () => {
        updateStateFromUI();
        const data = {
            m: state.searchMode,
            r: state.rules
        };
        const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
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
}

function updateStateFromUI() {
  state.rules = collectRulesRecursive(UI.rootGroup);
  state.targetMatches = parseInt(UI.targetResults.value || '50');
  saveSettings();
}

function collectRulesRecursive(container) {
  const rules = [];
  
  // Direct children can be rule-rows or rule-group-boxes
  const children = Array.from(container.children);
  
  children.forEach(child => {
    if (child.classList.contains('rule-row')) {
      const rule = parseRuleRow(child);
      if (rule) rules.push(rule);
    } else if (child.classList.contains('rule-group-box')) {
      const group = parseGroupbox(child);
      if (group) rules.push(group);
    }
  });
  
  return rules;
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
  const container = box.querySelector('.group-rules-container');
  
  return {
    type: 'GROUP',
    path,
    quantifier,
    rules: collectRulesRecursive(container)
  };
}

// Global initialization
window.addEventListener('DOMContentLoaded', init);
