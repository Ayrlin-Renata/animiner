/**
 * js/ui/builder.js
 * Constraint Builder UI logic.
 */

import { UI, syncUI, updateDatalist } from './base.js';
import { state } from '../state.js';
import { FIELDS, RECURSIVE_CATEGORIES, OPERATORS_BY_TYPE, COLLECTION_PATHS, GROUP_TYPES, SUB_FIELDS, RELATION_TYPES, RELATION_FIELDS } from '../filter.js';
import { createCombobox } from './combobox.js';

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

    if (initialData && catSelect) {
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

        const quantifier = quantSelect.value;
        const isAny = quantifier === 'ANY';
        box.classList.toggle('any-logic', isLogic && isAny);

        const quantifierText = {
            ANY: isLogic ? 'Matches if ANY of these rules pass (OR).' : 'Finds items where ANY match.',
            ALL: isLogic ? 'Matches if ALL of these rules pass (AND).' : 'Finds items where ALL match.',
            NONE: isLogic ? 'Matches if NONE of these rules pass (NOT).' : 'Finds items where NONE match.'
        };
        box.querySelector('.group-help-text').textContent = quantifierText[quantifier];
    };

    if (initialData) {
        pathSelect.value = initialData.path;
        quantSelect.value = initialData.quantifier || 'ANY';
    }

    const addSubRule = (data = null) => {
        const isLogic = pathSelect.value === 'ROOT';
        if (isLogic) {
            addRuleUI(data, container);
        } else {
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
 * Relation Group — filters based on properties of connected/related media.
 * Evaluates sub-rules against the relation's media node.
 */
export function addRelationGroupUI(initialData = null, parentContainer = null) {
    const box = document.createElement('div');
    box.className = 'rule-group-box relation-group';
    box.dataset.type = 'RELATION';

    box.innerHTML = `
        <div class="rule-group-header">
            <div class="group-title">
                <i data-lucide="git-branch-plus"></i>
                <span class="group-name">Relation Filter</span>
            </div>
            <div class="group-controls">
                <select class="group-rel-type" title="Relation Type">
                    ${RELATION_TYPES.map(t => `<option value="${t}">${t === 'ANY' ? 'Any Relation' : t.replace(/_/g, ' ')}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    <option value="NONE">has NONE</option>
                    <option value="ANY">has ANY</option>
                    <option value="ALL">has ALL</option>
                </select>
                <button class="remove-btn" title="Remove Relation Filter"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-help-text">No related media of this type passes all sub-constraints.</div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-relation-rule-btn">
                <i data-lucide="plus"></i> Add Sub-Constraint
            </button>
        </div>
    `;

    const relTypeSelect  = box.querySelector('.group-rel-type');
    const quantSelect    = box.querySelector('.group-quantifier');
    const container      = box.querySelector('.group-rules-container');

    const updateHelp = () => {
        const rt = relTypeSelect.value === 'ANY' ? 'any relation' : relTypeSelect.value.replace(/_/g, ' ').toLowerCase();
        const qt = quantSelect.value;
        const texts = {
            NONE: `No ${rt} matches all sub-constraints (exclude if found).`,
            ANY:  `At least one ${rt} matches all sub-constraints.`,
            ALL:  `Every ${rt} matches all sub-constraints.`,
        };
        box.querySelector('.group-help-text').textContent = texts[qt];
    };

    const addSubRule = (data = null) => {
        // Create a rule row using RELATION_FIELDS directly (isSubField mode, no category picker)
        addRuleUI(data, container, true, RELATION_FIELDS);
    };

    box.querySelector('.add-relation-rule-btn').onclick = () => addSubRule();
    box.querySelector('.remove-btn').onclick = () => box.remove();
    relTypeSelect.onchange = updateHelp;
    quantSelect.onchange   = updateHelp;

    // Load saved state
    if (initialData) {
        relTypeSelect.value = initialData.relationType || 'ANY';
        quantSelect.value   = initialData.quantifier   || 'NONE';
        (initialData.rules || []).forEach(r => addSubRule(r));
    } else {
        addSubRule(); // Start with one empty rule
    }

    updateHelp();
    (parentContainer || UI.rootGroup).appendChild(box);
    if (window.lucide) window.lucide.createIcons();
}

export function resetUI(skipDefaultRule = false) {
    UI.resultsGrid.innerHTML = '';
    UI.rootGroup.innerHTML = '';
    UI.progressBanner.classList.add('hidden');
    UI.loading.classList.add('hidden');
    UI.scannedCount.textContent = '0';
    UI.foundCount.textContent = '0';
    
    updateDatalist();
    
    if (!skipDefaultRule) {
        addRuleUI();
    }
    syncUI();
}

export function toggleFilters(forceCollapse = null) {
    const content = UI.filterContent;
    const btn = UI.toggleFiltersBtn;
    if (!content || !btn) return;

    const isCollapsed = forceCollapse !== null ? forceCollapse : !content.classList.contains('hidden-height');
    
    if (isCollapsed) {
        content.classList.add('hidden-height');
        btn.innerHTML = '<i data-lucide="chevron-down"></i> Show Filters';
    } else {
        content.classList.remove('hidden-height');
        btn.innerHTML = '<i data-lucide="chevron-up"></i> Hide Filters';
    }
    if (window.lucide) window.lucide.createIcons();

    // Refresh badge visibility after state change
    import('./base.js').then(m => m.updateToggleFilterAccent());
}
