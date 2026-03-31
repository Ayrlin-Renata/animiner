/**
 * ui.js
 * UI module for the AniList Search application.
 * Manages DOM interactions, rendering results, and progress updates.
 */

import { state } from './state.js';
import { FIELDS, RECURSIVE_CATEGORIES, OPERATORS_BY_TYPE, COLLECTION_PATHS, GROUP_TYPES, SUB_FIELDS } from './filter.js';

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
    // The results list is typically generated on focusing, so we just ensure the data is ready.
    // If the results list is currently visible, we might want to refresh it.
    const results = input.parentNode.querySelector('.combobox-results');
    if (results && results.classList.contains('show')) {
        // Simple trick: trigger a fake input event to refresh filtering
        input.dispatchEvent(new Event('input'));
    }
  });
}

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
  
  items.slice(0, state.targetMatches).forEach(item => {
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
}

function formatDescription(html) {
  if (!html) return 'No description available.';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "");
}

export function openModal(item) {
  if (!UI.modalContent) return;
  let content = '';
  
  if (state.searchMode === 'MEDIA') {
    const genres = item.genres?.map(g => `<span class="tag">${g}</span>`).join('') || '';
    const tags = item.tags?.slice(0, 10).map(t => `<span class="tag-outline">${t.name}</span>`).join('') || '';
    const studios = item.studios?.edges?.filter(e => e.isMain).map(e => e.node.name).join(', ') || 'Unknown';
    
    content = `
      <div class="modal-banner" style="background-image: url('${item.bannerImage || item.coverImage.extraLarge}')"></div>
      <div class="modal-header-content">
        <img src="${item.coverImage.extraLarge}" class="modal-poster">
        <div class="modal-title-area">
          <h2>${item.title.english || item.title.romaji}</h2>
          <p class="native-title">${item.title.native}</p>
          <div class="modal-badge-row">${genres}</div>
        </div>
      </div>
      <div class="modal-grid">
        <div class="modal-sidebar">
          <div class="sidebar-item"><h4>Format</h4><p>${item.format || '?'}</p></div>
          <div class="sidebar-item"><h4>Episodes</h4><p>${item.episodes || item.chapters || '?'}</p></div>
          <div class="sidebar-item"><h4>Score</h4><p>${item.averageScore ? item.averageScore + '%' : '?'}</p></div>
          <div class="sidebar-item"><h4>Popularity</h4><p>${item.popularity?.toLocaleString() || '?'}</p></div>
          <div class="sidebar-item"><h4>Studio</h4><p>${studios}</p></div>
          <div class="sidebar-item"><h4>Source</h4><p>${item.source || '?'}</p></div>
        </div>
        <div class="modal-main">
          <div class="section-title">Description</div>
          <div class="modal-description">${formatDescription(item.description)}</div>
          ${tags ? `<div class="section-title">Notable Tags</div><div class="modal-badge-row">${tags}</div>` : ''}
          ${item.characters?.edges?.length ? `
            <div class="section-title">Featured Characters</div>
            <div class="char-grid">
              ${item.characters.edges.slice(0, 8).map(e => `
                <div class="char-card">
                  <img src="${e.node.image?.large}" class="char-img">
                  <div class="char-info">
                    <p class="char-name">${e.node.name?.full}</p>
                    <p class="char-role">${e.role}</p>
                    <div class="char-traits">
                      ${e.node.gender ? `<span class="trait-badge">${e.node.gender}</span>` : ''}
                      ${e.node.age ? `<span class="trait-badge">${e.node.age}</span>` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>`;
  } else {
    const title = item.name?.full || item.name;
    const subTitle = item.name?.native || '';
    const image = item.image?.large || item.avatar?.large || (item.media?.nodes?.[0]?.coverImage?.medium) || '';
    content = `
      <div class="modal-header-content simple">
        <img src="${image}" class="modal-poster">
        <div class="modal-title-area">
          <h2>${title}</h2>
          <p class="native-title">${subTitle}</p>
        </div>
      </div>
      <div class="modal-grid simple">
        <div class="modal-main">
          <div class="section-title">About</div>
          <div class="modal-description">${formatDescription(item.description || item.about)}</div>
        </div>
      </div>`;
  }
  UI.modalContent.innerHTML = content;
  UI.modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

export function addRuleUI(initialData = null, parentContainer = null, isSubField = false, subFields = null) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const availableCategories = isSubField ? [] : Object.keys(FIELDS).filter(cat => {
        if (state.searchMode === 'MEDIA') return true;
        const mapping = {
            CHARACTER: [RECURSIVE_CATEGORIES.CHARACTER, RECURSIVE_CATEGORIES.IDENTIFIERS],
            STAFF: [RECURSIVE_CATEGORIES.STAFF, RECURSIVE_CATEGORIES.IDENTIFIERS],
            STUDIO: [RECURSIVE_CATEGORIES.STUDIO, RECURSIVE_CATEGORIES.IDENTIFIERS],
            USER: [RECURSIVE_CATEGORIES.USER, RECURSIVE_CATEGORIES.IDENTIFIERS]
        };
        return (mapping[state.searchMode] || []).includes(cat);
    });

    row.innerHTML = `
    <div class="rule-top">
      ${isSubField ? '' : `<select class="cat-select">
        ${availableCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>`}
      <select class="field-select"></select>
      <button class="remove-btn" title="Remove Constraint"><i data-lucide="trash-2"></i></button>
    </div>
    <div class="rule-bottom">
      <select class="op-select"></select>
      <span class="val-container"></span>
    </div>
  `;

    const catSelect = row.querySelector('.cat-select');
    const fieldSelect = row.querySelector('.field-select');
    const opSelect = row.querySelector('.op-select');
    const valContainer = row.querySelector('.val-container');

    const updateFields = () => {
        const fields = isSubField ? subFields : (FIELDS[catSelect?.value] || []);
        fieldSelect.innerHTML = fields.map((f, i) => `<option value="${i}">${f.label}</option>`).join('');
        
        if (initialData && initialData.path) {
            const idx = fields.findIndex(f => f.path === initialData.path && (initialData.label ? f.label === initialData.label : true));
            if (idx !== -1) fieldSelect.value = idx;
        }
        
        updateOps();
    };

    const updateOps = () => {
        const fields = isSubField ? subFields : (FIELDS[catSelect?.value] || []);
        const field = fields[parseInt(fieldSelect.value)];
        if (!field) return;

        // CRITICAL: Set attributes for reliable state extraction
        row.dataset.path = field.path;
        row.dataset.type = field.type;
        row.dataset.label = field.label;

        const ops = OPERATORS_BY_TYPE[field.type] || [];
        opSelect.innerHTML = ops.map(o => `<option value="${o}">${o.replace('_', ' ')}</option>`).join('');
        
        if (initialData && initialData.operator) {
            opSelect.value = initialData.operator;
        }
        
        updateValInput(field);
    };

    const updateValInput = (field) => {
        valContainer.innerHTML = '';
        let input;
        
        if (field.type === 'boolean') {
            input = document.createElement('select');
            input.className = 'val-select';
            input.innerHTML = `<option value="true">true</option><option value="false">false</option>`;
            valContainer.appendChild(input);
        } else if (field.type === 'enum' && field.options) {
            input = createCombobox(field.options, 'Select option...', field);
            valContainer.appendChild(input);
        } else if (field.seenKey) {
            const values = state.seenValues[field.seenKey] || [];
            input = createCombobox(values, 'Search values...', field);
            valContainer.appendChild(input);
        } else if (field.type === 'list') {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'val-input';
            input.placeholder = 'Comma separated, e.g. Action, Comedy';
            valContainer.appendChild(input);
        } else {
            input = document.createElement('input');
            input.type = field.type === 'number' ? 'number' : 'text';
            input.className = 'val-input';
            input.placeholder = 'Value...';
            valContainer.appendChild(input);
        }
        
        if (initialData && initialData.value !== undefined) {
            const actualInput = input.classList.contains('combobox-container') ? input.querySelector('input') : input;
            actualInput.value = initialData.value;
        }
    };

    if (catSelect) catSelect.onchange = updateFields;
    fieldSelect.onchange = updateOps;
    row.querySelector('.remove-btn').onclick = () => row.remove();

    // Set initial category if restoration
    if (initialData && catSelect) {
        // Find category by looking which one contains the path
        for (const cat of availableCategories) {
            if (FIELDS[cat].some(f => f.path === initialData.path)) {
                catSelect.value = cat;
                break;
            }
        }
    }

    updateFields();
    (parentContainer || UI.rootGroup).appendChild(row);
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Adds a new Filter Group to the UI.
 */
export function addGroupUI(initialData = null) {
    const box = document.createElement('div');
    box.className = 'rule-group-box';
    box.dataset.type = 'GROUP';

    box.innerHTML = `
        <div class="rule-group-header">
            <div class="group-title">
                <i data-lucide="layers"></i>
                <span>Group Filter</span>
            </div>
            <div class="group-controls">
                <select class="group-path">
                    ${Object.entries(COLLECTION_PATHS).map(([key, val]) => `<option value="${val}">${key}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    ${Object.values(GROUP_TYPES).map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <button class="remove-btn" title="Remove Group"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-sub-rule-btn">
                <i data-lucide="plus"></i> Add Sub-Constraint
            </button>
        </div>
    `;

    const pathSelect = box.querySelector('.group-path');
    const quantSelect = box.querySelector('.group-quantifier');
    const container = box.querySelector('.group-rules-container');
    const addBtn = box.querySelector('.add-sub-rule-btn');

    if (initialData) {
        pathSelect.value = initialData.path;
        quantSelect.value = initialData.quantifier || 'ANY';
    }

    addBtn.onclick = () => addRuleUI(null, container, true, SUB_FIELDS[pathSelect.value]);
    pathSelect.onchange = () => {
        container.innerHTML = '';
        addRuleUI(null, container, true, SUB_FIELDS[pathSelect.value]);
    };
    box.querySelector('.remove-btn').onclick = () => box.remove();

    if (initialData && initialData.rules) {
        initialData.rules.forEach(r => addRuleUI(r, container, true, SUB_FIELDS[pathSelect.value]));
    } else {
        addRuleUI(null, container, true, SUB_FIELDS[pathSelect.value]);
    }

    UI.rootGroup.appendChild(box);
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Synchronizes the global search controls with current state.
 */
export function syncUI() {
    if (UI.searchMode) UI.searchMode.value = state.searchMode;
    if (UI.targetResults) UI.targetResults.value = state.targetMatches;
    
    const isMedia = state.searchMode === 'MEDIA';
    const sortCtrl = document.getElementById('mediaSortControl');
    const typeCtrl = document.getElementById('mediaTypeControl');
    if (sortCtrl) sortCtrl.style.display = isMedia ? 'flex' : 'none';
    if (typeCtrl) typeCtrl.style.display = isMedia ? 'flex' : 'none';
}

function createCombobox(options, placeholder, field) {
    const container = document.createElement('div');
    container.className = 'combobox-container';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'combobox-input val-input';
    input.placeholder = placeholder;
    if (field.seenKey) input.dataset.seenKey = field.seenKey;

    const results = document.createElement('div');
    results.className = 'combobox-results glass-dark';
    
    const updateResults = (filterText = '') => {
        // If it's a seenKey, always get latest from state
        const currentOptions = field.seenKey ? (state.seenValues[field.seenKey] || []) : options;
        const filtered = currentOptions.filter(o => o.toLowerCase().includes(filterText.toLowerCase()));
        
        results.innerHTML = filtered.map(o => `<div class="combobox-item">${o}</div>`).join('');
        
        if (filtered.length > 0) {
            results.classList.add('show');
        } else {
            results.classList.remove('show');
        }

        // Add click listeners to items
        results.querySelectorAll('.combobox-item').forEach(item => {
            item.onclick = (e) => {
                input.value = e.target.textContent;
                results.classList.remove('show');
                // Trigger change for persistence
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };
        });
    };

    input.oninput = (e) => updateResults(e.target.value);
    input.onfocus = () => updateResults(input.value);
    
    // Hide results on blur, but delay to allow click to trigger
    input.onblur = () => {
        setTimeout(() => {
            results.classList.remove('show');
        }, 200);
    };

    container.appendChild(input);
    container.appendChild(results);
    return container;
}

export function resetUI(skipDefaultRule = false) {
    UI.resultsGrid.innerHTML = '';
    UI.rootGroup.innerHTML = '';
    UI.progressBanner.classList.add('hidden');
    UI.loading.classList.add('hidden');
    UI.scannedCount.textContent = '0';
    UI.foundCount.textContent = '0';
    
    // Refresh datalist on reset/mode change
    updateDatalist();
    
    if (!skipDefaultRule) {
        addRuleUI();
    }

    syncUI();
}
