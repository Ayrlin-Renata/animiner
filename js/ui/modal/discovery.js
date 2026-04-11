/**
 * js/ui/modal/discovery.js
 * Manager logic for Seen, Watched, and Blacklist.
 */

import { UI } from '../base.js';
import { state } from '../../state.js';
import { evaluateRule, formatReasonForUser, findDeepFailure } from '../../filter.js';
import { fetchBulkMedia } from '../../api.js';
import { attachTooltip } from '../components/tooltip.js';

export function markAsSeen(item) {
    if (!item) return;
    const id = item.id;
    const title = item.title.english || item.title.romaji;
    const image = item.coverImage.large;

    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const mode = state.searchMode;
    if (!state.seen[mode].some(s => (typeof s === 'object' ? s.id : s) === id)) {
        state.seen[mode].push({
            id,
            title,
            image,
            type: item.type || 'ANIME',
            _sessionSeen: true
        });
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

window.toggleSeen = (id, title, image, forceState, type) => {
    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const list = state.seen[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);

    // Toggle logic: if forceState is provided, use it. Otherwise, flip the current state.
    const isAdding = forceState !== undefined ? forceState : (index === -1);

    if (isAdding && index === -1) list.push({ id, title, image, type: type || 'ANIME' });
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

        // Sync button active state
        const seenBtn = card.querySelector('.seen-btn');
        if (seenBtn) {
            seenBtn.classList.toggle('active', isAdding);
            seenBtn.setAttribute('title', isAdding ? 'Unmark Seen' : 'Mark as Seen');
        }
    });

    if (window.lucide) window.lucide.createIcons();
};

