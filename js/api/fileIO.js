/**
 * js/api/fileIO.js
 * Logic for exporting and importing lists from custom JSON files.
 */

import { state, saveSettings } from '../state.js';
import { importer } from './import.js';

/**
 * Exports selected lists to a JSON file.
 * @param {string[]} selectedLists - ['seen', 'watched', 'blacklist']
 */
export async function exportLists(selectedLists) {
    if (!selectedLists || selectedLists.length === 0) {
        throw new Error("No lists selected for export.");
    }

    const data = {
        format: "AniMiner-Lists-v1",
        timestamp: Date.now(),
        payload: {}
    };

    selectedLists.forEach(name => {
        const key = name.toLowerCase();
        if (state[key]) {
            data.payload[key] = state[key];
        }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `animiner-lists-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Imports selected lists from a JSON file.
 * @param {File} file - The file bubble from input.
 * @param {string[]} selectedLists - ['seen', 'watched', 'blacklist']
 */
export async function importLists(file, selectedLists) {
    if (!selectedLists || selectedLists.length === 0) {
        throw new Error("No lists selected for import.");
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.format !== "AniMiner-Lists-v1") {
                    throw new Error("Invalid file format. Please use a file exported from AniMiner.");
                }

                const payload = data.payload || {};
                let totalAdded = 0;

                selectedLists.forEach(name => {
                    const key = name.toLowerCase();
                    const listData = payload[key]; // This is an object with modes like { MEDIA: [] }
                    
                    if (listData) {
                        Object.keys(listData).forEach(mode => {
                            const items = listData[mode] || [];
                            items.forEach(item => {
                                // Ensure we have the right structure
                                if (typeof item === 'object' && item.id) {
                                    if (importer.addToStateList(key, mode, item)) {
                                        totalAdded++;
                                    }
                                }
                            });
                        });
                    }
                });

                if (totalAdded > 0) saveSettings();
                resolve({ added: totalAdded });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsText(file);
    });
}
