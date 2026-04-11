/**
 * js/ui/modal/import.js
 * Logic for the AniList Data Import modal.
 */

import { UI } from '../base.js';
import { renderToggle } from '../components/toggle.js';

/**
 * Opens the AniList Data Import modal.
 */
export function openImportModal() {
    const isLoggedIn = sessionStorage.getItem('al_access_token');

    const content = `
        <div class="import-modal">
            <div class="modal-header">
                <h2>Import Data</h2>
                <p>One-time transfer of your lists to Seen, Watched, and Blacklist.</p>
            </div>
            
            <div class="import-options">
                <!-- Private Import (OAuth) -->
                <div class="import-section glass-dark">
                    <h3><i data-lucide="lock"></i> Private Profile</h3>
                    <p>Import from your own AniList account.</p>
                    ${isLoggedIn ? `
                        <div class="auth-status success">
                            <i data-lucide="check-circle"></i> Connected
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

            <!-- Detached Custom File Sharing -->
            <div class="sharing-section background-integrated">
                <div class="sharing-top">
                    <div class="sharing-info">
                        <h3><i data-lucide="share-2"></i> Local Sharing</h3>
                        <p>Share or backup your specific lists via JSON file.</p>
                    </div>
                    <div class="sharing-selectors">
                        ${renderToggle('shareSeen', 'Seen', true)}
                        ${renderToggle('shareWatched', 'Watched', true)}
                        ${renderToggle('shareBlacklist', 'Blacklist', true)}
                    </div>
                </div>

                <div class="sharing-actions">
                    <button class="secondary-btn" title="Export selected lists to JSON" onclick="window.executeFileExport()">
                        <i data-lucide="upload"></i> Export JSON
                    </button>
                    <button class="secondary-btn" title="Import from JSON file" onclick="document.getElementById('fileImportInput').click()">
                        <i data-lucide="file-json"></i> Import JSON
                    </button>
                    <input type="file" id="fileImportInput" accept=".json" class="hidden" onchange="window.executeFileImport(event)">
                </div>
            </div>

            <div id="importStatus" class="import-status hidden">
                <div class="loader"></div>
                <span>Processing...</span>
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

/**
 * FILE SHARING ACTIONS
 */

window.executeFileExport = async () => {
    const selection = [];
    if (document.getElementById('shareSeen').checked) selection.push('Seen');
    if (document.getElementById('shareWatched').checked) selection.push('Watched');
    if (document.getElementById('shareBlacklist').checked) selection.push('Blacklist');

    if (selection.length === 0) {
        alert("Please select at least one list to export.");
        return;
    }

    try {
        const { exportLists } = await import('../../api/fileIO.js');
        await exportLists(selection);
    } catch (err) {
        alert("Export failed: " + err.message);
    }
};

window.executeFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const selection = [];
    if (document.getElementById('shareSeen').checked) selection.push('Seen');
    if (document.getElementById('shareWatched').checked) selection.push('Watched');
    if (document.getElementById('shareBlacklist').checked) selection.push('Blacklist');

    if (selection.length === 0) {
        alert("Please select at least one list to import.");
        event.target.value = '';
        return;
    }

    const statusEl = document.getElementById('importStatus');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<div class="spinner"></div> Reading file...';

    try {
        const { importLists } = await import('../../api/fileIO.js');
        const result = await importLists(file, selection);
        
        statusEl.innerHTML = `
            <div class="success-message">
                <i data-lucide="check-circle"></i>
                File Import Complete! Added <strong>${result.added}</strong> new items.
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        if (window.runSearch) window.runSearch();
    } catch (err) {
        statusEl.innerHTML = `<div class="error-message">Import failed: ${err.message}</div>`;
    } finally {
        event.target.value = '';
    }
};
