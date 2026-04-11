/**
 * js/ui/modal/renderer.js
 * HTML Template Rendering for the Details Modal.
 */

import { state } from '../../state.js';
import { highlightText, formatDescription, getAnilistUrl, renderStatusBadge } from './logic.js';

export function renderMediaContent(item) {
  const details = item._matchDetails || {};
  const genresList = item.genres?.map(g => {
    const terms = details['genres'] || [];
    const isMatch = terms.some(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(g));
    return `<span class="tag ${isMatch ? 'match-highlight-tag' : ''}">${highlightText(g, terms)}</span>`;
  }) || [];

  if (item.isAdult) {
    genresList.unshift('<span class="tag adult-tag">Adult</span>');
  }
  const genres = genresList.join(' ');

  const studios = item.studios?.edges?.filter(e => e.isMain).map(e => e.node.name).join(', ') || 'Unknown';
  const sourceFormatted = item.source?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || '?';

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
                ${item.relations.edges.map(e => {
                    return `
                    <a href="https://anilist.co/${e.node.type.toLowerCase()}/${e.node.id}" 
                       target="_blank" 
                       class="mini-card glass-dark vertical no-style" 
                       data-id="${e.node.id}" 
                       data-type="${e.node.type}">
                        ${renderStatusBadge(e.node.id, e.node.type)}
                        <div class="mini-card-body" style="background-image: url('${e.node.coverImage.large}')">
                            <div class="mini-card-overlay"></div>
                        </div>
                        <div class="mini-info">
                            <div class="mini-rel">${e.relationType.replace(/_/g, ' ')}</div>
                            <div class="mini-title">${e.node.title.english || e.node.title.romaji}</div>
                            <div class="mini-meta">${e.node.format?.replace(/_/g, ' ') || ''} · ${e.node.status?.replace(/_/g, ' ') || ''}</div>
                        </div>
                        ${(e.node.type === 'ANIME' || e.node.type === 'MANGA') ? `
                            <div class="mini-card-actions">
                                <button class="mini-action-btn seen" onclick="event.preventDefault(); window.toggleSeen(${e.node.id}, '${(e.node.title.english || e.node.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${e.node.coverImage.large}', undefined, '${e.node.type}')" title="Toggle Seen">
                                    <i data-lucide="eye"></i>
                                </button>
                                <button class="mini-action-btn watched" onclick="event.preventDefault(); window.toggleWatched(${e.node.id}, '${(e.node.title.english || e.node.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${e.node.coverImage.large}', undefined, '${e.node.type}')" title="Toggle Watched">
                                    <i data-lucide="check"></i>
                                </button>
                                <button class="mini-action-btn blacklist" onclick="event.preventDefault(); window.toggleBlacklist(${e.node.id}, '${(e.node.title.english || e.node.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${e.node.coverImage.large}', undefined, '${e.node.type}')" title="Toggle Blacklist">
                                    <i data-lucide="shield-off"></i>
                                </button>
                            </div>
                        ` : ''}
                    </a>
                `;}).join('')}
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
                        <a href="https://anilist.co/${rec.type.toLowerCase()}/${rec.id}" 
                           target="_blank" 
                           class="mini-card glass-dark vertical no-style" 
                           data-id="${rec.id}" 
                           data-type="${rec.type}">
                            ${renderStatusBadge(rec.id, rec.type)}
                            <div class="mini-card-body" style="background-image: url('${rec.coverImage.large}')">
                                <div class="mini-card-overlay"></div>
                            </div>
                            <div class="mini-info">
                                <div class="mini-title">${rec.title.english || rec.title.romaji}</div>
                                <div class="mini-meta">${rec.type}</div>
                            </div>
                        ${(rec.type === 'ANIME' || rec.type === 'MANGA') ? `
                            <div class="mini-card-actions">
                                <button class="mini-action-btn seen" onclick="event.preventDefault(); window.toggleSeen(${rec.id}, '${(rec.title.english || rec.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${rec.coverImage.large}', undefined, '${rec.type}')" title="Toggle Seen">
                                    <i data-lucide="eye"></i>
                                </button>
                                <button class="mini-action-btn watched" onclick="event.preventDefault(); window.toggleWatched(${rec.id}, '${(rec.title.english || rec.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${rec.coverImage.large}', undefined, '${rec.type}')" title="Toggle Watched">
                                    <i data-lucide="check"></i>
                                </button>
                                <button class="mini-action-btn blacklist" onclick="event.preventDefault(); window.toggleBlacklist(${rec.id}, '${(rec.title.english || rec.title.romaji).replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${rec.coverImage.large}', undefined, '${rec.type}')" title="Toggle Blacklist">
                                    <i data-lucide="shield-off"></i>
                                </button>
                            </div>
                        ` : ''}
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

  // Wrap in a setTimeout to ensure the DOM is updated before we start targeting elements
  setTimeout(() => {
    if (window.checkAllFilterStatus) {
      window.checkAllFilterStatus(item);
    }
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 10);

  return `
      <div class="media-details-container">
      <div class="modal-banner" style="background-image: url('${item.bannerImage || item.coverImage.extraLarge}')"></div>
      <div class="modal-header-content">
        <img src="${item.coverImage.extraLarge}" class="modal-poster clickable" onclick="window.openLightbox('${item.coverImage.extraLarge}')" title="View Full Image">
        <div class="modal-title-area">
          <div class="modal-title-header">
            <div class="modal-title-main">
              <div class="modal-title-row">
                <h2>${item.title.english || item.title.romaji}</h2>
                ${item.title.native ? `
                  <button class="translate-btn" onclick="window.translateText(this, '${item.title.native.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')" title="Translate Native Title">
                    <i data-lucide="languages"></i>
                  </button>
                ` : ''}
              </div>
              <p class="native-title">${item.title.native || ''}</p>
            </div>
            <div class="modal-actions">
              <button class="action-btn watched-btn ${isWatched ? 'active' : ''}" title="${isWatched ? 'Watched! (Click to Unmark)' : 'Mark as Watched'}" onclick="window.toggleWatched(${item.id}, '${(item.title.english || item.title.romaji || '').replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${item.coverImage.large}', undefined, '${item.type || 'ANIME'}')">
                <i data-lucide="${isWatched ? 'check-circle' : 'check'}"></i>
              </button>
              <button class="action-btn block-btn" title="Block Reference" onclick="window.blockItem(${item.id}, '${(item.title.english || item.title.romaji || '').replace(/'/g, "\\'").replace(/"/g, "&quot;")}', '${item.coverImage.large}', true, '${item.type || 'ANIME'}')">
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
                  </div>`;
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
                    </div>`;
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
                            </a>`).join('')}
                        </div>
                      </div>` : ''}
                  </div>`;
  }).join('')}
              </div>
              <button class="expand-btn glass-light hidden" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
              </button>
            </div>` : ''}
          ${item.studios?.edges?.length ? `
            <div class="section-title">Studios</div>
            <div class="mini-grid">
              ${item.studios.edges.map(e => `
                <a href="https://anilist.co/studio/${e.node.id}" target="_blank" class="mini-card glass-dark no-bg no-style">
                  <div class="mini-info">
                    <div class="mini-rel">${e.isMain ? 'Main Studio' : 'Producer'}</div>
                    <div class="mini-title">${e.node.name}</div>
                  </div>
                </a>`).join('')}
            </div>` : ''}
          ${item.staff?.edges?.length ? `
            <div class="expandable-section has-more">
              <div class="section-title">Staff</div>
              <div class="expandable-grid char-grid is-collapsed">
                ${[...item.staff.edges]
        .sort((a, b) => window.getStaffPriority(b.role) - window.getStaffPriority(a.role))
        .map(e => `
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
                  </a>`).join('')}
              </div>
              <button class="expand-btn glass-light hidden" onclick="window.toggleSection(this)">
                <span>Show More</span>
                <i data-lucide="chevron-down"></i>
              </button>
            </div>` : ''}
          ${recommendationsHtml}
          ${statsHtml}
        </div>
      </div>`;
}

export function renderStaffContent(item) {
  const title = item.name?.full || item.name;
  const subTitle = item.name?.native || '';
  const image = item.image?.large || item.avatar?.large || (item.media?.nodes?.[0]?.coverImage?.medium) || '';
  const anilistUrl = getAnilistUrl(item);
  return `
      <div class="modal-header-content simple">
        <img src="${image}" class="modal-poster clickable" onclick="window.openLightbox('${image}')" title="View Full Image">
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
