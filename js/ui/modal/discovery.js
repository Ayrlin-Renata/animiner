/**
 * js/ui/modal/discovery.js
 * Manager logic for Seen, Watched, and Blacklist.
 */

import { UI } from '../base.js';
import { state } from '../../state.js';
import { evaluateRule } from '../../filter.js';
import { fetchBulkMedia } from '../../api.js';

export function markAsSeen(item) {
    if (!item) return;
    const id = item.id;
    const title = item.title.english || item.title.romaji;
    const image = item.coverImage.large;

    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const mode = state.searchMode;
    if (!state.seen[mode].some(s => (typeof s === 'object' ? s.id : s) === id)) {
        state.seen[mode].push({ id, title, image, _sessionSeen: true });
        import('../../state.js').then(m => m.saveSettings());

        // Update ALL cards (mini and main) across the entire session
        document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
            if (!card.querySelector('.badge-corner')) {
                const badge = document.createElement('div');
                badge.className = 'badge-corner badge-seen';
                badge.innerHTML = '<i data-lucide="eye"></i>';
                card.prepend(badge);
            }
        });

        if (window.lucide) window.lucide.createIcons();
    }
}

window.markAsSeen = markAsSeen;

window.toggleSeen = (id, title, image, forceState) => {
    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const list = state.seen[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);
    
    // Toggle logic: if forceState is provided, use it. Otherwise, flip the current state.
    const isAdding = forceState !== undefined ? forceState : (index === -1);
    
    if (isAdding && index === -1) list.push({ id, title, image });
    else if (!isAdding && index !== -1) list.splice(index, 1);
    import('../../state.js').then(m => m.saveSettings());

    // Update ALL cards (mini and main) across the entire session
    document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
        const badge = card.querySelector('.badge-corner');
        if (isAdding) {
            if (!badge) {
                const newBadge = document.createElement('div');
                newBadge.className = 'badge-corner badge-seen';
                newBadge.innerHTML = '<i data-lucide="eye"></i>';
                card.prepend(newBadge);
            } else {
                badge.className = 'badge-corner badge-seen';
                badge.innerHTML = '<i data-lucide="eye"></i>';
            }
        } else if (badge && badge.classList.contains('badge-seen')) {
            badge.remove();
        }
    });

    if (window.lucide) window.lucide.createIcons();
};

window.toggleWatched = (id, title, image, btn) => {
    const list = state.watched[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);
    let isWatched = index === -1;
    if (isWatched) list.push({ id, title, image });
    else list.splice(index, 1);

    import('../../state.js').then(m => m.saveSettings());

    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isWatched ? 'check-circle' : 'eye');
            if (window.lucide) window.lucide.createIcons();
        }
        btn.classList.toggle('active', isWatched);
        btn.setAttribute('title', isWatched ? 'Watched! (Click to Unmark)' : 'Mark as Watched');
    }
    if (window.lucide) window.lucide.createIcons();

    // Update ALL cards (mini and main) across the entire session
    document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
        const badge = card.querySelector('.badge-corner');
        if (isWatched) {
            if (!badge) {
                const newBadge = document.createElement('div');
                newBadge.className = 'badge-corner badge-watched';
                newBadge.innerHTML = '<i data-lucide="check-circle"></i>';
                card.prepend(newBadge);
            } else {
                badge.className = 'badge-corner badge-watched';
                badge.innerHTML = '<i data-lucide="check-circle"></i>';
            }
        } else if (badge && badge.classList.contains('badge-watched')) {
            badge.remove();
        }
        
        // Handle scanner-style removal if hidden
        if (isWatched && !state.showWatched && card.classList.contains('media-card')) {
             card.style.opacity = '0';
             card.style.transform = 'scale(0.8)';
             setTimeout(() => card.remove(), 300);
        }
    });

    if (window.lucide) window.lucide.createIcons();
};

window.blockItem = (id, title, image, hideModal = false) => {
    const list = state.blacklist[state.searchMode];
    if (!list.some(item => (typeof item === 'object' ? item.id : item) === id)) {
        list.push({ id, title, image });
        import('../../state.js').then(m => m.saveSettings());
        
        document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
            const badge = card.querySelector('.badge-corner');
            if (!badge) {
                const newBadge = document.createElement('div');
                newBadge.className = 'badge-corner badge-blacklisted';
                newBadge.innerHTML = '<i data-lucide="shield-off"></i>';
                card.prepend(newBadge);
            } else {
                badge.className = 'badge-corner badge-blacklisted';
                badge.innerHTML = '<i data-lucide="shield-off"></i>';
            }

            // Handle scanner-style removal if it's the main grid
            if (card.classList.contains('media-card')) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
        if (window.lucide) window.lucide.createIcons();
    }
    if (hideModal) {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
};

window.toggleBlacklist = (id, title, image, forceState) => {
    if (!state.blacklist[state.searchMode]) state.blacklist[state.searchMode] = [];
    const list = state.blacklist[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);
    
    const isAdding = forceState !== undefined ? forceState : (index === -1);
    
    if (isAdding) {
        window.blockItem(id, title, image);
    } else {
        state.blacklist[state.searchMode] = state.blacklist[state.searchMode].filter(item => (typeof item === 'object' ? item.id : item) !== id);
        import('../../state.js').then(m => m.saveSettings());
        
        // Remove indicators
        document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
            const badge = card.querySelector('.badge-corner');
            if (badge && badge.classList.contains('badge-blacklisted')) {
                badge.remove();
            }
        });
        if (window.lucide) window.lucide.createIcons();
    }
};

