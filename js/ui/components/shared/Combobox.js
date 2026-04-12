/**
 * js/ui/combobox.js
 * Custom Combobox / Autocomplete UI component.
 */

import { state } from '../../../state.js';

export function createCombobox(options, placeholder, field) {
    const container = document.createElement('div');
    container.className = 'combobox-container';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'combobox-input val-input';
    input.placeholder = placeholder;
    if (field.seenKey) input.dataset.seenKey = field.seenKey;

    const results = document.createElement('div');
    results.className = 'combobox-results glass-dark';
    
    const updateResults = (filterText = '') => {
        let currentOptions;
        if (field.seenKey === '__REFERENCES__') {
            const aliases = Array.from(document.querySelectorAll('.group-label-input'))
                .map(el => el.value.trim())
                .filter(v => v);
            currentOptions = [...new Set(aliases)];
        } else {
            currentOptions = field.seenKey ? (state.seenValues[field.seenKey] || []) : options;
        }
        
        const filtered = currentOptions.filter(o => o.toLowerCase().includes(filterText.toLowerCase()));
        
        results.innerHTML = filtered.map(o => `<div class="combobox-item">${o}</div>`).join('');
        
        if (filtered.length > 0) {
            results.classList.add('show');
        } else {
            results.classList.remove('show');
        }

        results.querySelectorAll('.combobox-item').forEach(item => {
            item.onclick = (e) => {
                input.value = e.target.textContent;
                results.classList.remove('show');
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };
        });
    };

    input.oninput = (e) => updateResults(e.target.value);
    input.onfocus = () => updateResults(input.value);
    
    input.onblur = () => {
        setTimeout(() => {
            results.classList.remove('show');
        }, 200);
    };

    container.appendChild(input);
    container.appendChild(results);
    return container;
}
