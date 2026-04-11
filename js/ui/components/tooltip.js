/**
 * js/ui/components/tooltip.js
 * Lightweight singleton for showing premium tooltips.
 */

let tooltipEl = null;

export function initTooltip() {
    if (tooltipEl) return;
    
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'app-tooltip hidden';
    document.body.appendChild(tooltipEl);
    
    // Global mousemove to track tooltip position if needed, 
    // but pinning to element is usually better for accessibility.
}

export function showTooltip(target, message) {
    if (!tooltipEl) initTooltip();
    if (!message) return;

    tooltipEl.textContent = message;
    tooltipEl.classList.remove('hidden');

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    // Position above the element by default
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // Collision detection (top)
    if (top < 10) {
        top = rect.bottom + 10;
    }

    // Collision detection (left/right)
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    tooltipEl.style.top = `${top + window.scrollY}px`;
    tooltipEl.style.left = `${left + window.scrollX}px`;
    
    tooltipEl.classList.add('visible');
}

export function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove('visible');
    // Use a delay for the hidden class to allow transitions
    setTimeout(() => {
        if (!tooltipEl.classList.contains('visible')) {
            tooltipEl.classList.add('hidden');
        }
    }, 200);
}

/**
 * Attaches tooltip listeners to an element.
 */
export function attachTooltip(el, message) {
    if (!el || !message) return;
    
    const display = (e) => showTooltip(el, message);
    const remove = () => hideTooltip();

    el.addEventListener('mouseenter', display);
    el.addEventListener('mouseleave', remove);
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        display(e);
    });
    
    // Clean up if the element is removed? 
    // Usually not needed for simple apps unless we have huge leaks.
}
