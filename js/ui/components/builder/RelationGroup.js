/**
 * js/ui/components/builder/RelationGroup.js
 * Component for filtering based on related media properties.
 */

import { RELATION_TYPES } from '../../../filter.js';
import { createMultiSelect } from '../shared/MultiSelect.js';
import { createFilterRule } from './FilterRule.js';
import { createFilterGroup } from './FilterGroup.js';
import { resetDragState, getDragAfterElement } from './dnd.js';

export function createRelationGroup(initialData = null, parentContainer = null) {
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
                <select class="group-requirement" title="Requirement Level">
                    <option value="REQUIRED">Required</option>
                    <option value="OPTIONAL">Optional</option>
                </select>
                <div class="multi-select-placeholder"></div>
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

    const reqSelect = box.querySelector('.group-requirement');
    const quantSelect = box.querySelector('.group-quantifier');
    const container = box.querySelector('.group-rules-container');
    const placeholder = box.querySelector('.multi-select-placeholder');
    
    container.dataset.accepts = 'MEDIA';

    const multiSelectOptions = RELATION_TYPES.map(t => ({ 
        value: t, 
        label: t === 'ANY' ? 'Any Relation' : t.replace(/_/g, ' ') 
    }));

    const initialTypes = initialData ? (initialData.relationTypes || (initialData.relationType ? [initialData.relationType] : ['ANY'])) : ['ANY'];

    const multiSelect = createMultiSelect(multiSelectOptions, initialTypes, () => {
        updateRelationContext();
    });

    placeholder.replaceWith(multiSelect);

    const updateRelationContext = () => {
        const checked = Array.from(multiSelect.querySelectorAll('input:checked')).map(cb => cb.value);
        const rt = checked.length === 0 || checked.includes('ANY') ? 'any relation' : checked.map(c => c.replace(/_/g, ' ').toLowerCase()).join(' or ');
        const qt = quantSelect.value;
        const isOpt = reqSelect.value === 'OPTIONAL';

        const isOr = ['SOME_ANY', 'NONE_ANY'].includes(qt);
        const isNegated = ['NONE', 'NOT_ALL', 'NONE_ANY'].includes(qt);

        const prefix = isOpt ? '[Optional] ' : '[Required] ';
        const texts = {
            ALL: `${prefix} EVERY matching ${rt} must match this ENTIRE profile.`,
            ANY: `${prefix} AT LEAST ONE matching ${rt} must match this ENTIRE profile.`,
            NONE: `${prefix} NO matching ${rt} can match this ENTIRE profile.`,
            NOT_ALL: `${prefix} AT LEAST ONE matching ${rt} must fail this profile.`,
            SOME_ANY: `${prefix} (Fuzzy) AT LEAST ONE matching ${rt} must match at least ONE of these rules.`,
            NONE_ANY: `${prefix} (Strict Exclude) NO matching ${rt} can match even ONE of these rules.`
        };
        box.querySelector('.group-help-text').textContent = texts[qt];
        box.classList.toggle('any-logic', isOr);
        box.classList.toggle('negated-group', isNegated);
    };

    const addSubRule = (data = null) => {
        const rule = createFilterRule(data, false, null, container);
        container.appendChild(rule);
    };

    const addSubGroup = (data = null) => {
        createFilterGroup(data, container);
    };

    box.querySelector('.add-relation-rule-btn').onclick = () => addSubRule();
    box.querySelector('.add-sub-group-btn').onclick = () => addSubGroup();
    box.querySelector('.remove-btn').onclick = () => {
        if (window.showConfirmDialog) {
            window.showConfirmDialog({
                title: 'Remove Relation Group?',
                message: 'Are you sure you want to delete this relation group and all its nested rules? This cannot be undone.',
                confirmText: 'Yes, Remove',
                onConfirm: () => {
                    box.remove();
                    import('../../base.js').then(m => m.updateToggleFilterAccent());
                }
            });
        } else {
            box.remove();
        }
    };
    reqSelect.onchange = updateRelationContext;
    quantSelect.onchange = updateRelationContext;

    box.querySelector('.collapse-btn').onclick = () => {
        box.classList.toggle('collapsed');
        box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (initialData) {
        if (initialData.collapsed) box.classList.add('collapsed');
        reqSelect.value = initialData.isOptional ? 'OPTIONAL' : 'REQUIRED';
        quantSelect.value = initialData.quantifier || 'NONE';
        
        if (initialData.alias) {
            box.querySelector('.group-label-input').value = initialData.alias;
        }
        if (initialData.rules) {
            initialData.rules.forEach(r => {
                if (r.type === 'GROUP') {
                    addSubGroup(r);
                } else if (r.type === 'RELATION') {
                    createRelationGroup(r, container);
                } else {
                    addSubRule(r);
                }
            });
        }
    } else {
        addSubRule();
    }

    updateRelationContext();

    const groupHandle = box.querySelector('.group-drag-handle');
    groupHandle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'relation');
        window.draggedElement = box;
        box.classList.add('is-dragging');
        const indicator = document.getElementById('dropIndicator');
        if (indicator) indicator.classList.remove('hidden');
        e.stopPropagation();
    }
    groupHandle.ondragend = resetDragState;

    box.ondragover = (e) => {
        const draggable = window.draggedElement;
        if (!draggable || draggable === box || draggable.contains(box)) return;

        const context = draggable.dataset.context;
        const accepts = container.dataset.accepts;
        if (context !== accepts) {
            container.classList.add('drag-invalid');
            const indicator = document.getElementById('dropIndicator');
            if (indicator) indicator.classList.add('hidden');
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('drag-invalid');
        const indicator = document.getElementById('dropIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            const afterElement = getDragAfterElement(container, e.clientY, draggable);
            if (afterElement == null) {
                container.appendChild(indicator);
            } else {
                container.insertBefore(indicator, afterElement);
            }
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
        const indicator = document.getElementById('dropIndicator');
        if (draggable && !container.classList.contains('drag-invalid')) {
            if (indicator && indicator.parentElement === container) {
                container.insertBefore(draggable, indicator);
            }
        }
        resetDragState();
    };

    if (window.lucide) window.lucide.createIcons({ root: box });

    if (parentContainer) {
        parentContainer.appendChild(box);
    }
    return box;
}
