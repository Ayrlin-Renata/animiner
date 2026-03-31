/**
 * ui.js
 * UI module for the AniList Search application.
 * Manages DOM interactions, rendering results, and progress updates.
 */

import { state } from './state.js';
import { FIELDS, RECURSIVE_CATEGORIES, OPERATORS_BY_TYPE } from './filter.js';

export const UI = {
  mainSearch: document.getElementById('mainSearch'),
  searchMode: document.getElementById('searchMode'),
  targetResults: document.getElementById('targetResults'),
  mediaSort: document.getElementById('mediaSort'),
  mediaType: document.getElementById('mediaType'),
  searchBtn: document.getElementById('searchBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  addRuleBtn: document.getElementById('addRuleBtn'),
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

  // Also update any existing selects that depend on seen values
  document.querySelectorAll('.val-select[data-seen-key]').forEach(select => {
    const key = select.dataset.seenKey;
    const values = state.seenValues[key] || [];
    const currentVal = select.value;
    
    // Only update if the number of options changed to avoid unnecessary flickering
    if (select.options.length !== values.length) {
      select.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join('');
      if (values.includes(currentVal)) select.value = currentVal;
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
                  <img src="${e.node.image.large}" class="char-img">
                  <div class="char-info">
                    <p class="char-name">${e.node.name.full}</p>
                    <p class="char-role">${e.role}</p>
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

export function addRuleUI() {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const availableCategories = Object.keys(FIELDS).filter(cat => {
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
      <select class="cat-select">
        ${availableCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
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
        const fields = FIELDS[catSelect.value] || [];
        fieldSelect.innerHTML = fields.map((f, i) => `<option value="${i}">${f.label}</option>`).join('');
        updateOps();
    };

    const updateOps = () => {
        const fields = FIELDS[catSelect.value] || [];
        const field = fields[parseInt(fieldSelect.value)];
        if (!field) return;
        const ops = OPERATORS_BY_TYPE[field.type] || [];
        opSelect.innerHTML = ops.map(o => `<option value="${o}">${o.replace('_', ' ')}</option>`).join('');
        updateValInput(field);
    };

    const updateValInput = (field) => {
        let input;
        if (field.type === 'boolean') {
            input = document.createElement('select');
            input.className = 'val-select';
            input.innerHTML = `<option value="true">true</option><option value="false">false</option>`;
        } else if (field.type === 'enum' && field.options) {
            input = document.createElement('select');
            input.className = 'val-select';
            input.innerHTML = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else if (field.seenKey) {
            // User requested dropdown for these
            input = document.createElement('select');
            input.className = 'val-select';
            input.dataset.seenKey = field.seenKey; 
            const values = state.seenValues[field.seenKey] || [];
            input.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join('');
            if (values.length === 0) {
              input.innerHTML = '<option value="">No values seen yet</option>';
            }
        } else if (field.type === 'list') {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'val-input';
            input.placeholder = 'Comma separated, e.g. Action, Comedy';
        } else {
            input = document.createElement('input');
            input.type = field.type === 'number' ? 'number' : 'text';
            input.className = 'val-input';
            input.placeholder = 'Value...';
        }
        valContainer.innerHTML = '';
        valContainer.appendChild(input);
    };

    catSelect.onchange = updateFields;
    fieldSelect.onchange = updateOps;
    row.querySelector('.remove-btn').onclick = () => row.remove();

    updateFields();
    UI.rootGroup.appendChild(row);
    if (window.lucide) window.lucide.createIcons();
}

export function resetUI() {
    UI.resultsGrid.innerHTML = '';
    UI.rootGroup.innerHTML = '';
    UI.progressBanner.classList.add('hidden');
    UI.loading.classList.add('hidden');
    UI.scannedCount.textContent = '0';
    UI.foundCount.textContent = '0';
    
    // Refresh datalist on reset/mode change
    updateDatalist();
    
    addRuleUI();

    const isMedia = state.searchMode === 'MEDIA';
    const sortCtrl = document.getElementById('mediaSortControl');
    const typeCtrl = document.getElementById('mediaTypeControl');
    if (sortCtrl) sortCtrl.style.display = isMedia ? 'flex' : 'none';
    if (typeCtrl) typeCtrl.style.display = isMedia ? 'flex' : 'none';
}