window.toggleWatched = (id, title, image, forceState, type) => {
    if (!state.watched[state.searchMode]) state.watched[state.searchMode] = [];
    const list = state.watched[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);

    let isWatched = forceState !== undefined ? forceState : index === -1;
    if (isWatched && index === -1) list.push({ id, title, image, type: type || 'ANIME' });
    else if (!isWatched && index !== -1) list.splice(index, 1);

    import('../../state.js').then(m => m.saveSettings());

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

        // Sync button active state
        const watchedBtn = card.querySelector('.watched-btn');
        if (watchedBtn) {
            watchedBtn.classList.toggle('active', isWatched);
            watchedBtn.setAttribute('title', isWatched ? 'Unmark Watched' : 'Mark as Watched');
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

window.blockItem = (id, title, image, hideModal = false, type) => {
    const list = state.blacklist[state.searchMode];
    if (!list.some(item => (typeof item === 'object' ? item.id : item) === id)) {
        list.push({ id, title, image, type: type || 'ANIME' });
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

window.toggleBlacklist = (id, title, image, forceState, type) => {
    if (!state.blacklist[state.searchMode]) state.blacklist[state.searchMode] = [];
    const list = state.blacklist[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);

    const isAdding = forceState !== undefined ? forceState : (index === -1);

    if (isAdding) {
        window.blockItem(id, title, image, false, type);
    } else {
        state.blacklist[state.searchMode] = state.blacklist[state.searchMode].filter(item => (typeof item === 'object' ? item.id : item) !== id);
        import('../../state.js').then(m => m.saveSettings());

        // Remove indicators
        document.querySelectorAll(`[data-id="${id}"]`).forEach(card => {
            const badge = card.querySelector('.badge-corner');
            if (badge && badge.classList.contains('badge-blacklisted')) {
                badge.remove();
            }

            // Sync button active state
            const blockBtn = card.querySelector('.block-btn');
            if (blockBtn) {
                blockBtn.classList.toggle('active', false);
                blockBtn.setAttribute('title', 'Block this result');
            }
        });
        if (window.lucide) window.lucide.createIcons();
    }
};

export function openSeenManager(tabArg) {
    const tab = tabArg || window.currentDiscoveryTab || 'ALL';
    window.currentDiscoveryTab = tab;
    const list = [...(state.seen[state.searchMode] || [])].reverse();
    const filteredList = tab === 'ALL' ? list : list.filter(i => (i.type || 'ANIME') === tab);

    const tabsHtml = state.searchMode === 'MEDIA' ? `
        <div class="mgr-tabs">
            <button class="mgr-tab-btn ${tab === 'ALL' ? 'active' : ''}" onclick="window.openSeenManager('ALL')">All</button>
            <button class="mgr-tab-btn ${tab === 'ANIME' ? 'active' : ''}" onclick="window.openSeenManager('ANIME')">Anime</button>
            <button class="mgr-tab-btn ${tab === 'MANGA' ? 'active' : ''}" onclick="window.openSeenManager('MANGA')">Manga</button>
        </div>
    ` : '';

    const content = `
        <div class="blacklist-manager seen-manager">
            <div class="mgr-header-row">
                <h2>Seen History (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('seen')"><i data-lucide="trash-2"></i> Clear History</button>` : ''}
            </div>
            ${tabsHtml}
            <div class="blacklist-items">
                ${filteredList.length === 0 ? '<div class="empty-state">No history here.</div>' : filteredList.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <div class="blacklist-item-right">
                            ${(tab === 'ALL' && state.searchMode === 'MEDIA') ? `<span class="mgr-type-label mgr-${(item.type || 'ANIME').toLowerCase()}">${item.type || 'ANIME'}</span>` : ''}
                            <button class="remove-btn" onclick="window.toggleSeen(${typeof item === 'object' ? item.id : item}, '', '', false); window.openSeenManager();"><i data-lucide="x-circle"></i></button>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function openWatchedManager(tabArg) {
    const tab = tabArg || window.currentDiscoveryTab || 'ALL';
    window.currentDiscoveryTab = tab;
    const list = [...(state.watched[state.searchMode] || [])].reverse();
    const filteredList = tab === 'ALL' ? list : list.filter(i => (i.type || 'ANIME') === tab);

    const tabsHtml = state.searchMode === 'MEDIA' ? `
        <div class="mgr-tabs">
            <button class="mgr-tab-btn ${tab === 'ALL' ? 'active' : ''}" onclick="window.openWatchedManager('ALL')">All</button>
            <button class="mgr-tab-btn ${tab === 'ANIME' ? 'active' : ''}" onclick="window.openWatchedManager('ANIME')">Anime</button>
            <button class="mgr-tab-btn ${tab === 'MANGA' ? 'active' : ''}" onclick="window.openWatchedManager('MANGA')">Manga</button>
        </div>
    ` : '';

    const content = `
        <div class="blacklist-manager watched-manager">
            <div class="mgr-header-row">
                <h2>Watched List (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('watched')"><i data-lucide="trash-2"></i> Clear Watched</button>` : ''}
            </div>
            ${tabsHtml}
            <div class="blacklist-items">
                ${filteredList.length === 0 ? '<div class="empty-state">No watched items here.</div>' : filteredList.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <div class="blacklist-item-right">
                            ${(tab === 'ALL' && state.searchMode === 'MEDIA') ? `<span class="mgr-type-label mgr-${(item.type || 'ANIME').toLowerCase()}">${item.type || 'ANIME'}</span>` : ''}
                            <button class="remove-btn" onclick="window.toggleWatched(${typeof item === 'object' ? item.id : item}, '', '', false); window.openWatchedManager();"><i data-lucide="x-circle"></i></button>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function openBlacklistManager(tabArg) {
    const tab = tabArg || window.currentDiscoveryTab || 'ALL';
    window.currentDiscoveryTab = tab;
    const list = [...(state.blacklist[state.searchMode] || [])].reverse();
    const filteredList = tab === 'ALL' ? list : list.filter(i => (i.type || 'ANIME') === tab);

    const tabsHtml = state.searchMode === 'MEDIA' ? `
        <div class="mgr-tabs">
            <button class="mgr-tab-btn ${tab === 'ALL' ? 'active' : ''}" onclick="window.openBlacklistManager('ALL')">All</button>
            <button class="mgr-tab-btn ${tab === 'ANIME' ? 'active' : ''}" onclick="window.openBlacklistManager('ANIME')">Anime</button>
            <button class="mgr-tab-btn ${tab === 'MANGA' ? 'active' : ''}" onclick="window.openBlacklistManager('MANGA')">Manga</button>
        </div>
    ` : '';

    const content = `
        <div class="blacklist-manager">
            <div class="mgr-header-row">
                <h2 style="color: #ef4444">Blacklisted Items (${list.length})</h2>
                ${list.length > 0 ? `<button class="text-btn clear-history-btn" onclick="window.clearDiscoveryList('blacklist')"><i data-lucide="trash-2"></i> Clear Blacklist</button>` : ''}
            </div>
            ${tabsHtml}
            <div class="blacklist-items">
                ${filteredList.length === 0 ? '<div class="empty-state">Your blacklist is empty here.</div>' : filteredList.map(item => `
                    <div class="blacklist-item">
                        <div class="blacklist-item-info">
                            ${item.image ? `<img src="${item.image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                            <span class="item-title">${item.title || `ID: ${item.id}`}</span>
                        </div>
                        <div class="blacklist-item-right">
                            ${(tab === 'ALL' && state.searchMode === 'MEDIA') ? `<span class="mgr-type-label mgr-${(item.type || 'ANIME').toLowerCase()}">${item.type || 'ANIME'}</span>` : ''}
                            <button class="remove-btn" onclick="window.toggleBlacklist(${typeof item === 'object' ? item.id : item}, '', '', false); window.openBlacklistManager();"><i data-lucide="x-circle"></i></button>
                        </div>
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

    const relMap = {};
    mediaItem.relations?.edges?.forEach(e => relMap[e.node.id] = e.relationType);

    const deeplyCheckGroup = (item, groupRule, softFails) => {
        const subRules = groupRule.rules || [];
        const quantifier = groupRule.quantifier || 'ALL';

        const subResults = subRules.map(sr => ({
            rule: sr,
            match: evaluateRule(item, sr)
        }));

        // We only call this if groupRule FAILED
        // Return true if this failure is "Soft" (caused only by format/status path issues)

        if (quantifier === 'ALL' || quantifier === 'EVERY') {
            // In an ALL group, failure is soft ONLY if every failing sub-rule is a soft-fail
            const hardFails = subResults.filter(r => !r.match.success).filter(r => {
                if (r.rule.type === 'GROUP') return !deeplyCheckGroup(item, r.rule, softFails);
                if (r.rule.path === 'format' || r.rule.path === 'status') {
                    if (!softFails.includes(r.rule.path)) softFails.push(r.rule.path);
                    return false;
                }
                return true;
            });
            return hardFails.length === 0;
        }

        if (quantifier === 'ANY' || quantifier === 'SOME' || quantifier === 'SOME_ANY') {
            // In an ANY group, failure is soft if at least one sub-rule would have caused a soft-fail pass.
            // Actually, if ANY branch is a soft-fail, the failure to find a pass is "soft".
            let foundSoftOption = false;
            subResults.forEach(r => {
                let isSoft = false;
                if (r.rule.type === 'GROUP') isSoft = deeplyCheckGroup(item, r.rule, softFails);
                else if (r.rule.path === 'format' || r.rule.path === 'status') {
                    if (!softFails.includes(r.rule.path)) softFails.push(r.rule.path);
                    isSoft = true;
                }
                if (isSoft) foundSoftOption = true;
            });
            return foundSoftOption;
        }

        if (quantifier === 'NONE' || quantifier === 'NONE_ANY') {
            // In a NONE group, failure means something PASSED.
            // It's a soft fail if everything that passed is a soft-path (format/status).
            const passingRules = subResults.filter(r => r.match.success);
            const hardPasses = passingRules.filter(r => {
                if (r.rule.type === 'GROUP') return false; // Hard passes in sub-groups for NONE are complex, ignore for now
                if (r.rule.path === 'format' || r.rule.path === 'status') {
                    if (!softFails.includes(r.rule.path)) softFails.push(r.rule.path);
                    return false;
                }
                return true;
            });
            return hardPasses.length === 0;
        }

        return false;
    };

    try {
        const results = await fetchBulkMedia(idList);
        results.forEach(item => {
            let hardFail = false;
            let softFails = [];

            state.rules.forEach(rule => {
                const matchResult = evaluateRule(item, rule);
                if (!matchResult.success) {
                    if (rule.type === 'GROUP') {
                        if (!deeplyCheckGroup(item, rule, softFails)) {
                            hardFail = true;
                            item._hardFailReason = findDeepFailure(item, rule, matchResult);
                            console.log(`[Filter Warning] ${item.title.romaji} (ID: ${item.id}) failed hard:`, item._hardFailReason);
                        }
                    } else if (rule.path === 'format' || rule.path === 'status') {
                        if (!softFails.includes(rule.path)) softFails.push(rule.path);
                    } else {
                        hardFail = true;
                        item._hardFailReason = findDeepFailure(item, rule, matchResult);
                        console.log(`[Filter Warning] ${item.title.romaji} (ID: ${item.id}) failed hard:`, item._hardFailReason);
                    }
                }
            });

            // Specific Relation Logic Check
            let relationFail = false;
            const itemRelType = relMap[item.id];
            if (itemRelType) {
                const relevantRelRules = state.rules.filter(r => {
                    if (r.type !== 'RELATION') return false;
                    const types = r.relationTypes || (r.relationType ? [r.relationType] : ['ANY']);
                    return types.includes('ANY') || types.includes(itemRelType);
                });
                if (relevantRelRules.length > 0) {
                    const specificRes = relevantRelRules.map(relRule => {
                        return evaluateRule(item, {
                            type: 'GROUP',
                            path: 'ROOT',
                            quantifier: relRule.quantifier || 'ALL',
                            rules: relRule.rules || []
                        });
                    });

                    relationFail = !specificRes.every(res => res.success);
                    if (relationFail) {
                        const firstFail = specificRes.find(r => !r.success);
                        if (firstFail) {
                            // Find which sub-rule in the failing relation-group caused it
                            const relRule = relevantRelRules[specificRes.indexOf(firstFail)];
                            item._relationFailReason = findDeepFailure(item, relRule, firstFail);
                        } else {
                            item._relationFailReason = 'Unknown relation failure';
                        }
                    }
                }
            }

            const isMatch = !hardFail && softFails.length === 0;
            const isSoftFail = !hardFail && softFails.length > 0;

            const cards = document.querySelectorAll(`.mini-card[data-id="${item.id}"]`);
            cards.forEach(card => {
                card.classList.remove('checking-match');

                if (relationFail) {
                    card.classList.add('fails-rel-filter');
                    const indicator = document.createElement('div');
                    indicator.className = 'match-indicator fail yellow';
                    indicator.innerHTML = '<i data-lucide="filter-x"></i>';
                    indicator.dataset.reason = item._relationFailReason;
                    attachTooltip(indicator, `Relation Fail: ${item._relationFailReason}`);
                    card.appendChild(indicator);
                }

                if (hardFail) {
                    card.classList.add('match-fail');

                    const miniFail = document.createElement('div');
                    miniFail.className = 'mini-fail-icon fail-total';
                    miniFail.title = 'Does not match global search criteria';
                    miniFail.dataset.reason = item._hardFailReason;
                    miniFail.innerHTML = '<i data-lucide="x-circle"></i>';
                    attachTooltip(miniFail, `Filter Fail: ${item._hardFailReason}`);
                    card.appendChild(miniFail);

                    if (!relationFail) {
                        const indicator = document.createElement('div');
                        indicator.className = 'match-indicator fail';
                        indicator.innerHTML = '<i data-lucide="filter-x"></i>';
                        indicator.dataset.reason = item._hardFailReason;
                        attachTooltip(indicator, `Filter Fail: ${item._hardFailReason}`);
                        card.appendChild(indicator);
                    }
                } else if (isMatch || isSoftFail) {
                    // Inject newly fetched formatted strings, highlighting if soft-failed
                    const metaEl = card.querySelector('.mini-meta');
                    if (metaEl) {
                        const fmtStr = item.format ? item.format.replace(/_/g, ' ') : '';
                        const stStr = item.status ? item.status.replace(/_/g, ' ') : '';

                        let displayFmt = fmtStr;
                        if (softFails.includes('format') && fmtStr) {
                            displayFmt = `<span class="soft-fail-text">${fmtStr}</span>`;
                        }

                        let displaySt = stStr;
                        if (softFails.includes('status') && stStr) {
                            displaySt = `<span class="soft-fail-text">${stStr}</span>`;
                        }

                        const parts = [];
                        if (fmtStr) parts.push(displayFmt);
                        if (stStr) parts.push(displaySt);

                        if (parts.length > 0) {
                            metaEl.innerHTML = parts.join(' · ');
                        } else if (item.type) {
                            metaEl.innerHTML = item.type;
                        }
                    }
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
