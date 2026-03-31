/**
 * main.js
 * High-level orchestration and event handling.
 */

import { state, loadCache } from './state.js';
import { UI, addRuleUI, resetUI, updateProgress, renderResultsList } from './ui.js';
import { executeSearch } from './api.js';

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
  state.rules = rows.map(r => ({
    path: r.querySelector('.field-select').value,
    operator: r.querySelector('.op-select').value,
    value: r.querySelector('.val-input, .val-select').value
  })).filter(r => r.value !== '');
  
  state.targetMatches = parseInt(UI.targetResults.value || '50');
}

// Global initialization
window.addEventListener('DOMContentLoaded', init);
