import { state, loadCache, saveSettings, loadSettings } from './state.js';
import { UI, addRuleUI, addGroupUI, addRelationGroupUI, resetUI, updateProgress, renderResultsList, syncUI, toggleFilters, openBlacklistManager, updateToggleFilterAccent } from './ui.js';
import { executeSearch } from './api.js';
import { FIELDS, SUB_FIELDS } from './filter.js';

async function init() {
  await loadCache();
  loadSettings();
  
  // URL Overrides
  const urlParams = new URLSearchParams(window.location.search);
  const filterData = urlParams.get('f');
  if (filterData) {
    try {
        const decoded = JSON.parse(decodeURIComponent(atob(filterData)));
        state.searchMode = decoded.m    || state.searchMode;
        state.targetMatches = decoded.t || state.targetMatches;
        state.sort = decoded.s          || state.sort;
        state.mediaType = decoded.y     || state.mediaType;
        state.rules = decoded.r         || [];
    } catch (e) { console.error('Failed to parse URL filters'); }
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
    toggleFilters(true); // Auto-collapse on search
    executeSearch(updateProgress, (results) => {
      renderResultsList(results);
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

  UI.modalOverlay.onclick = (e) => {
    if (e.target === UI.modalOverlay) {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
  };

  if (UI.blacklistBtn) {
    UI.blacklistBtn.onclick = () => openBlacklistManager();
  }

  if (UI.toggleFiltersBtn) {
    UI.toggleFiltersBtn.onclick = () => toggleFilters();
  }

  // Share button logic
  if (UI.shareBtn) {
    UI.shareBtn.onclick = () => {
        updateStateFromUI();
        const data = {
            m: state.searchMode,
            t: state.targetMatches,
            s: state.sort,
            y: state.mediaType,
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
  const relationType = box.querySelector('.group-rel-type')?.value || 'ANY';
  const quantifier   = box.querySelector('.group-quantifier')?.value || 'NONE';
  const container    = box.querySelector('.group-rules-container');
  return {
    type: 'RELATION',
    relationType,
    quantifier,
    rules: collectRulesRecursive(container)
  };
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
