/**
 * validation.js
 * Logic for detecting conflicting or impossible filter combinations.
 */

import { state } from './state.js';
import { FIELD_TYPES, OPERATORS, getValueByPath } from './filter.js';
import * as i18n from './i18n.js';

/**
 * Validates current ruleset for logical contradictions.
 * @param {Array} rules - The rules to validate.
 * @returns {Array} List of warning objects { type, message, severity }.
 */
export function validateFilters(rules) {
    const warnings = [];
    const callStack = new Set();
    
    // We start from a root "ALL" scope.
    const rootScope = {
        name: i18n.t('validation.breadcrumbs.global'),
        path: [i18n.t('validation.breadcrumbs.global')],
        constraints: {}, // path -> Array of rules
        isMandatory: true
    };

    analyzeRecursive(rules, rootScope, warnings, callStack);
    
    return warnings;
}

/**
 * Recursively analyzes rules and populates warnings.
 */
function analyzeRecursive(rules, currentScope, warnings, callStack) {
    if (!rules || rules.length === 0) return;

    // Group rules by path within this scope to check for overlaps
    const pathGroups = {};

    rules.forEach(rule => {
        const typeMatch = rule.type?.toUpperCase();
        if (typeMatch === 'REFERENCE') {
            const refLabel = rule.value;
            if (callStack.has(refLabel)) return; // Prevent infinite loop

            const targetGroup = state.groupRefs?.[refLabel];
            if (targetGroup) {
                callStack.add(refLabel);
                // References are essentially merged into the current scope if they are part of an ALL branch
                analyzeRecursive([targetGroup], currentScope, warnings, callStack);
                callStack.delete(refLabel);
            }
            return;
        }

        if (rule.type === 'GROUP' || rule.type === 'RELATION') {
            const isAll = rule.quantifier === 'ALL' || rule.quantifier === 'EVERY';
            const subRules = rule.rules || [];
            const typeLabel = rule.type === 'RELATION' ? i18n.t('validation.breadcrumbs.relation') : i18n.t('validation.breadcrumbs.group');
            const quantifierLabel = `[${rule.quantifier}]`;
            const nameLabel = rule.alias || rule.label ? ` "${rule.alias || rule.label}"` : '';
            const fullLabel = `${typeLabel}${quantifierLabel}${nameLabel}`;

            // Groups with alternative quantifiers (OR logic) don't share constraints between rules
            const isAlternative = (rule.quantifier === 'SOME_ANY' || rule.quantifier === 'NONE_ANY') || 
                                 ((rule.path === 'ROOT' || rule.path === 'LOGIC' || !rule.path) && 
                                  (rule.quantifier === 'ANY' || rule.quantifier === 'SOME'));

            if (isAll && currentScope.isMandatory) {
                // Nested ALL groups in a mandatory scope share the same constraints
                analyzeRecursive(subRules, currentScope, warnings, callStack);
            } else if (isAlternative) {
                // Each branch in an alternative group is its own independent world
                subRules.forEach((sr, idx) => {
                    const branchLabel = `${i18n.t('validation.breadcrumbs.branch')} ${idx + 1}`;
                    const altTag = `${i18n.t('validation.breadcrumbs.alt')} ${idx + 1}`;
                    const branchScope = {
                        name: `${fullLabel} ${branchLabel}`,
                        path: [...currentScope.path, `${fullLabel} (${altTag})`],
                        constraints: {},
                        isMandatory: false
                    };
                    analyzeRecursive([sr], branchScope, warnings, callStack);
                });
            } else {
                // Standard Collection Groups or non-alternative groups
                const newScope = {
                    name: fullLabel,
                    path: [...currentScope.path, fullLabel],
                    constraints: {},
                    isMandatory: false
                };
                analyzeRecursive(subRules, newScope, warnings, callStack);
            }
            return;
        }

        // Leaf Rule
        const path = rule.path;
        if (!pathGroups[path]) pathGroups[path] = [];
        pathGroups[path].push(rule);
    });

    // Merge these leaf rules into the scope's constraints and check for immediate conflicts
    Object.entries(pathGroups).forEach(([path, rulesInPath]) => {
        if (!currentScope.constraints[path]) currentScope.constraints[path] = [];
        
        rulesInPath.forEach(rule => {
            // 1. Check for "Empty Core Filter"
            if (path && (path === 'id' || path === 'idMal' || path.startsWith('title.')) && 
                (rule.operator === OPERATORS.EQUALS || rule.operator === OPERATORS.IS) && 
                (!rule.value || rule.value.trim() === '')) {
                warnings.push({
                    type: 'EMPTY_FIELD',
                    message: i18n.t('validation.messages.empty_field', { field: rule.label || path }),
                    rule
                });
            }

            // 2. Check for conflicts against existing constraints in this scope
            const existing = currentScope.constraints[path];
            existing.forEach(other => {
                const conflict = detectContradiction(rule, other);
                if (conflict) {
                    const location = currentScope.path.join(' > ');
                    warnings.push({
                        type: 'CONTRADICTION',
                        message: i18n.t('validation.messages.contradiction', { 
                            field: rule.label || path, 
                            location: location,
                            rule1: formatRule(rule),
                            rule2: formatRule(other)
                        }),
                        rules: [rule, other]
                    });
                }
            });

            existing.push(rule);
        });
    });
}

