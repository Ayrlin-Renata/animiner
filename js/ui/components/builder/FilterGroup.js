/**
 * js/ui/components/builder/FilterGroup.js
 * Component for logical filter groups (ALL/ANY/NONE).
 */

import { UI } from '../../base.js';
import { COLLECTION_PATHS, SUB_FIELDS } from '../../../filter.js';
import { createFilterRule } from './FilterRule.js';
import { resetDragState, getDragAfterElement } from './dnd.js';

export function createFilterGroup(initialData = null, parentContainer = null) {
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
        const optSomeAny = quantSelect.querySelector('option[value="SOME_ANY"]');
        const optNoneAny = quantSelect.querySelector('option[value="NONE_ANY"]');
        if (optSomeAny) optSomeAny.disabled = isLogic;
        if (optNoneAny) optNoneAny.disabled = isLogic;

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
        box.classList.toggle('collection-group', !isLogic);
        box.classList.toggle('any-logic', isOr);
        box.classList.toggle('negated-group', isNegated);

        box.querySelector('.group-name').textContent = isLogic ? 'Logic' : 'Collection';
        box.querySelector('.collection-icon').classList.toggle('hidden', isLogic);
        box.querySelector('.logic-icon').classList.toggle('hidden', !isLogic);

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
        const rule = isLogic ? createFilterRule(data, false, null, container) : createFilterRule(data, true, SUB_FIELDS[pathSelect.value], container);
        container.appendChild(rule);
    };

    const addSubGroup = (data = null) => {
        createFilterGroup(data, container);
    };

    addBtn.onclick = () => addSubRule();
    box.querySelector('.add-sub-group-btn').onclick = () => addSubGroup();

    pathSelect.onchange = () => {
        container.innerHTML = '';
        updateGroupContext();
        addSubRule();
    };
    quantSelect.onchange = updateGroupContext;
    box.querySelector('.remove-btn').onclick = () => {
        if (window.showConfirmDialog) {
            window.showConfirmDialog({
                title: 'Remove Filter Group?',
                message: 'Are you sure you want to delete this group and all its nested rules? This cannot be undone.',
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

    box.querySelector('.collapse-btn').onclick = () => {
        box.classList.toggle('collapsed');
        box.dispatchEvent(new Event('change', { bubbles: true }));
    };

    if (initialData) {
        if (initialData.collapsed) box.classList.add('collapsed');
        if (initialData.rules) {
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
    } else {
        addSubRule();
    }

    updateGroupContext();

    const groupHandle = box.querySelector('.group-drag-handle');
    groupHandle.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'group');
        window.draggedElement = box;
        box.classList.add('is-dragging');
        const indicator = document.getElementById('dropIndicator');
        if (indicator) indicator.classList.remove('hidden');
        e.stopPropagation();
    }
    groupHandle.ondragend = resetDragState;

    box.dataset.accepts = 'RELATION';
    box.dataset.context = 'MEDIA';

    box.ondragover = (e) => {
        const draggable = window.draggedElement;
        if (!draggable || draggable === box || draggable.contains(box)) return;

        const context = draggable.dataset.context;
        const accepts = container.dataset.accepts;
        const isCompatible = (context === accepts) || (context === 'GROUP' && accepts === 'MEDIA');

        const indicator = document.getElementById('dropIndicator');
        if (!isCompatible) {
            container.classList.add('drag-invalid');
            if (indicator) indicator.classList.add('hidden');
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        container.classList.remove('drag-invalid');
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
