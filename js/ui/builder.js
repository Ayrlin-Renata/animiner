/**
 * js/ui/builder.js
 * Constraint Builder UI logic - acts as a manager for component lifecycle.
 */

import { UI, syncUI, updateDatalist } from './base.js';
import { createFilterRule, createFilterGroup, createRelationGroup, resetDragState, getDragAfterElement } from './components/builder/index.js';

// Global Drop Indicator Element (Must remain accessible for components)
let dropIndicator = document.getElementById('dropIndicator');
if (!dropIndicator) {
    dropIndicator = document.createElement('div');
    dropIndicator.id = 'dropIndicator';
    dropIndicator.className = 'hidden';
    document.body.appendChild(dropIndicator);
}

export { resetDragState, getDragAfterElement };

/**
 * Adds a new rule row using the FilterRule component.
 */
export function addRuleUI(initialData = null, parentContainer = null, isSubField = false, subFields = null) {
    const container = parentContainer || UI.rootGroup;
    const rule = createFilterRule(initialData, isSubField, subFields, container);
    container.appendChild(rule);
    if (window.lucide) window.lucide.createIcons({ root: rule });
}

/**
 * Adds a new group box using the FilterGroup component.
 */
export function addGroupUI(initialData = null, parentContainer = null) {
    const container = parentContainer || UI.rootGroup;
    const group = createFilterGroup(initialData, container);
    // Component handles its own appending if parentContainer is passed, but for safety:
    if (!group.parentElement && container) container.appendChild(group);
    if (window.lucide) window.lucide.createIcons({ root: group });
}

/**
 * Adds a new relation group using the RelationGroup component.
 */
export function addRelationGroupUI(initialData = null, parentContainer = null) {
    const container = parentContainer || UI.rootGroup;
    const relation = createRelationGroup(initialData, container);
    if (!relation.parentElement && container) container.appendChild(relation);
    if (window.lucide) window.lucide.createIcons({ root: relation });
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
        btn.innerHTML = `<i data-lucide="chevron-down"></i> ${i18n.t('buttons.show_filters')}`;
    } else {
        content.classList.remove('hidden-height');
        btn.innerHTML = `<i data-lucide="chevron-up"></i> ${i18n.t('buttons.hide_filters')}`;
    }
    if (window.lucide) window.lucide.createIcons();

    // Refresh badge visibility after state change
    import('./base.js').then(m => m.updateToggleFilterAccent());
}
