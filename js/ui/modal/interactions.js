import { saveMediaListEntry } from '../../api.js';
import { state } from '../../state.js';

window.addToPlanning = async (mediaId, isPrivate, btn) => {
    const icon = btn.querySelector('i, svg');
    const originalIcon = icon?.getAttribute('data-lucide');
    
    try {
        btn.classList.add('loading');
        // Provide immediate visual feedback for better UX
        if (icon) icon.setAttribute('data-lucide', 'loader-2');
        if (window.lucide) window.lucide.createIcons({ root: btn });
        btn.querySelector('svg')?.classList.add('animate-spin');

        const newEntry = await saveMediaListEntry(mediaId, 'PLANNING', isPrivate);
        
        // Update local state results so it persists when re-opening modal
        state.results.forEach(item => {
            if (item.id === mediaId) {
                item.mediaListEntry = newEntry;
            }
        });
        
        btn.classList.remove('loading');
        btn.classList.add('success', 'active');
        
        // Update tooltip/title
        btn.title = isPrivate ? 'On Private Planning List' : 'On Planning List';

        if (icon) {
            const successIcon = isPrivate ? 'lock-check' : 'calendar-check';
            icon.setAttribute('data-lucide', successIcon);
            if (window.lucide) window.lucide.createIcons({ root: btn });
        }
    } catch (e) {
        console.error('Plan failed:', e);
        btn.classList.remove('loading');
        btn.classList.add('error');
        if (icon && originalIcon) {
            icon.setAttribute('data-lucide', 'alert-circle');
            if (window.lucide) window.lucide.createIcons({ root: btn });
        }
        setTimeout(() => {
            btn.classList.remove('error');
            if (icon && originalIcon) {
                icon.setAttribute('data-lucide', originalIcon);
                if (window.lucide) window.lucide.createIcons({ root: btn });
            }
        }, 3000);
    }
};

window.toggleSection = function(btn) {
  const container = btn.closest('.expandable-section').querySelector('.expandable-grid');
  const isCollapsed = container.classList.toggle('is-collapsed');
  const isExpanded = !isCollapsed;
  btn.classList.toggle('is-expanded', isExpanded);
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
  
  Array.from(grid.children).forEach((child, idx) => {
    if (isCollapsed && idx >= itemsInTwoRows) child.style.display = 'none';
    else child.style.display = '';
  });
  if (expandBtn) expandBtn.classList.toggle('hidden', totalItems <= itemsInTwoRows);
};

window.toggleVAs = (btn) => {
    const card = btn.closest('.char-card');
    const expander = btn.closest('.va-expander');
    const grid = btn.closest('.expandable-grid');
    const list = btn.nextElementSibling;
    const isHidden = list.classList.toggle('hidden');
    if (card) card.classList.toggle('va-list-open', !isHidden);
    expander.classList.toggle('va-list-open', !isHidden);
    if (grid) {
        const anyOpen = grid.querySelectorAll('.va-list-open').length > 0;
        grid.classList.toggle('has-open-va', anyOpen);
    }
};

window.showConfirmDialog = (config) => {
    const { title, message, confirmText, onConfirm } = config;
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog glass">
            <div class="confirm-header"><i data-lucide="alert-triangle" class="danger-icon"></i><h3>${title}</h3></div>
            <div class="confirm-body"><p>${message}</p></div>
            <div class="confirm-footer">
                <button class="confirm-btn cancel-btn">Cancel</button>
                <button class="confirm-btn action-btn danger-confirm">${confirmText || 'Yes, Clear'}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
    const close = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('.cancel-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    overlay.querySelector('.action-btn').onclick = () => { onConfirm(); close(); };
    overlay.querySelector('.cancel-btn').focus();
};

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

window.openLightbox = (src) => {
    if (!src) return;
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${src}" class="lightbox-img">`;
    document.body.appendChild(overlay);
    
    const close = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.onclick = close;
    // Prevent image click from closing if we ever add zoom or other features (optional)
    // but for now, clicking anywhere on the overlay closes it.
};
