/**
 * js/ui/builder.js
 * Constraint Builder UI logic.
 */

import { UI, syncUI, updateDatalist } from './base.js';
import { state } from '../state.js';
import { FIELDS, RECURSIVE_CATEGORIES, SEARCH_MODE_CATEGORIES, OPERATORS_BY_TYPE, COLLECTION_PATHS, GROUP_TYPES, SUB_FIELDS, RELATION_TYPES, RELATION_FIELDS } from '../filter.js';
import { createCombobox } from './combobox.js';

// Global Drop Indicator Element
const dropIndicator = document.createElement('div');
dropIndicator.id = 'dropIndicator';
dropIndicator.className = 'hidden';
document.body.appendChild(dropIndicator);

/**
 * Resets all drag-related classes and hides indicators globally.
 */
export function resetDragState() {
    document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.drag-invalid').forEach(el => el.classList.remove('drag-invalid'));
    const indicator = document.getElementById('dropIndicator');
    if (indicator) indicator.classList.add('hidden');
    window.draggedElement = null;
}

window.addEventListener('dragend', resetDragState);
window.addEventListener('drop', resetDragState);

export function addRuleUI(initialData = null, parentContainer = null, isSubField = false, subFields = null) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const availableCategories = isSubField ? [] : Object.keys(FIELDS).filter(cat => {
        const mapping = SEARCH_MODE_CATEGORIES[state.searchMode] || [];
        return mapping.includes(cat);
    });

    row.draggable = false; // Rows are only draggable via handle
    row.innerHTML = `
        <div class="rule-drag-handle" draggable="true">
            <i data-lucide="grip-vertical"></i>
        </div>
        <div class="rule-content">
            <div class="rule-top">
                ${isSubField ? '' : `<select class="cat-select" title="Category">
                    ${availableCategories.map(cat => {
        if (cat === RECURSIVE_CATEGORIES.REFERENCES) {
            return `<option disabled>──────────</option><option value="${cat}">Group References</option>`;
        }
        return `<option value="${cat}">${cat}</option>`;
    }).join('')}
                </select>`}
                <select class="field-select"></select>
                <button class="remove-btn" title="Remove constraint"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="rule-bottom">
                <select class="op-select"></select>
                <div class="val-container"></div>
            </div>
        </div>
    `;

    const catSelect = row.querySelector('.cat-select');
    const fieldSelect = row.querySelector('.field-select');
    const opSelect = row.querySelector('.op-select');
    const valContainer = row.querySelector('.val-container');

    const updateFields = () => {
        if (!isSubField) {
            row.classList.toggle('reference-rule', catSelect?.value === RECURSIVE_CATEGORIES.REFERENCES);
        }

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
        const type = field?.type || 'string';
        const defaultOp = type === 'collection' ? 'equals' : (OPERATORS_BY_TYPE[type]?.[0] || 'equals');
        const rule = { path: field.path, label: field.label, type: type, operator: defaultOp, value: '' };
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
        } else if (field.type === 'reference') {
            field.seenKey = '__REFERENCES__';
            input = createCombobox([], 'Search aliases...', field);
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

    if (initialData && initialData.path && !isSubField) {
        // Try to find which category this path belongs to
        const cat = Object.keys(FIELDS).find(c => FIELDS[c].some(f => f.path === initialData.path));
        if (cat) catSelect.value = cat;
    }

    if (!initialData && catSelect) {
        // Default to Content -> Tag Name for better workflow
        catSelect.value = RECURSIVE_CATEGORIES.CONTENT;
        updateFields();
    } else {
        updateFields();
    }

    // Tag row with context for DND validation
    row.dataset.context = isSubField ? (subFields === RELATION_FIELDS ? 'RELATION' : (parentContainer?.dataset.accepts || 'UNKNOWN')) : 'MEDIA';

    // Drag and Drop Event listeners for Rule Rows
    const handle = row.querySelector('.rule-drag-handle');
    handle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'rule');
        window.draggedElement = row;
        row.classList.add('is-dragging');
        dropIndicator.classList.remove('hidden');
        e.stopPropagation();
    };
    handle.ondragend = resetDragState;

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
                <div class="group-drag-handle" draggable="true">
                    <i data-lucide="grip-vertical"></i>
                </div>
                <i data-lucide="layers" class="collection-icon"></i>
                <i data-lucide="square-slash" class="logic-icon hidden"></i>
                <span class="group-name">Collection Group</span>
                <input type="text" class="group-label-input" placeholder="Alias / Name" spellcheck="false" />
            </div>
            <div class="group-controls">
                <select class="group-path">
                    <option value="ROOT">MEDIA</option>
                    ${Object.entries(COLLECTION_PATHS).filter(([k]) => k !== 'LOGIC').map(([key, val]) => `<option value="${val}">${key}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    <option value="ALL">EVERY item matches</option>
                    <option value="ANY">SOME item matches</option>
                    <option value="NONE">NO item matches</option>
                    <option value="NOT_ALL">NOT EVERY item matches</option>
                    <option value="SOME_ANY">SOME matches ANY rule</option>
                    <option value="NONE_ANY">NO item matches ANY rule</option>
                </select>
                <button class="collapse-btn" title="Collapse/Expand"><i data-lucide="chevron-up"></i></button>
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

        // Disable redundant fuzzy match options for Logic Containers
        const optSomeAny = quantSelect.querySelector('option[value="SOME_ANY"]');
        const optNoneAny = quantSelect.querySelector('option[value="NONE_ANY"]');
        if (optSomeAny) optSomeAny.disabled = isLogic;
        if (optNoneAny) optNoneAny.disabled = isLogic;

        // Fallback to strict equivalents if switching to Logic with a disabled option selected
        if (isLogic && quantSelect.value === 'SOME_ANY') quantSelect.value = 'ANY';
        if (isLogic && quantSelect.value === 'NONE_ANY') quantSelect.value = 'NONE';

        const quantifier = quantSelect.value;

        let isOr = false;
        let isNegated = false;

        if (isLogic) {
            isOr = ['ANY', 'SOME_ANY', 'NONE', 'NONE_ANY'].includes(quantifier);
            isNegated = ['NONE', 'NONE_ANY', 'NOT_ALL'].includes(quantifier);
        } else {
            isOr = ['SOME_ANY', 'NONE_ANY'].includes(quantifier);
            isNegated = ['NONE', 'NOT_ALL', 'NONE_ANY'].includes(quantifier);
        }

        box.classList.toggle('logic-group', isLogic);
        box.classList.toggle('collection-group', !isLogic); // Add blue theme class
        box.classList.toggle('any-logic', isOr);
        box.classList.toggle('negated-group', isNegated);

        box.querySelector('.group-name').textContent = isLogic ? 'Logic' : 'Collection';

        box.querySelector('.collection-icon').classList.toggle('hidden', isLogic);
        box.querySelector('.logic-icon').classList.toggle('hidden', !isLogic);

        // Tag container for DND validation
        container.dataset.accepts = isLogic ? 'MEDIA' : pathSelect.value;
        box.dataset.context = isLogic ? 'MEDIA' : 'GROUP';

        const quantifierText = {
            ALL: isLogic ? 'Matches only if ALL of these rules are true.' : 'Requirement: EVERY item in this list must match this ENTIRE profile.',
            ANY: isLogic ? 'Matches if AT LEAST ONE of these rules is true.' : 'Requirement: AT LEAST ONE item in this list must match this ENTIRE profile.',
            NONE: isLogic ? 'Matches only if NONE of these rules are true.' : 'Exclusion: NO item in this list can match this ENTIRE profile.',
            NOT_ALL: isLogic ? 'Matches if AT LEAST ONE of these rules is false.' : 'Requirement: AT LEAST ONE item in this list must fail this profile.',
            SOME_ANY: 'Fuzzy: AT LEAST ONE item in this list must match at least ONE of these rules.',
            NONE_ANY: 'Strict Exclusion: NO item in this list can match even ONE of these rules.'
        };
        box.querySelector('.group-help-text').textContent = quantifierText[quantifier];
    };

    if (initialData) {
        pathSelect.value = initialData.path;
        quantSelect.value = initialData.quantifier || 'ANY';
        if (initialData.alias) {
            box.querySelector('.group-label-input').value = initialData.alias;
        }
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

    box.querySelector('.collapse-btn').onclick = () => {
        box.classList.toggle('collapsed');
        // updateStateFromUI() needs to be called to save state, but it's defined in main.js
        // We can trigger a 'change' event on the box so the observer in main.js sees it
        box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (initialData && initialData.collapsed) {
        box.classList.add('collapsed');
    }
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

    // Drag and Drop listeners
    const groupHandle = box.querySelector('.group-drag-handle');
    groupHandle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'group');
        window.draggedElement = box;
        box.classList.add('is-dragging');
        dropIndicator.classList.remove('hidden');
        e.stopPropagation();
    }

    // Tag relation group for DND
    box.dataset.accepts = 'RELATION';
    box.dataset.context = 'MEDIA'; // A group-box itself is a top-level media entity
    groupHandle.ondragend = resetDragState;

    box.ondragover = (e) => {
        const draggable = window.draggedElement;
        if (!draggable || draggable === box || draggable.contains(box)) return;

        // Validation Check
        const context = draggable.dataset.context;
        const accepts = container.dataset.accepts;
        const isCompatible = (context === accepts) || (context === 'GROUP' && accepts === 'MEDIA');

        if (!isCompatible) {
            container.classList.add('drag-invalid');
            dropIndicator.classList.add('hidden');
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('drag-invalid');
        dropIndicator.classList.remove('hidden');

        const afterElement = getDragAfterElement(container, e.clientY, draggable);
        if (afterElement == null) {
            container.appendChild(dropIndicator);
        } else {
            container.insertBefore(dropIndicator, afterElement);
        }
    };

    container.ondragenter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.add('drag-over');
    };
    container.ondragleave = (e) => {
        // Only remove if we're actually leaving the container, not just entering a child
        if (!container.contains(e.relatedTarget)) {
            container.classList.remove('drag-over');
            container.classList.remove('drag-invalid');
        }
    };
    container.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggable = window.draggedElement;
        if (draggable && !container.classList.contains('drag-invalid')) {
            if (dropIndicator.parentElement === container) {
                container.insertBefore(draggable, dropIndicator);
            }
        }
        resetDragState();
    };

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
                <div class="group-drag-handle" draggable="true">
                    <i data-lucide="grip-vertical"></i>
                </div>
                <i data-lucide="git-branch-plus"></i>
                <span class="group-name">Relation Group</span>
                <input type="text" class="group-label-input" placeholder="Alias / Name" spellcheck="false" />
            </div>
            <div class="group-controls">
                <select class="group-rel-type" title="Relation Type">
                    ${RELATION_TYPES.map(t => `<option value="${t}">${t === 'ANY' ? 'Any Relation' : t.replace(/_/g, ' ')}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    <option value="NONE">has NONE that match</option>
                    <option value="ANY">has SOME that match</option>
                    <option value="ALL">has ALL that match</option>
                    <option value="NOT_ALL">does NOT have ALL matching</option>
                    <option value="SOME_ANY">at least one matches ANY rule</option>
                    <option value="NONE_ANY">zero match ANY rule</option>
                </select>
                <button class="collapse-btn" title="Collapse/Expand"><i data-lucide="chevron-up"></i></button>
                <button class="remove-btn" title="Remove Relation Group"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-help-text">Filters related media (e.g. prequels, sequels).</div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-relation-rule-btn">
                <i data-lucide="plus"></i> Add Sub-Constraint
            </button>
            <button class="text-btn secondary add-sub-group-btn">
                <i data-lucide="layers"></i> Add Sub-Group
            </button>
        </div>
    `;

    const relTypeSelect = box.querySelector('.group-rel-type');
    const quantSelect = box.querySelector('.group-quantifier');
    const container = box.querySelector('.group-rules-container');
    container.dataset.accepts = 'MEDIA';

    const updateRelationContext = () => {
        const rt = relTypeSelect.value === 'ANY' ? 'any relation' : relTypeSelect.value.replace(/_/g, ' ').toLowerCase();
        const qt = quantSelect.value;

        const isOr = ['SOME_ANY', 'NONE_ANY'].includes(qt);
        const isNegated = ['NONE', 'NOT_ALL', 'NONE_ANY'].includes(qt);

        const texts = {
            ALL: `Requirement: EVERY ${rt} must match this ENTIRE profile.`,
            ANY: `Requirement: AT LEAST ONE ${rt} must match this ENTIRE profile.`,
            NONE: `Exclusion: NO ${rt} can match this ENTIRE profile.`,
            NOT_ALL: `Requirement: AT LEAST ONE ${rt} must fail this profile.`,
            SOME_ANY: `Fuzzy: AT LEAST ONE ${rt} must match at least ONE of these rules.`,
            NONE_ANY: `Strict Exclusion: NO ${rt} can match even ONE of these rules.`
        };
        box.querySelector('.group-help-text').textContent = texts[qt];

        // Toggle logic connectors class and negated state
        box.classList.toggle('any-logic', isOr);
        box.classList.toggle('negated-group', isNegated);
    };

    const addSubRule = (data = null) => {
        // Use full media rule categories, identical to root logic
        addRuleUI(data, container);
    };

    const addSubGroup = (data = null) => {
        addGroupUI(data, container);
    };

    box.querySelector('.add-relation-rule-btn').onclick = () => addSubRule();
    box.querySelector('.add-sub-group-btn').onclick = () => addSubGroup();
    box.querySelector('.remove-btn').onclick = () => box.remove();
    relTypeSelect.onchange = updateRelationContext;
    quantSelect.onchange = updateRelationContext;

    box.querySelector('.collapse-btn').onclick = () => {
        box.classList.toggle('collapsed');
        box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // Load saved state
    if (initialData) {
        if (initialData.collapsed) box.classList.add('collapsed');
        relTypeSelect.value = initialData.relationType || 'ANY';
        quantSelect.value = initialData.quantifier || 'NONE';
        if (initialData.alias) {
            box.querySelector('.group-label-input').value = initialData.alias;
        }
        if (initialData.rules) {
            initialData.rules.forEach(r => {
                if (r.type === 'GROUP') {
                    addSubGroup(r);
                } else if (r.type === 'RELATION') {
                    addRelationGroupUI(r, container);
                } else {
                    addSubRule(r);
                }
            });
        }
    } else {
        addSubRule(); // Start with one empty rule
    }

    updateRelationContext();

    // Drag and Drop listeners
    const groupHandle = box.querySelector('.group-drag-handle');
    groupHandle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'relation');
        window.draggedElement = box;
        box.classList.add('is-dragging');
        dropIndicator.classList.remove('hidden');
        e.stopPropagation();
    }
    groupHandle.ondragend = resetDragState;

    box.ondragover = (e) => {
        const draggable = window.draggedElement;
        if (!draggable || draggable === box || draggable.contains(box)) return;

        // Validation Check
        const context = draggable.dataset.context;
        const accepts = container.dataset.accepts;
        if (context !== accepts) {
            container.classList.add('drag-invalid');
            dropIndicator.classList.add('hidden');
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('drag-invalid');
        dropIndicator.classList.remove('hidden');

        const afterElement = getDragAfterElement(container, e.clientY, draggable);
        if (afterElement == null) {
            container.appendChild(dropIndicator);
        } else {
            container.insertBefore(dropIndicator, afterElement);
        }
    };

    container.ondragenter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.add('drag-over');
    };
    container.ondragleave = (e) => {
        if (!container.contains(e.relatedTarget)) {
            container.classList.remove('drag-over');
            container.classList.remove('drag-invalid');
        }
    };
    container.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const draggable = window.draggedElement;
        if (draggable && !container.classList.contains('drag-invalid')) {
            if (dropIndicator.parentElement === container) {
                container.insertBefore(draggable, dropIndicator);
            }
        }
        resetDragState();
    };

    (parentContainer || UI.rootGroup).appendChild(box);
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Helper to find the element we should insert before during drag
 */
export function getDragAfterElement(container, y, draggable) {
    const draggableElements = [...container.querySelectorAll(':scope > .rule-row:not(.is-dragging), :scope > .rule-group-box:not(.is-dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();

        // Hysteresis: If we are already the last child, we make it harder to jump 'before' the last element (and vice versa)
        const isLastChild = draggable && !draggable.nextElementSibling && container.contains(draggable);
        const isCurrentTarget = draggable && draggable.nextElementSibling === child;

        let thresholdPercent = 0.85; // Default for downward move
        if (isLastChild && child === draggableElements[draggableElements.length - 1]) thresholdPercent = 0.2; // Sticky at end
        if (isCurrentTarget) thresholdPercent = 0.3; // Sticky in middle

        const threshold = box.top + (box.height * thresholdPercent);
        const offset = y - threshold;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
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
