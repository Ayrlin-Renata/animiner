/**
 * js/ui/components/builder/FilterRule.js
 * Component for individual filter rule rows.
 */

import { state } from '../../../state.js';
import { FIELDS, RECURSIVE_CATEGORIES, SEARCH_MODE_CATEGORIES, OPERATORS_BY_TYPE, RELATION_FIELDS } from '../../../filter.js';
import { createCombobox } from '../shared/Combobox.js';
import { resetDragState } from './dnd.js';

export function createFilterRule(initialData = null, isSubField = false, subFields = null, parentContainer = null) {
    const row = document.createElement('div');
    row.className = 'rule-row';

    const availableCategories = isSubField ? [] : Object.keys(FIELDS).filter(cat => {
        const mapping = SEARCH_MODE_CATEGORIES[state.searchMode] || [];
        return mapping.includes(cat);
    });

    row.draggable = false;
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
        const cat = Object.keys(FIELDS).find(c => FIELDS[c].some(f => f.path === initialData.path));
        if (cat) catSelect.value = cat;
    }

    if (!initialData && catSelect) {
        catSelect.value = RECURSIVE_CATEGORIES.CONTENT;
        updateFields();
    } else {
        updateFields();
    }

    row.dataset.context = isSubField ? (subFields === RELATION_FIELDS ? 'RELATION' : (parentContainer?.dataset.accepts || 'UNKNOWN')) : 'MEDIA';

    const handle = row.querySelector('.rule-drag-handle');
    handle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'rule');
        window.draggedElement = row;
        row.classList.add('is-dragging');
        const indicator = document.getElementById('dropIndicator');
        if (indicator) indicator.classList.remove('hidden');
        e.stopPropagation();
    };
    handle.ondragend = resetDragState;

    if (window.lucide) window.lucide.createIcons({ root: row });

    return row;
}
