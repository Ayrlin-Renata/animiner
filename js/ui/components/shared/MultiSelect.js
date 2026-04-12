/**
 * js/ui/multiselect.js
 * Multi-select dropdown component.
 */

export function createMultiSelect(options, currentSelections = [], onChange = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'multi-select-wrapper';
    wrapper.tabIndex = 0;

    wrapper.innerHTML = `
        <div class="multi-select-display">Select Types... <i data-lucide="chevron-down"></i></div>
        <div class="multi-select-dropdown">
            ${options.map(opt => `
                <label class="multi-select-option">
                    <input type="checkbox" value="${opt.value}" ${currentSelections.includes(opt.value) ? 'checked' : ''}>
                    ${opt.label}
                </label>
            `).join('')}
        </div>
    `;

    const display = wrapper.querySelector('.multi-select-display');
    const checkboxes = Array.from(wrapper.querySelectorAll('input[type="checkbox"]'));

    const updateDisplay = () => {
        const checked = checkboxes.filter(cb => cb.checked).map(cb => {
            const opt = options.find(o => o.value === cb.value);
            return opt ? opt.label : cb.value;
        });

        if (checked.length === 0) {
            display.innerHTML = `Any Relation <i data-lucide="chevron-down"></i>`;
        } else if (checked.length === 1) {
            display.innerHTML = `${checked[0]} <i data-lucide="chevron-down"></i>`;
        } else {
            display.innerHTML = `${checked.length} Types <i data-lucide="chevron-down"></i>`;
        }
        
        if (window.lucide) window.lucide.createIcons({ root: display });
    };

    wrapper.onclick = (e) => {
        if (!e.target.closest('.multi-select-dropdown')) {
            wrapper.classList.toggle('open');
        }
    };

    wrapper.onblur = (e) => {
        if (!wrapper.contains(e.relatedTarget)) {
            wrapper.classList.remove('open');
        }
    };

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            // Special handling for 'ANY' if it exists
            if (cb.value === 'ANY' && cb.checked) {
                checkboxes.filter(c => c.value !== 'ANY').forEach(c => c.checked = false);
            } else if (cb.checked) {
                const anyCb = checkboxes.find(c => c.value === 'ANY');
                if (anyCb) anyCb.checked = false;
            }

            updateDisplay();
            if (onChange) onChange(checkboxes.filter(c => c.checked).map(c => c.value));
            
            // Trigger a change event on the wrapper for auto-save
            wrapper.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    updateDisplay();
    return wrapper;
}
