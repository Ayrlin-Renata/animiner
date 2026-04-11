/**
 * js/ui/components/toggle.js
 * Component for rendering high-fidelity switch toggles.
 */

/**
 * Returns HTML string for a premium toggle switch.
 * @param {string} id - The ID for the input element.
 * @param {string} label - The text label for the switch.
 * @param {boolean} checked - Initial state.
 * @param {string} title - Optional tooltip text.
 */
export function renderToggle(id, label, checked = false, title = '') {
    return `
        <label class="switch-container" title="${title}">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
            <span class="switch-slider"></span>
            <span class="switch-text">${label}</span>
        </label>
    `;
}
