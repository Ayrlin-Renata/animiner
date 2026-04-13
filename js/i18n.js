/**
 * js/i18n.js
 * Lightweight i18n utility for AniMiner.
 */

let currentLocale = 'en';
let translations = {};

/**
 * Initializes the i18n system by loading the locale file.
 * @param {string} locale - The locale code to load (default: 'en').
 */
export async function init(locale = 'en') {
    currentLocale = locale;
    try {
        const response = await fetch(`./locale/${locale}.json`);
        if (!response.ok) throw new Error(`Could not load locale: ${locale}`);
        translations = await response.json();
        console.log(`[i18n] Loaded locale: ${locale}`);
    } catch (e) {
        console.error('[i18n] Initialization failed:', e);
        // Fallback or empty translations so t() doesnt crash
        translations = {};
    }
}

/**
 * Translates a key with optional variable interpolation.
 * @param {string} key - Dot-notated key (e.g. 'ui.buttons.search').
 * @param {Object} vars - Key-value pairs for interpolation (e.g. { page: 5 }).
 * @returns {string} The translated string or the key if not found.
 */
export function t(key, vars = {}) {
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
        if (result && result[k] !== undefined) {
            result = result[k];
        } else {
            console.warn(`[i18n] Missing key: ${key}`);
            return key;
        }
    }

    if (typeof result !== 'string') {
        console.warn(`[i18n] Key is not a string: ${key}`);
        return key;
    }

    // Interpolation: replace {{var}} with values
    return result.replace(/{{(\w+)}}/g, (match, p1) => {
        return vars[p1] !== undefined ? vars[p1] : match;
    });
}

/**
 * Returns the current active locale.
 */
export function getLocale() {
    return currentLocale;
}

/**
 * Scans the DOM for elements with data-i18n attributes and updates their content.
 * Also handles title attributes if data-i18n-title is present.
 */
export function localizeDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

// Global exposure for legacy scripts if needed (though module import is preferred)
window.i18n = { t, init, getLocale, localizeDOM };
