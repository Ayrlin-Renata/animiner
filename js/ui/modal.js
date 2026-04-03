/**
 * js/ui/modal.js
 * Modals and Blacklist Manager UI.
 */

import { UI } from './base.js';
import { state } from '../state.js';

export function highlightText(text, terms) {
  if (!text || !terms || terms.length === 0) return text;
  
  // Sort terms by length descending to match longest patterns first
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
  
  // Create a regex that matches any of the terms, escaping them for safety
  const escapedTerms = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Use word boundaries to prevent substring matches (e.g. "his" in "this")
  const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
  
  return text.replace(regex, '<mark class="match-highlight">$1</mark>');
}

export function formatDescription(html, item) {
  if (!html) return 'No description available.';
  // Isolated Highlighting: Only use terms that were actually found in the description field
  const terms = item?._matchDetails?.['description'] || [];
  const clean = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "");
  return highlightText(clean, terms);
}

export function openModal(item) {
  if (!UI.modalContent) return;
  
  // AUTOMATIC SEEN TRACKING (Session-aware)
  window.markAsSeen(item);

  let content = '';
  
  if (state.searchMode === 'MEDIA') {
    const details = item._matchDetails || {};
    const genres = item.genres?.map(g => {
        const terms = details['genres'] || [];
        const isMatch = terms.some(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(g));
        return `<span class="tag ${isMatch ? 'match-highlight-tag' : ''}">${highlightText(g, terms)}</span>`;
    }).join(' ') || '';
    const studios = item.studios?.edges?.filter(e => e.isMain).map(e => e.node.name).join(', ') || 'Unknown';
    const sourceFormatted = item.source?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '?';
    
    // Sort and filter tags
    const allTags = (item.tags || []).sort((a, b) => b.rank - a.rank);
    const visibleTags = allTags.filter(t => !t.isGeneralSpoiler && !t.isMediaSpoiler);
    const spoilerTags = allTags.filter(t => t.isGeneralSpoiler || t.isMediaSpoiler);

    const trailerHtml = item.trailer && item.trailer.site === 'youtube' 
        ? `<div class="section-title">Trailer</div>
           <div class="video-container">
             <iframe src="https://www.youtube.com/embed/${item.trailer.id}" frameborder="0" allowfullscreen></iframe>
           </div>` : '';

    const relationsHtml = item.relations?.edges?.length ? `
        <div class="expandable-section ${item.relations.edges.length > 5 ? 'has-more' : ''}">
            <div class="section-title">Relations</div>
            <div class="expandable-grid mini-grid ${item.relations.edges.length > 5 ? 'is-collapsed' : ''}">
                ${item.relations.edges.map(e => `
                    <a href="https://anilist.co/${e.node.type.toLowerCase()}/${e.node.id}" target="_blank" class="mini-card glass-dark vertical no-style" style="background-image: url('${e.node.coverImage.large}')">
                        <div class="mini-card-overlay"></div>
                        <div class="mini-info">
                            <div class="mini-rel">${e.relationType.replace(/_/g, ' ')}</div>
                            <div class="mini-title">${e.node.title.english || e.node.title.romaji}</div>
                            <div class="mini-meta">${e.node.format?.replace(/_/g, ' ') || ''} · ${e.node.status?.replace(/_/g, ' ') || ''}</div>
                        </div>
                    </a>
                `).join('')}
            </div>
            ${item.relations.edges.length > 5 ? `
              <button class="expand-btn glass-light" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
              </button>
            ` : ''}
        </div>
    ` : '';

    const recommendationsHtml = item.recommendations?.nodes?.length ? `
        <div class="expandable-section has-more">
            <div class="section-title">Recommendations</div>
            <div class="expandable-grid mini-grid is-collapsed">
                ${item.recommendations.nodes.map(n => {
                    const rec = n.mediaRecommendation;
                    if (!rec) return '';
                    return `
                        <a href="https://anilist.co/${rec.type.toLowerCase()}/${rec.id}" target="_blank" class="mini-card glass-dark vertical no-style" style="background-image: url('${rec.coverImage.large}')">
                            <div class="mini-card-overlay"></div>
                            <div class="mini-info">
                                <div class="mini-title">${rec.title.english || rec.title.romaji}</div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
            <button class="expand-btn glass-light hidden" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
            </button>
        </div>
    ` : '';

    const statsHtml = item.stats ? `
        <div class="section-title">Statistics</div>
        <div class="stats-distributions">
            <div class="dist-group">
                <h4>Status Distribution</h4>
                <div class="dist-bar">
                    ${item.stats.statusDistribution.map(d => `
                        <div class="bar-seg" style="width: ${(d.amount / item.popularity * 100).toFixed(1)}%; background: var(--color-${d.status.toLowerCase()})" title="${d.status}: ${d.amount.toLocaleString()}"></div>
                    `).join('')}
                </div>
                <div class="dist-legend">
                    ${item.stats.statusDistribution.map(d => `<span class="legend-item"><i class="dot" style="background: var(--color-${d.status.toLowerCase()})"></i> ${d.status}</span>`).join('')}
                </div>
            </div>
            <div class="dist-group">
                <h4>Score Distribution</h4>
                <div class="dist-bar scores">
                    ${item.stats.scoreDistribution.map(d => {
                        const maxAmount = Math.max(...item.stats.scoreDistribution.map(sd => sd.amount));
                        return `
                            <div class="bar-seg score" style="height: ${(d.amount / maxAmount * 100).toFixed(1)}%; width: calc(10% - 2px); background: var(--accent-color)" title="${d.score}: ${d.amount.toLocaleString()}"></div>
                        `;
                    }).join('')}
                </div>
                <div class="dist-legend">
                  <span class="legend-item">Score (10-100)</span>
                </div>
            </div>
        </div>
    ` : '';

    const linksHtml = item.externalLinks?.length ? `
        <div class="external-links">
            ${item.externalLinks.map(l => `
                <a href="${l.url}" target="_blank" class="ext-link" style="background: ${l.color || 'rgba(255,255,255,0.1)'}">
                    ${l.site}
                </a>
            `).join('')}
        </div>
    ` : '';

    const anilistUrl = getAnilistUrl(item);
    const isWatched = state.watched[state.searchMode]?.some(w => (typeof w === 'object' ? w.id : w) === item.id);
    
    content = `
      <div class="modal-banner" style="background-image: url('${item.bannerImage || item.coverImage.extraLarge}')"></div>
      <div class="modal-header-content">
        <img src="${item.coverImage.extraLarge}" class="modal-poster">
        <div class="modal-title-area">
          <div class="modal-title-header">
            <div class="modal-title-main">
              <h2>${item.title.english || item.title.romaji}</h2>
              <p class="native-title">${item.title.native}</p>
            </div>
            <div class="modal-actions">
              <button class="action-btn watched-btn ${isWatched ? 'active' : ''}" title="${isWatched ? 'Watched! (Click to Unmark)' : 'Mark as Watched'}" onclick="window.toggleWatched(${item.id}, '${(item.title.english || item.title.romaji || '').replace(/'/g, "\\'")}', '${item.coverImage.large}', this)">
                <i data-lucide="${isWatched ? 'check-circle' : 'check'}"></i>
              </button>
              <button class="action-btn block-btn" title="Block Reference" onclick="window.blockItem(${item.id}, '${(item.title.english || item.title.romaji || '').replace(/'/g, "\\'")}', '${item.coverImage.large}', true)">
                <i data-lucide="shield-off"></i>
              </button>
              <button class="action-btn" title="Copy AniList Link" onclick="window.copyToClipboard('${anilistUrl}', this)">
                <i data-lucide="copy"></i>
              </button>
              <a href="${anilistUrl}" target="_blank" class="action-btn" title="Open on AniList">
                <i data-lucide="external-link"></i>
              </a>
            </div>
          </div>
          <div class="modal-badge-row">${genres}</div>
          ${linksHtml}
        </div>
      </div>
      <div class="modal-grid">
        <div class="modal-sidebar">
          <div class="sidebar-section">
            <div class="sidebar-item"><h4>Format</h4><p>${item.format || '?'}</p></div>
            <div class="sidebar-item"><h4>Episodes</h4><p>${item.episodes || item.chapters || '?'}</p></div>
            <div class="sidebar-item"><h4>Status</h4><p>${item.status || '?'}</p></div>
            <div class="sidebar-item"><h4>Start Date</h4><p>${item.startDate?.year || '?'}</p></div>
            <div class="sidebar-item"><h4>Season</h4><p>${item.season || '?'}</p></div>
            <div class="sidebar-item"><h4>Average Score</h4><p>${item.averageScore ? item.averageScore + '%' : '?'}</p></div>
            <div class="sidebar-item"><h4>Popularity</h4><p>${item.popularity?.toLocaleString() || '?'}</p></div>
            <div class="sidebar-item"><h4>Studios</h4><p>${studios}</p></div>
            <div class="sidebar-item"><h4>Source</h4><p>${sourceFormatted}</p></div>
            ${item.hashtag ? `<div class="sidebar-item"><h4>Hashtag</h4><p>${item.hashtag}</p></div>` : ''}
            ${item.synonyms?.length ? `<div class="sidebar-item"><h4>Synonyms</h4><div class="synonym-list">${item.synonyms.map(s => `<p class="synonym-item">${s}</p>`).join('')}</div></div>` : ''}
            <div class="sidebar-item"><h4>Romaji</h4><p>${item.title.romaji}</p></div>
            ${item.title.english ? `<div class="sidebar-item"><h4>English</h4><p>${item.title.english}</p></div>` : ''}
            <div class="sidebar-item"><h4>Native</h4><p>${item.title.native}</p></div>
          </div>
          
          <div class="sidebar-section">
            <div class="section-title small">Tags</div>
            <div class="tag-list">
              ${visibleTags.map(t => {
                const terms = details['tags.name'] || [];
                const isMatch = terms.some(mt => new RegExp(`\\b${mt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t.name));
                return `
                  <div class="tag-list-item ${isMatch ? 'match-highlight-tag' : ''}">
                    <span class="tag-name">${highlightText(t.name, terms)}</span>
                    <span class="tag-rank">${t.rank}%</span>
                  </div>
                `;
              }).join('')}
              ${spoilerTags.length ? `<button class="text-btn spoiler-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Spoiler Tags (+${spoilerTags.length})</button>
              <div class="tag-list hidden">
                ${spoilerTags.map(t => {
                  const terms = details['tags.name'] || [];
                  const isMatch = terms.some(mt => new RegExp(`\\b${mt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t.name));
                  return `
                    <div class="tag-list-item spoiler ${isMatch ? 'match-highlight-tag' : ''}">
                      <span class="tag-name">${highlightText(t.name, terms)}</span>
                      <span class="tag-rank">${t.rank}%</span>
                    </div>
                  `;
                }).join('')}
              </div>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-main">
          <div class="section-title">Description</div>
          <div class="modal-description">${formatDescription(item.description, item)}</div>
          
          ${trailerHtml}
          ${relationsHtml}
          ${item.characters?.edges?.length ? `
            <div class="expandable-section has-more">
              <div class="section-title">Characters</div>
              <div class="expandable-grid char-grid is-collapsed">
                ${item.characters.edges.map(e => {
                  const nativeVA = e.voiceActors?.find(va => va.languageV2 === 'Japanese');
                  const vaLabel = nativeVA ? `${nativeVA.name.full} (Japanese)` : 'No VA info';

                  return `
                  <div class="char-card glass-dark" style="background-image: url('${e.node.image?.large}')">
                    <div class="char-card-overlay"></div>
                    <div class="char-link">
                      <div class="char-info">
                        <p class="char-name">${e.node.name?.full}</p>
                        <p class="char-role">${e.role}</p>
                        <div class="char-traits">
                          ${e.node.gender ? `<span class="trait-badge">${e.node.gender}</span>` : ''}
                          ${e.node.age ? `<span class="trait-badge">${e.node.age}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    
                    ${e.voiceActors?.length ? `
                      <div class="va-expander">
                        <button class="va-toggle-btn" onclick="window.toggleVAs(this)">
                          <span class="va-summary">${vaLabel}</span>
                          <i data-lucide="chevron-down"></i>
                        </button>
                        <div class="va-list hidden">
                          ${e.voiceActors.map(va => `
                            <a href="https://anilist.co/staff/${va.id}" target="_blank" class="va-item no-style">
                              <img src="${va.image?.large}" class="va-img">
                              <div class="va-info">
                                <p class="va-name">${va.name.full}</p>
                                <p class="va-lang">${va.languageV2}</p>
                                <div class="char-traits">
                                  ${va.gender ? `<span class="trait-badge">${va.gender}</span>` : ''}
                                  ${va.age ? `<span class="trait-badge">${va.age}</span>` : ''}
                                </div>
                              </div>
                            </a>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `}).join('')}
              </div>
              <button class="expand-btn glass-light hidden" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
              </button>
            </div>
          ` : ''}
          ${item.studios?.edges?.length ? `
            <div class="section-title">Studios</div>
            <div class="mini-grid">
              ${item.studios.edges.map(e => `
                <a href="https://anilist.co/studio/${e.node.id}" target="_blank" class="mini-card glass-dark no-bg no-style">
                  <div class="mini-info">
                    <div class="mini-rel">${e.isMain ? 'Main Studio' : 'Producer'}</div>
                    <div class="mini-title">${e.node.name}</div>
                  </div>
                </a>
              `).join('')}
            </div>
          ` : ''}

          ${item.staff?.edges?.length ? `
            <div class="expandable-section has-more">
              <div class="section-title">Staff</div>
              <div class="expandable-grid char-grid is-collapsed">
                ${item.staff.edges.map(e => `
                  <a href="https://anilist.co/staff/${e.node.id}" target="_blank" class="char-card no-style" style="background-image: url('${e.node.image?.large}')">
                    <div class="char-card-overlay"></div>
                    <div class="char-link">
                      <div class="char-info">
                        <p class="char-name">${e.node.name?.full}</p>
                        <p class="char-role">${e.role}</p>
                        <div class="char-traits">
                          ${e.node.gender ? `<span class="trait-badge">${e.node.gender}</span>` : ''}
                          ${e.node.age ? `<span class="trait-badge">${e.node.age}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </a>
                `).join('')}
              </div>
              <button class="expand-btn glass-light hidden" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
              </button>
            </div>
          ` : ''}

          ${recommendationsHtml}
          ${statsHtml}
        </div>
      </div>`;
  } else {
    const title = item.name?.full || item.name;
    const subTitle = item.name?.native || '';
    const image = item.image?.large || item.avatar?.large || (item.media?.nodes?.[0]?.coverImage?.medium) || '';
    const anilistUrl = getAnilistUrl(item);
    content = `
      <div class="modal-header-content simple">
        <img src="${image}" class="modal-poster">
        <div class="modal-title-area">
          <div class="modal-title-header">
            <div class="modal-title-main">
              <h2>${title}</h2>
              <p class="native-title">${subTitle}</p>
            </div>
            <div class="modal-actions">
              <button class="action-btn" title="Copy AniList Link" onclick="window.copyToClipboard('${anilistUrl}', this)">
                <i data-lucide="copy"></i>
              </button>
              <a href="${anilistUrl}" target="_blank" class="action-btn" title="Open on AniList">
                <i data-lucide="external-link"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-grid simple">
        <div class="modal-main">
          <div class="section-title">About</div>
          <div class="modal-description">${formatDescription(item.description || item.about, item)}</div>
        </div>
      </div>`;
  }
  UI.modalContent.innerHTML = content;
  UI.modalOverlay.classList.remove('hidden');
  const scrollContainer = UI.modalOverlay.querySelector('.detail-modal');
  if (scrollContainer) scrollContainer.scrollTop = 0;
  
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
  
  // Dynamic Grid Sync
  const grids = UI.modalContent.querySelectorAll('.expandable-grid');
  const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (window.syncGridVisibility) window.syncGridVisibility(entry.target);
    }
  });
  grids.forEach(g => observer.observe(g));
}

export function openBlacklistManager() {
    const list = [...(state.blacklist[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager">
            <div class="mgr-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <h2 style="color: #ef4444">Blacklisted Items (${list.length})</h2>
                ${list.length > 0 ? `
                  <button class="text-btn clear-history-btn" style="margin-top: 0; padding: 0.5rem 1.2rem; height: auto;" onclick="window.clearDiscoveryList('blacklist')">
                    <i data-lucide="trash-2"></i> Clear Blacklist
                  </button>
                ` : ''}
            </div>
            <p class="section-desc">These items are completely hidden from your search results.</p>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state"><p class="empty-msg">Your blacklist is empty.</p></div>' : list.map(item => {
                    const id = typeof item === 'object' ? item.id : item;
                    const rawTitle = typeof item === 'object' ? item.title : '';
                    const title = (typeof rawTitle === 'object' ? (rawTitle.english || rawTitle.romaji || rawTitle.native) : (rawTitle || item.name)) || `Item ID: ${id}`;
                    const image = item.image || '';
                    return `
                        <div class="blacklist-item">
                            <div class="blacklist-item-info">
                                ${image ? `<img src="${image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                                <span class="item-title">${title}</span>
                            </div>
                             <button class="remove-btn" title="Remove from Blacklist" onclick="window.toggleBlacklist(${id}, '', '', false); window.openBlacklistManager();">
                                <i data-lucide="x-circle"></i>
                             </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

// Global exposure for non-module clicks
window.blockItem = (id, title, image, hideModal = false) => {
    const list = state.blacklist[state.searchMode];
    const exists = list.some(item => (typeof item === 'object' ? item.id : item) === id);
    if (!exists) {
        list.push({ id, title, image });
        import('../state.js').then(m => m.saveSettings());
        const cards = document.querySelectorAll('.media-card');
        cards.forEach(card => {
            if (card.querySelector(`button[onclick*="blockItem(${id},"]`) || card.querySelector(`button[onclick*="blockItem(${id})"]`)) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
    }
    
    if (hideModal) {
        UI.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
};

window.unblockItem = (id) => {
    state.blacklist[state.searchMode] = state.blacklist[state.searchMode].filter(item => (typeof item === 'object' ? item.id : item) !== id);
    import('../state.js').then(m => m.saveSettings());
    window.openBlacklistManager(); // Refresh view
};

window.toggleWatched = (id, title, image, btn) => {
    const list = state.watched[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);
    let isWatched = false;

    if (index === -1) {
        list.push({ id, title, image });
        isWatched = true;
    } else {
        list.splice(index, 1);
        isWatched = false;
    }

    import('../state.js').then(m => m.saveSettings());

    // Update visuals if button was passed (Modal)
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', isWatched ? 'check-circle' : 'eye');
            if (window.lucide) window.lucide.createIcons();
        }
        btn.classList.toggle('active', isWatched);
        btn.setAttribute('title', isWatched ? 'Watched! (Click to Unmark)' : 'Mark as Watched');
    }

    // Update result cards visually
    const cards = document.querySelectorAll('.media-card');
    cards.forEach(card => {
        const watchedBtn = card.querySelector(`.watched-btn[onclick*="toggleWatched(${id},"]`);
        if (watchedBtn) {
            const icon = watchedBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isWatched ? 'check-circle' : 'eye');
                if (window.lucide) window.lucide.createIcons();
            }
            watchedBtn.classList.toggle('active', isWatched);
            watchedBtn.setAttribute('title', isWatched ? 'Unmark Watched' : 'Mark as Watched');
            
            // If we are marked as watched and "Include Watched" is OFF, hide the card
            if (isWatched && !state.showWatched) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        }
    });
};

export function openWatchedManager() {
    const list = [...(state.watched[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager watched-manager">
            <div class="mgr-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <h2 style="color: #10b981">Watched List (${list.length})</h2>
                ${list.length > 0 ? `
                  <button class="text-btn clear-history-btn" style="margin-top: 0; padding: 0.5rem 1.2rem; height: auto;" onclick="window.clearDiscoveryList('watched')">
                    <i data-lucide="trash-2"></i> Clear Watched
                  </button>
                ` : ''}
            </div>
            <p class="section-desc">Items you've marked as watched or imported from your completed list.</p>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state"><p class="empty-msg">No watched items yet.</p></div>' : list.map(item => {
                    const id = typeof item === 'object' ? item.id : item;
                    const rawTitle = typeof item === 'object' ? item.title : '';
                    const title = (typeof rawTitle === 'object' ? (rawTitle.english || rawTitle.romaji || rawTitle.native) : (rawTitle || item.name)) || `Item ID: ${id}`;
                    const image = item.image || '';
                    return `
                        <div class="blacklist-item">
                            <div class="blacklist-item-info">
                                ${image ? `<img src="${image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                                <span class="item-title">${title}</span>
                            </div>
                             <button class="remove-btn" title="Unmark Watched" onclick="window.toggleWatched(${id}, '', '', false); window.openWatchedManager();">
                                <i data-lucide="x-circle"></i>
                             </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    const scrollContainer = UI.modalOverlay.querySelector('.detail-modal');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
}

function getAnilistUrl(item) {
    const base = 'https://anilist.co';
    if (state.searchMode === 'MEDIA') {
        const type = item.type?.toLowerCase() || 'anime';
        return `${base}/${type}/${item.id}`;
    }
    const slug = state.searchMode.toLowerCase();
    // Users are unique (anilist.co/user/NAME)
    if (slug === 'user') return `${base}/user/${item.name}`;
    return `${base}/${slug}/${item.id}`;
}

window.copyToClipboard = (text, btn) => {
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        if (!icon) return;
        const original = icon.getAttribute('data-lucide');
        icon.setAttribute('data-lucide', 'check');
        btn.classList.add('success');
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
            icon.setAttribute('data-lucide', original);
            btn.classList.remove('success');
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    });
};window.toggleSection = function(btn) {
  const container = btn.closest('.expandable-section').querySelector('.expandable-grid');
  const isCollapsed = container.classList.toggle('is-collapsed');
  const isExpanded = !isCollapsed; // Track it as expanded for the toggle button UI.

  // Toggle class for CSS-based icon rotation
  btn.classList.toggle('is-expanded', isExpanded);

  // Re-sync visibility based on the new collapsed state
  if (window.syncGridVisibility) window.syncGridVisibility(container);

  const span = btn.querySelector('span');
  if (span) span.textContent = isExpanded ? 'Show Less' : 'Show More';
};

window.syncGridVisibility = function(grid) {
  if (!grid) return;
  const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
  grid.style.setProperty('--items-per-row', columns);
  
  const section = grid.closest('.expandable-section');
  const expandBtn = section?.querySelector('.expand-btn');
  const isCollapsed = grid.classList.contains('is-collapsed');
  
  const totalItems = grid.children.length;
  const itemsInTwoRows = columns * 2;
  
  // Show/Hide children based on row limit if collapsed
  Array.from(grid.children).forEach((child, idx) => {
    if (isCollapsed && idx >= itemsInTwoRows) {
      child.style.display = 'none';
    } else {
      child.style.display = ''; // Restore default display
    }
  });
  
  // Update "Show More" button visibility
  if (expandBtn) {
    expandBtn.classList.toggle('hidden', totalItems <= itemsInTwoRows);
  }
};

window.toggleVAs = (btn) => {
    const card = btn.closest('.char-card');
    const expander = btn.closest('.va-expander');
    const grid = btn.closest('.expandable-grid');
    const list = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    const isHidden = list.classList.toggle('hidden');
    
    // Toggle class on the expander AND its parent card for stacking management
    if (card) card.classList.toggle('va-list-open', !isHidden);
    expander.classList.toggle('va-list-open', !isHidden);
    
    // Toggle class on the grid to allow overflow (prevent clipping)
    if (grid) {
        const anyOpen = grid.querySelectorAll('.va-list-open').length > 0;
        grid.classList.toggle('has-open-va', anyOpen);
    }
    
    if (icon) {
        icon.setAttribute('data-lucide', isHidden ? 'chevron-down' : 'chevron-up');
        if (window.lucide) window.lucide.createIcons();
    }
};

window.openBlacklistManager = openBlacklistManager;
window.openWatchedManager = openWatchedManager;

export function openSeenManager() {
    const list = [...(state.seen[state.searchMode] || [])].reverse();
    const content = `
        <div class="blacklist-manager seen-manager">
            <div class="mgr-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <h2>Seen History (${list.length})</h2>
                ${list.length > 0 ? `
                  <button class="text-btn clear-history-btn" style="margin-top: 0; padding: 0.5rem 1.2rem; height: auto;" onclick="window.clearDiscoveryList('seen')">
                    <i data-lucide="trash-2"></i> Clear History
                  </button>
                ` : ''}
            </div>
            <p class="section-desc">Items you've explored. They are hidden from subsequent searches unless you enable "Show Seen".</p>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state"><p class="empty-msg">No history yet. Start exploring!</p></div>' : list.map(item => {
                    const id = typeof item === 'object' ? item.id : item;
                    const rawTitle = typeof item === 'object' ? item.title : '';
                    const title = (typeof rawTitle === 'object' ? (rawTitle.english || rawTitle.romaji || rawTitle.native) : (rawTitle || item.name)) || `Item ID: ${id}`;
                    const image = item.image || '';
                    return `
                        <div class="blacklist-item">
                            <div class="blacklist-item-info">
                                ${image ? `<img src="${image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                                <span class="item-title">${title}</span>
                            </div>
                             <button class="remove-btn" title="Remove from History" onclick="window.toggleSeen(${id}, '', '', false); window.openSeenManager();">
                                <i data-lucide="x-circle"></i>
                             </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    const scrollContainer = UI.modalOverlay.querySelector('.detail-modal');
    if (scrollContainer) scrollContainer.scrollTop = 0;
    
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
}

window.openSeenManager = openSeenManager;

/**
 * Marks an item as seen. Sets a session flag to prevent immediate hiding.
 */
window.markAsSeen = (item) => {
    if (!item) return;
    const id = item.id;
    const title = item.title.english || item.title.romaji;
    const image = item.coverImage.large;

    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const mode = state.searchMode;
    if (!state.seen[mode].some(s => (typeof s === 'object' ? s.id : s) === id)) {
        state.seen[mode].push({ id, title, image, _sessionSeen: true });
        import('../state.js').then(m => m.saveSettings());

        // UI SYNC: Update the result card instantly if it exists in the results grid
        const card = document.querySelector(`.media-card[data-id="${id}"]`);
        if (card && !card.querySelector('.badge-corner')) {
            const badge = document.createElement('div');
            badge.className = 'badge-corner badge-seen';
            badge.innerHTML = '<i data-lucide="eye"></i>';
            card.prepend(badge);
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

window.toggleSeen = (id, title, image, isAdding = true) => {
    if (!state.seen[state.searchMode]) state.seen[state.searchMode] = [];
    const list = state.seen[state.searchMode];
    const index = list.findIndex(item => (typeof item === 'object' ? item.id : item) === id);
    
    if (isAdding && index === -1) {
        list.push({ id, title, image });
    } else if (!isAdding && index !== -1) {
        list.splice(index, 1);
    }
    
    import('../state.js').then(m => m.saveSettings());
};

window.clearDiscoveryList = (listKey) => {
    const labels = { 'seen': 'Seen History', 'watched': 'Watched List', 'blacklist': 'Blacklist' };
    const label = labels[listKey] || 'list';
    
    // In a future update, this could be a custom modal, but a confirmed browser prompt is the standard starting point.
    if (confirm(`⚠️ DANGER: Are you sure you want to clear your entire ${state.searchMode} ${label}? This cannot be undone.`)) {
        state[listKey][state.searchMode] = [];
        import('../state.js').then(m => m.saveSettings());
        
        // Refresh whichever manager was open
        if (listKey === 'seen') openSeenManager();
        else if (listKey === 'watched') openWatchedManager();
        else if (listKey === 'blacklist') openBlacklistManager();
    }
};

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
    const { auth } = await import('../api/auth.js');
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
        const { importer } = await import('../api/import.js');
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
