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
  shareBtn: document.getElementById('shareBtn'),
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
    const genres = item.genres?.map(g => `<span class="tag">${g}</span>`).join(' ') || '';
    const studios = item.studios?.edges?.filter(e => e.isMain).map(e => e.node.name).join(', ') || 'Unknown';
    const sourceFormatted = item.source?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '?';
    
    // Sort and filter tags
    const allTags = (item.tags || []).sort((a, b) => b.rank - a.rank);
    const visibleTags = allTags.filter(t => !t.isGeneralSpoiler && !t.isMediaSpoiler);
    const spoilerTags = allTags.filter(t => t.isGeneralSpoiler || t.isMediaSpoiler);

    const trailerHtml = item.trailer && item.trailer.site === 'youtube' 
        ? `<div class="section-title">Trailer</div>
           <div class="video-container">
             <iframe src="https://www.youtube.com/embed/${item.trailer.id}" frameborder="0" allowfullscreen></iframe>
           </div>` : '';

    const relationsHtml = item.relations?.edges?.length ? `
        <div class="section-title">Relations</div>
        <div class="mini-grid">
            ${item.relations.edges.map(e => `
                <div class="mini-card glass-dark">
                    <img src="${e.node.coverImage.medium}" class="mini-poster">
                    <div class="mini-info">
                        <div class="mini-rel">${e.relationType.replace(/_/g, ' ')}</div>
                        <div class="mini-title">${e.node.title.english || e.node.title.romaji}</div>
                        <div class="mini-meta">${e.node.format} · ${e.node.status}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';

    const recommendationsHtml = item.recommendations?.nodes?.length ? `
        <div class="section-title">Recommendations</div>
        <div class="mini-grid horizontal">
            ${item.recommendations.nodes.map(n => {
                const rec = n.mediaRecommendation;
                if (!rec) return '';
                return `
                    <div class="mini-card glass-dark vertical">
                        <img src="${rec.coverImage.medium}" class="mini-poster">
                        <div class="mini-title">${rec.title.english || rec.title.romaji}</div>
                    </div>
                `;
            }).join('')}
        </div>
    ` : '';

    const statsHtml = item.stats ? `
        <div class="section-title">Statistics</div>
        <div class="stats-distributions">
            <div class="dist-group">
                <h4>Status Distribution</h4>
                <div class="dist-bar">
                    ${item.stats.statusDistribution.map(d => `
                        <div class="bar-seg" style="width: ${(d.amount / item.popularity * 100).toFixed(1)}%; background: var(--color-${d.status.toLowerCase()})" title="${d.status}: ${d.amount.toLocaleString()}"></div>
                    `).join('')}
                </div>
                <div class="dist-legend">
                    ${item.stats.statusDistribution.map(d => `<span class="legend-item"><i class="dot" style="background: var(--color-${d.status.toLowerCase()})"></i> ${d.status}</span>`).join('')}
                </div>
            </div>
            <div class="dist-group">
                <h4>Score Distribution</h4>
                <div class="dist-bar scores">
                    ${item.stats.scoreDistribution.map(d => {
                        const maxAmount = Math.max(...item.stats.scoreDistribution.map(sd => sd.amount));
                        return `
                            <div class="bar-seg score" style="height: ${(d.amount / maxAmount * 100).toFixed(1)}%; width: calc(10% - 2px); background: var(--accent-color)" title="${d.score}: ${d.amount.toLocaleString()}"></div>
                        `;
                    }).join('')}
                </div>
                <div class="dist-legend">
                  <span class="legend-item">Score (10-100)</span>
                </div>
            </div>
        </div>
    ` : '';

    const linksHtml = item.externalLinks?.length ? `
        <div class="external-links">
            ${item.externalLinks.map(l => `
                <a href="${l.url}" target="_blank" class="ext-link" style="background: ${l.color || 'rgba(255,255,255,0.1)'}">
                    ${l.site}
                </a>
            `).join('')}
        </div>
    ` : '';

    content = `
      <div class="modal-banner" style="background-image: url('${item.bannerImage || item.coverImage.extraLarge}')"></div>
      <div class="modal-header-content">
        <img src="${item.coverImage.extraLarge}" class="modal-poster">
        <div class="modal-title-area">
          <h2>${item.title.english || item.title.romaji}</h2>
          <p class="native-title">${item.title.native}</p>
          <div class="modal-badge-row">${genres}</div>
          ${linksHtml}
        </div>
      </div>
      <div class="modal-grid">
        <div class="modal-sidebar">
          <div class="sidebar-section">
            <div class="sidebar-item"><h4>Format</h4><p>${item.format || '?'}</p></div>
            <div class="sidebar-item"><h4>Episodes</h4><p>${item.episodes || item.chapters || '?'}</p></div>
            <div class="sidebar-item"><h4>Status</h4><p>${item.status || '?'}</p></div>
            <div class="sidebar-item"><h4>Start Date</h4><p>${item.startDate?.year || '?'}</p></div>
            <div class="sidebar-item"><h4>Season</h4><p>${item.season || '?'}</p></div>
            <div class="sidebar-item"><h4>Average Score</h4><p>${item.averageScore ? item.averageScore + '%' : '?'}</p></div>
            <div class="sidebar-item"><h4>Popularity</h4><p>${item.popularity?.toLocaleString() || '?'}</p></div>
            <div class="sidebar-item"><h4>Studios</h4><p>${studios}</p></div>
            <div class="sidebar-item"><h4>Source</h4><p>${sourceFormatted}</p></div>
            ${item.hashtag ? `<div class="sidebar-item"><h4>Hashtag</h4><p>${item.hashtag}</p></div>` : ''}
            ${item.synonyms?.length ? `<div class="sidebar-item"><h4>Synonyms</h4><p>${item.synonyms.join(', ')}</p></div>` : ''}
            <div class="sidebar-item"><h4>Romaji</h4><p>${item.title.romaji}</p></div>
            ${item.title.english ? `<div class="sidebar-item"><h4>English</h4><p>${item.title.english}</p></div>` : ''}
            <div class="sidebar-item"><h4>Native</h4><p>${item.title.native}</p></div>
          </div>
          
          <div class="sidebar-section">
            <div class="section-title small">Tags</div>
            <div class="tag-list">
              ${visibleTags.map(t => `
                <div class="tag-list-item">
                  <span class="tag-name">${t.name}</span>
                  <span class="tag-rank">${t.rank}%</span>
                </div>
              `).join('')}
              ${spoilerTags.length ? `<button class="text-btn spoiler-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Spoiler Tags (+${spoilerTags.length})</button>
              <div class="tag-list hidden">
                ${spoilerTags.map(t => `
                  <div class="tag-list-item spoiler">
                    <span class="tag-name">${t.name}</span>
                    <span class="tag-rank">${t.rank}%</span>
                  </div>
                `).join('')}
              </div>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-main">
          <div class="section-title">Description</div>
          <div class="modal-description">${formatDescription(item.description)}</div>
          
          ${trailerHtml}
          ${relationsHtml}
          ${item.characters?.edges?.length ? `
            <div class="section-title">Featured Characters</div>
            <div class="char-grid">
              ${item.characters.edges.slice(0, 12).map(e => `
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
          ${recommendationsHtml}
          ${statsHtml}
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
export function addGroupUI(initialData = null, parentContainer = null) {
    const box = document.createElement('div');
    box.className = 'rule-group-box';
    box.dataset.type = 'GROUP';

    box.innerHTML = `
        <div class="rule-group-header">
            <div class="group-title">
                <i data-lucide="layers" class="collection-icon"></i>
                <i data-lucide="square-slash" class="logic-icon hidden"></i>
                <span class="group-name">Collection Group</span>
            </div>
            <div class="group-controls">
                <select class="group-path">
                    <option value="ROOT">Manual Logic</option>
                    ${Object.entries(COLLECTION_PATHS).filter(([k]) => k !== 'LOGIC').map(([key, val]) => `<option value="${val}">${key}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    ${Object.values(GROUP_TYPES).map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <button class="remove-btn" title="Remove Group"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-help-text">Filters everything in this block.</div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-sub-rule-btn">
                <i data-lucide="plus"></i> Add Sub-Constraint
            </button>
            <button class="text-btn add-sub-group-btn">
                <i data-lucide="layers"></i> Add Sub-Group
            </button>
        </div>
    `;

    const pathSelect = box.querySelector('.group-path');
    const quantSelect = box.querySelector('.group-quantifier');
    const container = box.querySelector('.group-rules-container');
    const addBtn = box.querySelector('.add-sub-rule-btn');

    const updateGroupContext = () => {
        const isLogic = pathSelect.value === 'ROOT';
        box.classList.toggle('logic-group', isLogic);
        box.querySelector('.group-name').textContent = isLogic ? 'Logic Container' : 'Collection Group';
        
        box.querySelector('.collection-icon').classList.toggle('hidden', isLogic);
        box.querySelector('.logic-icon').classList.toggle('hidden', !isLogic);

        const quantifierText = {
            ANY: isLogic ? 'Matches if ANY of these rules pass (OR).' : 'Finds items where ANY match.',
            ALL: isLogic ? 'Matches if ALL of these rules pass (AND).' : 'Finds items where ALL match.',
            NONE: isLogic ? 'Matches if NONE of these rules pass (NOT).' : 'Finds items where NONE match.'
        };
        box.querySelector('.group-help-text').textContent = quantifierText[quantSelect.value];
    };

    if (initialData) {
        pathSelect.value = initialData.path;
        quantSelect.value = initialData.quantifier || 'ANY';
    }

    const addSubRule = (data = null) => {
        const isLogic = pathSelect.value === 'ROOT';
        if (isLogic) {
            // Use top-level field builder
            addRuleUI(data, container);
        } else {
            // Use sub-field builder
            addRuleUI(data, container, true, SUB_FIELDS[pathSelect.value]);
        }
    };

    const addSubGroup = (data = null) => {
        addGroupUI(data, container);
    };

    addBtn.onclick = () => addSubRule();
    box.querySelector('.add-sub-group-btn').onclick = () => addSubGroup();

    pathSelect.onchange = () => {
        container.innerHTML = '';
        updateGroupContext();
        addSubRule();
    };
    quantSelect.onchange = updateGroupContext;
    box.querySelector('.remove-btn').onclick = () => box.remove();

    if (initialData && initialData.rules) {
        initialData.rules.forEach(r => {
            if (r.type === 'GROUP') {
                addSubGroup(r);
            } else {
                addSubRule(r);
            }
        });
    } else {
        addSubRule();
    }
    
    updateGroupContext();

    (parentContainer || UI.rootGroup).appendChild(box);
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
