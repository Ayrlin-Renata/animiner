/**
 * main.js
 * High-level orchestration and event handling.
 */

import { state, loadCache } from './state.js';
import { UI, addRuleUI, resetUI, updateProgress, renderResultsList } from './ui.js';
import { executeSearch } from './api.js';
import { FIELDS } from './filter.js';

async function init() {
  await loadCache();
  
  // Event listeners
  UI.searchBtn.onclick = () => {
    updateStateFromUI();
    executeSearch(updateProgress, (results) => {
      renderResultsList(results);
    });
  };

  UI.cancelBtn.onclick = () => {
    state.isCancelled = true;
  };

  UI.addRuleBtn.onclick = addRuleUI;

  UI.searchMode.onchange = (e) => {
    state.searchMode = e.target.value;
    resetUI();
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
  addRuleUI();
}

function updateStateFromUI() {
  const rows = Array.from(UI.rootGroup.querySelectorAll('.rule-row'));
  state.rules = rows.map(r => {
    const cat = r.querySelector('.cat-select').value;
    const fieldIdx = parseInt(r.querySelector('.field-select').value);
    const fields = FIELDS[cat] || [];
    const field = fields[fieldIdx];
    
    if (!field) return null;

    return {
      path: field.path,
      apiArg: field.apiArg,
      type: field.type,
      operator: r.querySelector('.op-select').value,
      value: (r.querySelector('.val-input') || r.querySelector('.val-select'))?.value || ''
    };
  }).filter(r => r && r.value !== '');
  
  state.targetMatches = parseInt(UI.targetResults.value || '50');
}

// Global initialization
window.addEventListener('DOMContentLoaded', init);
