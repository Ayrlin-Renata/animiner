/**
 * js/ui/modal/import.js
 * Logic for the AniList Data Import modal.
 */

import { UI } from '../base.js';

/**
 * Opens the AniList Data Import modal.
 */
export function openImportModal() {
    const isLoggedIn = sessionStorage.getItem('al_access_token');

    const content = `
        <div class="import-modal">
            <div class="modal-header">
                <h2>Import from AniList</h2>
                <p>One-time import of your lists to Seen, Watched, and Blacklist.</p>
            </div>
            
            <div class="import-options">
                <!-- Private Import (OAuth) -->
                <div class="import-section glass-dark">
                    <h3><i data-lucide="lock"></i> Private Profile</h3>
                    <p>Import from your own account (even if private).</p>
                    ${isLoggedIn ? `
                        <div class="auth-status success">
                            <i data-lucide="check-circle"></i> Connected to AniList
                        </div>
                        <button class="primary-btn full-width" onclick="window.executeImport(true)">
                            <i data-lucide="download"></i> Start Private Import
                        </button>
                    ` : `
                        <button class="primary-btn full-width" onclick="window.anilistLogin()">
                            <i data-lucide="log-in"></i> Connect AniList
                        </button>
                    `}
                </div>

                <div class="import-divider"><span>OR</span></div>

                <!-- Public Import (Username) -->
                <div class="import-section glass-dark">
                    <h3><i data-lucide="user"></i> Public Profile</h3>
                    <p>Import from any public AniList username.</p>
                    <div class="search-input-wrapper">
                        <i data-lucide="user" class="input-icon"></i>
                        <input type="text" id="importUsername" placeholder="AniList Username...">
                    </div>
                    <button class="secondary-btn full-width" onclick="window.executeImport(false)">
                        <i data-lucide="download"></i> Import Public List
                    </button>
                </div>
            </div>

            <div id="importStatus" class="import-status hidden">
                <div class="loader"></div>
                <span>Fetching your lists...</span>
            </div>
        </div>
    `;

    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

window.openImportModal = openImportModal;

window.anilistLogin = async () => {
    const { auth } = await import('../../api/auth.js');
    auth.login();
};

window.executeImport = async (isPrivate) => {
    const statusEl = document.getElementById('importStatus');
    const username = document.getElementById('importUsername')?.value;

    if (!isPrivate && !username) {
        alert('Please enter a username.');
        return;
    }

    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="spinner"></div> Importing your lists...';

    try {
        const { importer } = await import('../../api/import.js');
        const collection = await importer.fetchUserLists(isPrivate ? null : username);
        const result = importer.mergeImportedData(collection);

        statusEl.innerHTML = `
            <div class="success-message">
                <i data-lucide="check-circle"></i>
                Import Complete! Added <strong>${result.added}</strong> new items.
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Refresh display if results are visible
        if (window.runSearch) window.runSearch();

    } catch (err) {
        statusEl.innerHTML = `<div class="error-message">${err.message}</div>`;
    }
};
