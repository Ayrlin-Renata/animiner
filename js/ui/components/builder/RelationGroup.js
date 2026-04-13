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
                <span class="group-name">${i18n.t('filter.relations.title')}</span>
                <input type="text" class="group-label-input" placeholder="${i18n.t('filter.placeholders.alias')}" spellcheck="false" />
            </div>
            <div class="group-controls">
                <select class="group-requirement" title="${i18n.t('filter.relations.requirement_title')}">
                    <option value="REQUIRED">${i18n.t('filter.relations.required')}</option>
                    <option value="OPTIONAL">${i18n.t('filter.relations.optional')}</option>
                </select>
                <div class="multi-select-placeholder"></div>
                <select class="group-quantifier">
                    <option value="NONE">${i18n.t('filter.relations.quantifiers.none')}</option>
                    <option value="ANY">${i18n.t('filter.relations.quantifiers.any')}</option>
                    <option value="ALL">${i18n.t('filter.relations.quantifiers.all')}</option>
                    <option value="NOT_ALL">${i18n.t('filter.relations.quantifiers.not_all')}</option>
                    <option value="SOME_ANY">${i18n.t('filter.relations.quantifiers.some_any')}</option>
                    <option value="NONE_ANY">${i18n.t('filter.relations.quantifiers.none_any')}</option>
                </select>
                <button class="collapse-btn" title="Collapse/Expand"><i data-lucide="chevron-up"></i></button>
                <button class="remove-btn" title="Remove Relation Group"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        <div class="group-help-text">${i18n.t('filter.relations.help.generic')}</div>
        <div class="group-rules-container"></div>
        <div class="group-actions">
            <button class="text-btn add-relation-rule-btn">
                <i data-lucide="plus"></i> ${i18n.t('builder.add_sub_rule')}
            </button>
            <button class="text-btn secondary add-sub-group-btn">
                <i data-lucide="layers"></i> ${i18n.t('builder.add_sub_group')}
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
        label: i18n.t('filter.relations.' + t.toLowerCase())
    }));

    const initialTypes = initialData ? (initialData.relationTypes || (initialData.relationType ? [initialData.relationType] : ['ANY'])) : ['ANY'];

    const multiSelect = createMultiSelect(multiSelectOptions, initialTypes, () => {
        updateRelationContext();
    });

    placeholder.replaceWith(multiSelect);

    const updateRelationContext = () => {
        const checked = Array.from(multiSelect.querySelectorAll('input:checked')).map(cb => cb.value);
        const translatedRelations = checked.map(c => i18n.t('filter.relations.' + c.toLowerCase()));
        
        let rt;
        if (checked.length === 0 || checked.includes('ANY')) {
            rt = i18n.t('filter.relations.any');
        } else if (translatedRelations.length > 1) {
            const last = translatedRelations.pop();
            rt = translatedRelations.join(', ') + ' ' + i18n.t('filter.operators.or') + ' ' + last; // Need "or" in dictionary
        } else {
            rt = translatedRelations[0];
        }

        const qt = quantSelect.value;
        const isOpt = reqSelect.value === 'OPTIONAL';
        const prefix = isOpt ? i18n.t('filter.relations.help.prefix_optional') : i18n.t('filter.relations.help.prefix_required');

        const isOr = ['SOME_ANY', 'NONE_ANY'].includes(qt);
        const isNegated = ['NONE', 'NOT_ALL', 'NONE_ANY'].includes(qt);

        box.querySelector('.group-help-text').textContent = i18n.t('filter.relations.help.' + qt.toLowerCase(), { prefix, rt });
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
                title: i18n.t('builder.remove_relation_title'),
                message: i18n.t('builder.remove_relation_msg'),
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
