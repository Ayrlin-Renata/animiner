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
                <h2>${i18n.t('modals.import.title')}</h2>
                <p>${i18n.t('modals.import.subtitle')}</p>
            </div>
            
            <div class="import-options">
                <!-- Private Import (OAuth) -->
                <div class="import-section glass-dark">
                    <h3><i data-lucide="lock"></i> ${i18n.t('modals.import.private_header')}</h3>
                    <p>${i18n.t('modals.import.private_desc')}</p>
                    ${isLoggedIn ? `
                        <div class="auth-status success">
                            <i data-lucide="check-circle"></i> ${i18n.t('modals.import.connected')}
                        </div>
                        <button class="primary-btn full-width" onclick="window.executeImport(true)">
                            <i data-lucide="download"></i> ${i18n.t('modals.import.start_private')}
                        </button>
                    ` : `
                        <button class="primary-btn full-width" onclick="window.anilistLogin()">
                            <i data-lucide="log-in"></i> ${i18n.t('modals.import.connect_anilist')}
                        </button>
                    `}
                </div>

                <div class="import-divider"><span>${i18n.t('filter.operators.or')}</span></div>

                <!-- Public Import (Username) -->
                <div class="import-section glass-dark">
                    <h3><i data-lucide="user"></i> ${i18n.t('modals.import.public_header')}</h3>
                    <p>${i18n.t('modals.import.public_desc')}</p>
                    <div class="search-input-wrapper">
                        <i data-lucide="user" class="input-icon"></i>
                        <input type="text" id="importUsername" placeholder="${i18n.t('modals.import.username_placeholder')}">
                    </div>
                    <button class="secondary-btn full-width" onclick="window.executeImport(false)">
                        <i data-lucide="download"></i> ${i18n.t('modals.import.start_public')}
                    </button>
                </div>
            </div>

            <!-- Detached Custom File Sharing -->
            <div class="sharing-section background-integrated">
                <div class="sharing-top">
                    <div class="sharing-info">
                        <h3><i data-lucide="share-2"></i> ${i18n.t('modals.import.sharing_header')}</h3>
                        <p>${i18n.t('modals.import.sharing_desc')}</p>
                    </div>
                    <div class="sharing-selectors">
                        ${renderToggle('shareSeen', i18n.t('modals.history.seen_title', { count: '' }).split('(')[0].trim(), true)}
                        ${renderToggle('shareWatched', i18n.t('modals.history.watched_title', { count: '' }).split('(')[0].trim(), true)}
                        ${renderToggle('shareBlacklist', i18n.t('modals.history.blacklist_title', { count: '' }).split('(')[0].trim(), true)}
                    </div>
                </div>

                <div class="sharing-actions">
                    <button class="secondary-btn" title="${i18n.t('modals.import.export_json')}" onclick="window.executeFileExport()">
                        <i data-lucide="upload"></i> ${i18n.t('modals.import.export_json')}
                    </button>
                    <button class="secondary-btn" title="${i18n.t('modals.import.import_json')}" onclick="document.getElementById('fileImportInput').click()">
                        <i data-lucide="file-json"></i> ${i18n.t('modals.import.import_json')}
                    </button>
                    <input type="file" id="fileImportInput" accept=".json" class="hidden" onchange="window.executeFileImport(event)">
                </div>
            </div>

            <div id="importStatus" class="import-status hidden">
                <div class="loader"></div>
                <span>${i18n.t('modals.import.processing')}</span>
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
        alert(i18n.t('modals.import.error_username'));
        return;
    }

    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<div class="spinner"></div> ${i18n.t('modals.import.importing_status')}`;

    try {
        const { importer } = await import('../../api/import.js');
        const collection = await importer.fetchUserLists(isPrivate ? null : username);
        const result = importer.mergeImportedData(collection);

        statusEl.innerHTML = `
            <div class="success-message">
                <i data-lucide="check-circle"></i>
                ${i18n.t('modals.import.import_complete', { count: result.added })}
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Refresh display if results are visible
        if (window.runSearch) window.runSearch();

    } catch (err) {
        statusEl.innerHTML = `<div class="error-message">${i18n.t('modals.import.import_failed', { error: err.message })}</div>`;
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
        alert(i18n.t('modals.import.error_select_list'));
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
        alert(i18n.t('modals.import.error_select_list'));
        event.target.value = '';
        return;
    }

    const statusEl = document.getElementById('importStatus');
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<div class="spinner"></div> ${i18n.t('modals.import.read_file')}`;

    try {
        const { importLists } = await import('../../api/fileIO.js');
        const result = await importLists(file, selection);
        
        statusEl.innerHTML = `
            <div class="success-message">
                <i data-lucide="check-circle"></i>
                ${i18n.t('modals.import.import_complete', { count: result.added })}
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