function formatRule(rule) {
    const opName = i18n.t(`filter.operators.${rule.operator}`) || rule.operator.replace(/_/g, ' ');
    return `${opName} '${rule.value}'`;
}

/**
 * Detects if two rules on the same path are mutually exclusive.
 */
function detectContradiction(r1, r2) {
    const op1 = r1.operator;
    const op2 = r2.operator;
    const v1 = r1.value;
    const v2 = r2.value;

    // Special Case: Labeled Group References are additive, not mutually exclusive
    if (r1.path === '__REFERENCE__' || r2.path === '__REFERENCE__') return false;

    // Direct Equality Conflict
    if ((op1 === OPERATORS.EQUALS || op1 === OPERATORS.IS) && 
        (op2 === OPERATORS.EQUALS || op2 === OPERATORS.IS)) {
        if (v1 !== v2) return true;
    }

    // Equality vs Inequality Conflict
    if (((op1 === OPERATORS.EQUALS || op1 === OPERATORS.IS) && op2 === OPERATORS.NOT_EQUALS) ||
        ((op2 === OPERATORS.EQUALS || op2 === OPERATORS.IS) && op1 === OPERATORS.NOT_EQUALS)) {
        const eqVal = (op1 === OPERATORS.EQUALS || op1 === OPERATORS.IS) ? v1 : v2;
        const neqVal = (op1 === OPERATORS.NOT_EQUALS) ? v1 : v2;
        if (eqVal === neqVal) return true;
    }

    // Numeric Range Conflict
    const num1 = parseFloat(v1);
    const num2 = parseFloat(v2);
    if (!isNaN(num1) && !isNaN(num2)) {
        // x > A and x < B where A >= B
        if (op1 === OPERATORS.GREATER && op2 === OPERATORS.LESSER && num1 >= num2) return true;
        if (op2 === OPERATORS.GREATER && op1 === OPERATORS.LESSER && num2 >= num1) return true;

        // x = A and x > B where A <= B
        if ((op1 === OPERATORS.EQUALS || op1 === OPERATORS.IS) && op2 === OPERATORS.GREATER && num1 <= num2) return true;
        if ((op2 === OPERATORS.EQUALS || op2 === OPERATORS.IS) && op1 === OPERATORS.GREATER && num2 <= num1) return true;

        // x = A and x < B where A >= B
        if ((op1 === OPERATORS.EQUALS || op1 === OPERATORS.IS) && op2 === OPERATORS.LESSER && num1 >= num2) return true;
        if ((op2 === OPERATORS.EQUALS || op2 === OPERATORS.IS) && op1 === OPERATORS.LESSER && num2 >= num1) return true;
    }

    // Boolean Conflict
    if (r1.type === FIELD_TYPES.BOOLEAN && r2.type === FIELD_TYPES.BOOLEAN) {
        if (v1 !== v2) return true;
    }

    return false;
}