export function openSeenManager() {
    const list = [...(state.seen[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager seen-manager">
            <div class="mgr-header-row">
                <h2>Seen History (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('seen')"><i data-lucide="trash-2"></i> Clear History</button>` : ''}
            </div>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state">No history yet.</div>' : list.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <button class="remove-btn" onclick="window.toggleSeen(${typeof item === 'object' ? item.id : item}, '', '', false); window.openSeenManager();"><i data-lucide="x-circle"></i></button>
                    </div>`).join('')}
            </div>
        </div>`;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function openWatchedManager() {
    const list = [...(state.watched[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager watched-manager">
            <div class="mgr-header-row">
                <h2>Watched List (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('watched')"><i data-lucide="trash-2"></i> Clear Watched</button>` : ''}
            </div>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state">No watched items yet.</div>' : list.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <button class="remove-btn" onclick="window.toggleWatched(${typeof item === 'object' ? item.id : item}, '', '', false); window.openWatchedManager();"><i data-lucide="x-circle"></i></button>
                    </div>`).join('')}
            </div>
        </div>`;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function openBlacklistManager() {
    const list = [...(state.blacklist[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager">
            <div class="mgr-header-row">
                <h2 style="color: #ef4444">Blacklisted Items (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('blacklist')"><i data-lucide="trash-2"></i> Clear Blacklist</button>` : ''}
            </div>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state">Your blacklist is empty.</div>' : list.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <button class="remove-btn" onclick="window.toggleBlacklist(${typeof item === 'object' ? item.id : item}, '', '', false); window.openBlacklistManager();"><i data-lucide="x-circle"></i></button>
                    </div>`).join('')}
            </div>
        </div>`;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

window.openSeenManager = openSeenManager;
window.openWatchedManager = openWatchedManager;
window.openBlacklistManager = openBlacklistManager;

window.clearDiscoveryList = (listKey) => {
    const labels = { 'seen': 'Seen History', 'watched': 'Watched List', 'blacklist': 'Blacklist' };
    window.showConfirmDialog({
        title: `Clear ${labels[listKey] || 'List'}?`,
        message: `⚠️ DANGER: Are you sure you want to clear your entire ${state.searchMode} ${labels[listKey] || 'list'}? This cannot be undone.`,
        confirmText: 'Yes, Clear All',
        onConfirm: () => {
            state[listKey][state.searchMode] = [];
            import('../../state.js').then(m => m.saveSettings());
            if (listKey === 'seen') openSeenManager();
            else if (listKey === 'watched') openWatchedManager();
            else if (listKey === 'blacklist') openBlacklistManager();
        }
    });
};

/**
 * Automatically checks all relations and recommendations for filter matches.
 */
window.checkAllFilterStatus = async (mediaItem) => {
    if (!state.rules || state.rules.length === 0) return;

    const ids = new Set();
    mediaItem.relations?.edges?.forEach(e => ids.add(e.node.id));
    mediaItem.recommendations?.nodes?.forEach(n => n.mediaRecommendation && ids.add(n.mediaRecommendation.id));

    const idList = [...ids];
    if (idList.length === 0) return;

    // UI Feedback: Mark as checking
    idList.forEach(id => {
        const cards = document.querySelectorAll(`.mini-card[data-id="${id}"]`);
        cards.forEach(c => c.classList.add('checking-match'));
    });

    // Rate Limit Safety: If a massive scan is ongoing, we wait or yield
    if (state.isScanning) {
        console.log('[Bulk Match] Global scan active - yielding to scanner...');
        // We'll proceed but carefully. AniList gives us 90/min.
    }

    try {
        const results = await fetchBulkMedia(idList);
        results.forEach(item => {
            const matchResult = state.rules.every(rule => evaluateRule(item, rule).success);
            
            const cards = document.querySelectorAll(`.mini-card[data-id="${item.id}"]`);
            cards.forEach(card => {
                card.classList.remove('checking-match');
                
                if (!matchResult) {
                    card.classList.add('match-fail');
                    // Add no-match indicator icon
                    const indicator = document.createElement('div');
                    indicator.className = 'match-indicator fail';
                    indicator.innerHTML = '<i data-lucide="filter-x"></i>';
                    card.appendChild(indicator);
                }
            });
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (e) {
        console.error('[Bulk Match] Failed to check status:', e);
        idList.forEach(id => {
            document.querySelectorAll(`.mini-card[data-id="${id}"]`).forEach(c => c.classList.remove('checking-match'));
        });
    }
};
