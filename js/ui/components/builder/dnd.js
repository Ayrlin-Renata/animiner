/**
 * js/ui/components/builder/dnd.js
 * Drag and Drop utilities for the constraint builder.
 */

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

/**
 * Helper to find the element we should insert before during drag
 */
export function getDragAfterElement(container, y, draggable) {
    const draggableElements = [...container.querySelectorAll(':scope > .rule-row:not(.is-dragging), :scope > .rule-group-box:not(.is-dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();

        // Hysteresis calculation
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

// Global listeners for cleanup
window.addEventListener('dragend', resetDragState);
window.addEventListener('drop', resetDragState);
