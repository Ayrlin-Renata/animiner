/**
 * warning.js
 * UI for the pre-search filter validation warnings.
 */

import { UI } from '../base.js';

/**
 * Shows a warning modal with the detected filter issues.
 * @param {Array} warnings - List of warning objects.
 * @param {Function} onContinue - Callback if the user chooses to proceed anyway.
 */
export function showSearchWarning(warnings, onContinue) {
    if (!UI.modalContent || !UI.modalOverlay) return;

    // Apply the warning-specific class to the parent modal container
    const parentModal = UI.modalContent.parentElement;
    if (parentModal) parentModal.classList.add('warning-state');

    const warningHtml = warnings.map(w => `
        <div class="search-warning-item ${w.type.toLowerCase()}">
            <div class="warning-icon">
                <i data-lucide="${getIconForType(w.type)}"></i>
            </div>
            <div class="warning-text">
                ${w.message}
            </div>
        </div>
    `).join('');

    UI.modalContent.innerHTML = `
        <div class="warning-header">
            <div class="header-main">
                <h2><i data-lucide="alert-triangle"></i> Potential Search Issues</h2>
                <p>The current filters might prevent any results from being found.</p>
            </div>
        </div>
        
        <div class="warning-list">
            ${warningHtml}
        </div>

        <div class="warning-actions">
            <button id="cancelSearchBtn" class="pill-action secondary">
                <i data-lucide="arrow-left"></i> <span>Go Back & Fix</span>
            </button>
            <button id="continueSearchAnywayBtn" class="pill-action warning-btn">
                 <span>Search Anyway</span> <i data-lucide="play"></i>
            </button>
        </div>
    `;

    UI.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (window.lucide) window.lucide.createIcons();

    // Event listeners
    const cancelBtn = document.getElementById('cancelSearchBtn');
    const continueBtn = document.getElementById('continueSearchAnywayBtn');

    // Use the global closeModal logic for consistency
    const hideModal = () => {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
        if (parentModal) parentModal.classList.remove('warning-state');
    };

    if (UI.closeModal) UI.closeModal.onclick = hideModal;
    cancelBtn.onclick = hideModal;

    continueBtn.onclick = () => {
        hideModal();
        onContinue();
    };
}

function getIconForType(type) {
    switch (type) {
        case 'EMPTY_FIELD': return 'info';
        case 'CONTRADICTION': return 'zap';
        default: return 'alert-circle';
    }
}
