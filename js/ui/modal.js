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
        <div class="section-title">Relations</div>
        <div class="mini-grid">
            ${item.relations.edges.map(e => `
                <a href="https://anilist.co/${e.node.type.toLowerCase()}/${e.node.id}" target="_blank" class="mini-card glass-dark no-style">
                    <img src="${e.node.coverImage.medium}" class="mini-poster">
                    <div class="mini-info">
                        <div class="mini-rel">${e.relationType.replace(/_/g, ' ')}</div>
                        <div class="mini-title">${e.node.title.english || e.node.title.romaji}</div>
                        <div class="mini-meta">${e.node.format} · ${e.node.status}</div>
                    </div>
                </a>
            `).join('')}
        </div>
    ` : '';

    const recommendationsHtml = item.recommendations?.nodes?.length ? `
        <div class="section-title">Recommendations</div>
        <div class="mini-grid horizontal">
            ${item.recommendations.nodes.map(n => {
                const rec = n.mediaRecommendation;
                if (!rec) return '';
                return `
                    <a href="https://anilist.co/${rec.type.toLowerCase()}/${rec.id}" target="_blank" class="mini-card glass-dark vertical no-style">
                        <img src="${rec.coverImage.medium}" class="mini-poster">
                        <div class="mini-title">${rec.title.english || rec.title.romaji}</div>
                    </a>
                `;
            }).join('')}
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
                <i data-lucide="${isWatched ? 'check-circle' : 'eye'}"></i>
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
            ${item.synonyms?.length ? `<div class="sidebar-item"><h4>Synonyms</h4><p>${item.synonyms.join(', ')}</p></div>` : ''}
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
            <div class="section-title">Featured Characters</div>
            <div class="char-grid">
              ${item.characters.edges.slice(0, 12).map(e => `
                <a href="https://anilist.co/character/${e.node.id}" target="_blank" class="char-card no-style">
                  <img src="${e.node.image?.large}" class="char-img">
                  <div class="char-info">
                    <p class="char-name">${e.node.name?.full}</p>
                    <p class="char-role">${e.role}</p>
                    <div class="char-traits">
                      ${e.node.gender ? `<span class="trait-badge">${e.node.gender}</span>` : ''}
                      ${e.node.age ? `<span class="trait-badge">${e.node.age}</span>` : ''}
                    </div>
                  </div>
                </a>
              `).join('')}
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
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

export function openBlacklistManager() {
    const list = state.blacklist[state.searchMode] || [];
    let content = `
        <div class="blacklist-manager">
            <h2>Blacklist Manager (${state.searchMode})</h2>
            <p class="section-desc">These items will be permanently hidden from your ${state.searchMode.toLowerCase()} searches.</p>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state"><p class="empty-msg">Your blacklist is empty.</p></div>' : list.map(item => {
                    const id = typeof item === 'object' ? item.id : item;
                    const title = item.title || `Item ID: ${id}`;
                    const image = item.image || '';
                    return `
                        <div class="blacklist-item">
                            <div class="blacklist-item-info">
                                ${image ? `<img src="${image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                                <span class="item-title">${title}</span>
                            </div>
                            <button class="remove-btn" onclick="window.unblockItem(${id})">Unblock</button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Global exposure for non-module clicks
window.blockItem = (id, title, image) => {
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
};

window.unblockItem = (id) => {
    state.blacklist[state.searchMode] = state.blacklist[state.searchMode].filter(item => (typeof item === 'object' ? item.id : item) !== id);
    import('../state.js').then(m => m.saveSettings());
    openBlacklistManager(); // Refresh view
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
    const list = state.watched[state.searchMode] || [];
    let content = `
        <div class="blacklist-manager watched-manager">
            <h2>Watched List (${state.searchMode})</h2>
            <p class="section-desc">These items are hidden from searches unless you enable "Include Watched".</p>
            <div class="blacklist-items">
                ${list.length === 0 ? '<div class="empty-state"><p class="empty-msg">No watched items yet.</p></div>' : list.map(item => {
                    const id = typeof item === 'object' ? item.id : item;
                    const title = item.title || `Item ID: ${id}`;
                    const image = item.image || '';
                    return `
                        <div class="blacklist-item">
                            <div class="blacklist-item-info">
                                ${image ? `<img src="${image}" class="blacklist-thumb">` : '<div class="blacklist-thumb-placeholder">?</div>'}
                                <span class="item-title">${title}</span>
                            </div>
                            <button class="remove-btn" onclick="window.toggleWatched(${id}, '', '', null); openWatchedManager();">Remove</button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    UI.modalContent.innerHTML = content;
    UI.modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
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
};
