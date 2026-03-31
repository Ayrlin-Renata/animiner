import { state, loadCache, saveSettings, loadSettings } from './state.js';
import { UI, addRuleUI, addGroupUI, addRelationGroupUI, resetUI, updateProgress, renderResultsList, syncUI, toggleFilters, openBlacklistManager, updateToggleFilterAccent } from './ui.js';
import { executeSearch } from './api.js';
import { FIELDS, SUB_FIELDS, RELATION_FIELDS } from './filter.js';
import { compressFilterData, decompressFilterData } from './compression.js';

async function init() {
  await loadCache();
  loadSettings();
  
  // URL Overrides (Compressed)
  const urlParams = new URLSearchParams(window.location.search);
  const filterData = urlParams.get('f');
  if (filterData) {
    const decompressed = decompressFilterData(filterData);
    if (decompressed) {
        state.searchMode = decompressed.searchMode || state.searchMode;
        state.targetMatches = decompressed.targetMatches || state.targetMatches;
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

  UI.rootGroup.ondragover = (e) => {
    e.preventDefault();
    const draggable = window.draggedElement;
    if (!draggable) return;
    
    // Only allow dropping at root if it's a top-level rule or group
    const container = UI.rootGroup;
    const afterElement = Array.from(container.querySelectorAll(':scope > .rule-row:not(.is-dragging), :scope > .rule-group-box:not(.is-dragging)'))
        .reduce((closest, child, idx, arr) => {
            const box = child.getBoundingClientRect();
            
            // Hysteresis: sticky thresholds
            const isLastChild = draggable && !draggable.nextElementSibling && container.contains(draggable);
            const isCurrentTarget = draggable && draggable.nextElementSibling === child;
            
            let thresholdPercent = 0.85;
            if (isLastChild && idx === arr.length - 1) thresholdPercent = 0.2;
            if (isCurrentTarget) thresholdPercent = 0.3;
            
            const threshold = box.top + (box.height * thresholdPercent);
            const offset = e.clientY - threshold;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    
    if (afterElement !== draggable.nextElementSibling) {
      if (afterElement == null) {
        container.appendChild(draggable);
      } else {
        container.insertBefore(draggable, afterElement);
      }
    }
  };

  UI.rootGroup.ondragenter = (e) => {
    e.preventDefault();
    UI.rootGroup.classList.add('drag-over');
  };
  UI.rootGroup.ondragleave = () => {
    UI.rootGroup.classList.remove('drag-over');
  };
  UI.rootGroup.ondrop = () => {
    UI.rootGroup.classList.remove('drag-over');
  };

  // Debug tool
  window.exportFilters = () => {
    console.log("Current Filter State (for debugging):");
    console.log(JSON.stringify(state.rules, null, 2));
  };
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
