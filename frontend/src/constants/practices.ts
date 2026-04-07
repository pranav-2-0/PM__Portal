/**
 * Master list of Capgemini practices used across the application.
 *
 * This is the single source of truth for practice names.
 * Add or remove entries here when the org structure changes.
 * Names must exactly match what appears in the GAD / Bench report files.
 */
export const PRACTICES: string[] = [
  'CCA-FS',
  'Cloud & Infrastructure',
  'Data & AI',
  'DCX-DE',
  'DCX-FS',
  'Digital Engineering',
  'Enterprise Architecture',
  'Insights & Data',
  'SAP',
];

/** Sorted display copy (used in dropdowns). */
export const SORTED_PRACTICES = [...PRACTICES].sort();
