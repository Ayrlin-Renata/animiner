/**
 * js/ui/modal/index.js
 * Main entry point for the Details Modal UI.
 */

import { UI } from '../base.js';
import { state } from '../../state.js';
import { renderMediaContent, renderStaffContent } from './renderer.js';
import { markAsSeen } from './discovery.js';

export * from './logic.js';
export * from './renderer.js';
export * from './discovery.js';
export * from './interactions.js';
export * from './import.js';

export function openModal(item) {
  if (!UI.modalContent) return;
  
  markAsSeen(item);

  let content = '';
  if (state.searchMode === 'MEDIA') {
    content = renderMediaContent(item);
  } else {
    content = renderStaffContent(item);
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
