/**
 * main.js
 * High-level orchestration and event handling.
 */

import { state, loadCache, saveSettings, loadSettings } from './state.js';
import { UI, addRuleUI, addGroupUI, resetUI, updateProgress, renderResultsList, syncUI } from './ui.js';
import { executeSearch } from './api.js';
import { FIELDS, SUB_FIELDS } from './filter.js';

async function init() {
  await loadCache();
  const hasSavedSettings = loadSettings();
  
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

  UI.addRuleBtn.onclick = () => addRuleUI();
  UI.addGroupBtn.onclick = () => addGroupUI();

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
  if (hasSavedSettings && state.rules.length > 0) {
    resetUI(true);
    state.rules.forEach(rule => {
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
