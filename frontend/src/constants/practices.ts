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

export const PRACTICE_TO_DEPARTMENT_ID: Record<string, number> = {
  'CCA-FS': 1,
  'Cloud & Infrastructure': 2,
  'Data & AI': 3,
  'DCX-DE': 4,
  'DCX-FS': 5,
  'Digital Engineering': 6,
  'Enterprise Architecture': 7,
  'Insights & Data': 8,
  'SAP': 9,
};

export const DEPARTMENT_ID_TO_PRACTICE: Record<number, string> = Object.fromEntries(
  Object.entries(PRACTICE_TO_DEPARTMENT_ID).map(([practice, id]) => [Number(id), practice])
);
