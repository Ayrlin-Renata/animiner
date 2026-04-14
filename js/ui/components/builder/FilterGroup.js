/**
 * js/ui/components/builder/FilterGroup.js
 * Component for logical filter groups (ALL/ANY/NONE).
 */

import { UI } from '../../base.js';
import { COLLECTION_PATHS, SUB_FIELDS } from '../../../filter.js';
import { createFilterRule } from './FilterRule.js';
import { createRelationGroup } from './RelationGroup.js';
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
                <span class="group-name">${i18n.t('builder.collection_group')}</span>
                <input type="text" class="group-label-input" placeholder="${i18n.t('filter.placeholders.alias')}" spellcheck="false" />
            </div>
            <div class="group-controls">
                <select class="group-path">
                    <option value="ROOT">MEDIA</option>
                    ${Object.entries(COLLECTION_PATHS).filter(([k]) => k !== 'LOGIC').map(([key, val]) => `<option value="${val}">${i18n.t('filter.categories.' + key.toLowerCase())}</option>`).join('')}
                </select>
                <select class="group-quantifier">
                    <option value="ALL">${i18n.t('filter.quantifiers.all')}</option>
                    <option value="ANY">${i18n.t('filter.quantifiers.any')}</option>
                    <option value="NONE">${i18n.t('filter.quantifiers.none')}</option>
                    <option value="NOT_ALL">${i18n.t('filter.quantifiers.not_all')}</option>
                    <option value="SOME_ANY">${i18n.t('filter.quantifiers.some_any')}</option>
                    <option value="NONE_ANY">${i18n.t('filter.quantifiers.none_any')}</option>
                </select>
                <button class="collapse-btn" title="Collapse/Expand"><i data-lucide="chevron-up"></i></button>
                <button class="remove-btn" title="Remove Group"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-help-text">...</div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-sub-rule-btn">
                <i data-lucide="plus"></i> ${i18n.t('builder.add_sub_rule')}
            </button>
            <button class="text-btn add-sub-group-btn">
                <i data-lucide="layers"></i> ${i18n.t('builder.add_sub_group')}
            </button>
            <button class="text-btn add-sub-relation-btn hidden">
                <i data-lucide="git-branch-plus"></i> ${i18n.t('builder.add_sub_relation')}
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

        box.querySelector('.group-name').textContent = isLogic ? i18n.t('builder.logic_group') : i18n.t('builder.collection_group');
        box.querySelector('.collection-icon').classList.toggle('hidden', isLogic);
        box.querySelector('.logic-icon').classList.toggle('hidden', !isLogic);

        container.dataset.accepts = isLogic ? 'MEDIA' : pathSelect.value;
        box.dataset.context = isLogic ? 'MEDIA' : 'GROUP';

        const quantifierText = {
            ALL: isLogic ? i18n.t('filter.help.logic.all') : i18n.t('filter.help.collection.all'),
            ANY: isLogic ? i18n.t('filter.help.logic.any') : i18n.t('filter.help.collection.any'),
            NONE: isLogic ? i18n.t('filter.help.logic.none') : i18n.t('filter.help.collection.none'),
            NOT_ALL: isLogic ? i18n.t('filter.help.logic.not_all') : i18n.t('filter.help.collection.not_all'),
            SOME_ANY: i18n.t('filter.help.collection.some_any'),
            NONE_ANY: i18n.t('filter.help.collection.none_any')
        };
        box.querySelector('.group-help-text').textContent = quantifierText[quantifier];

        const addRelBtn = box.querySelector('.add-sub-relation-btn');
        if (addRelBtn) addRelBtn.classList.toggle('hidden', !isLogic);
    };

    if (initialData) {
        pathSelect.value = initialData.path;
        quantSelect.value = initialData.quantifier || 'ANY';
        if (initialData.alias) {
            box.querySelector('.group-label-input').value = initialData.alias;
        }
    }

    const updatePathContext = () => updateGroupContext();

    const addSubRule = (data = null) => {
        const isLogic = pathSelect.value === 'ROOT';
        const rule = isLogic ? createFilterRule(data, false, null, container) : createFilterRule(data, true, SUB_FIELDS[pathSelect.value], container);
        container.appendChild(rule);
    };

    const addSubGroup = (data = null) => {
        createFilterGroup(data, container);
    };

    const addSubRelation = (data = null) => {
        createRelationGroup(data, container);
    };

    addBtn.onclick = () => addSubRule();
    box.querySelector('.add-sub-group-btn').onclick = () => addSubGroup();
    box.querySelector('.add-sub-relation-btn').onclick = () => addSubRelation();

    pathSelect.onchange = () => {
        container.innerHTML = '';
        updateGroupContext();
        addSubRule();
    };
    quantSelect.onchange = updateGroupContext;
    box.querySelector('.remove-btn').onclick = () => {
        if (window.showConfirmDialog) {
            window.showConfirmDialog({
                title: i18n.t('builder.remove_group_title'),
                message: i18n.t('builder.remove_group_msg'),
                confirmText: i18n.t('builder.remove_group_confirm'),
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
                } else if (r.type === 'RELATION') {
                    addSubRelation(r);
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

    box.addEventListener('relocalize', () => {
        // Update header labels
        const currentPath = pathSelect.value;
        const currentQuant = quantSelect.value;

        pathSelect.innerHTML = `
            <option value="ROOT">MEDIA</option>
            ${Object.entries(COLLECTION_PATHS).filter(([k]) => k !== 'LOGIC').map(([key, val]) => `<option value="${val}">${i18n.t('filter.categories.' + key.toLowerCase())}</option>`).join('')}
        `;
        pathSelect.value = currentPath;

        quantSelect.innerHTML = `
            <option value="ALL">${i18n.t('filter.quantifiers.all')}</option>
            <option value="ANY">${i18n.t('filter.quantifiers.any')}</option>
            <option value="NONE">${i18n.t('filter.quantifiers.none')}</option>
            <option value="NOT_ALL">${i18n.t('filter.quantifiers.not_all')}</option>
            <option value="SOME_ANY">${i18n.t('filter.quantifiers.some_any')}</option>
            <option value="NONE_ANY">${i18n.t('filter.quantifiers.none_any')}</option>
        `;
        quantSelect.value = currentQuant;

        box.querySelector('.add-sub-rule-btn').innerHTML = `<i data-lucide="plus"></i> ${i18n.t('builder.add_sub_rule')}`;
        box.querySelector('.add-sub-group-btn').innerHTML = `<i data-lucide="layers"></i> ${i18n.t('builder.add_sub_group')}`;
        box.querySelector('.add-sub-relation-btn').innerHTML = `<i data-lucide="git-branch-plus"></i> ${i18n.t('builder.add_sub_relation')}`;
        box.querySelector('.group-label-input').placeholder = i18n.t('filter.placeholders.alias');

        updateGroupContext();
        if (window.lucide) window.lucide.createIcons({ root: box });
    });

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
