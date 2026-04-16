/**
 * Matching and Filtering Constants
 * Shared color schemes and labels for PM matching, flags, and filters
 */

// ─── Flag Severity Colors ────────────────────────────────────────────────
export const FLAG_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800 border-red-200',
  Major: 'bg-orange-100 text-orange-800 border-orange-200',
  Minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
} as const;

// ─── Confidence Level Colors ─────────────────────────────────────────────
export const CONFIDENCE_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-red-100 text-red-800',
  Unmappable: 'bg-gray-200 text-gray-700',
  Forced: 'bg-purple-100 text-purple-800',
} as const;

// ─── Matching Tier Labels ────────────────────────────────────────────────
export const TIER_LABELS: Record<string, string> = {
  exact: 'Exact match',
  same_bu_diff_account: 'Same BU, diff account',
  cross_bu: 'Cross-BU fallback',
  forced_assignment: 'Forced (Resignation Override)',
} as const;

// ─── Matching Path Labels ────────────────────────────────────────────────
export const PATH_LABELS: Record<string, { label: string; color: string }> = {
  Path1_Perfect: {
    label: 'Path 1 — Perfect match',
    color: 'bg-green-100 text-green-800',
  },
  Path2_SkillFallback: {
    label: 'Path 2 — Skill fallback',
    color: 'bg-green-100 text-green-700',
  },
  Path3_DiffAccount: {
    label: 'Path 3 — Diff account',
    color: 'bg-yellow-100 text-yellow-800',
  },
  Path4_RegionFallback: {
    label: 'Path 4 — Region fallback',
    color: 'bg-yellow-100 text-yellow-800',
  },
  Path5_RegionAccount: {
    label: 'Path 5 — Region + account diff',
    color: 'bg-orange-100 text-orange-800',
  },
  Path6_CrossBU: {
    label: 'Path 6 — Cross-BU fallback',
    color: 'bg-red-100 text-red-700',
  },
  Path7_CrossBUExactSkill: {
    label: 'Path 7 — Cross-BU, exact skill',
    color: 'bg-red-100 text-red-700',
  },
  PathF_ForcedAssignment: {
    label: '⚠ Forced — Resignation Override',
    color: 'bg-purple-100 text-purple-800',
  },
} as const;

// ─── Separation Type Badges ──────────────────────────────────────────────
export const SEPARATION_TYPE_BADGES: Record<string, string> = {
  Resignation: 'bg-red-100 text-red-800',
  Retirement: 'bg-purple-100 text-purple-800',
  Termination: 'bg-orange-100 text-orange-800',
  'Contract End': 'bg-yellow-100 text-yellow-800',
} as const;

// ─── Person Type Badges ──────────────────────────────────────────────────
export const PERSON_TYPE_BADGES: Record<string, string> = {
  pm: 'bg-purple-100 text-purple-800',
  employee: 'bg-blue-100 text-blue-800',
  unknown: 'bg-gray-100 text-gray-600',
} as const;

// ─── Grade Options ──────────────────────────────────────────────────────
export const GRADE_OPTIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'] as const;

// ─── Tab Configurations ─────────────────────────────────────────────────
export const PEOPLE_TABS = [
  { id: 'employees', label: 'All Employees' },
  { id: 'bench', label: 'Bench Resources' },
  { id: 'new-joiners', label: 'New Joiners' },
  { id: 'separations', label: 'Separations' },
] as const;

export const TAB_TITLES: Record<string, { title: string; sub: string }> = {
  employees: { title: 'All Employees', sub: 'Browse and filter all employee records' },
  bench: { title: 'Bench Resources', sub: 'Employees without a People Manager assigned' },
  'new-joiners': { title: 'New Joiners', sub: 'Assign People Managers to new employees' },
  separations: { title: 'Separations', sub: 'Track employee separations and LWD timelines' },
} as const;

// ─── Report Tab Configurations ──────────────────────────────────────────
export const REPORT_TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'practice-reports', label: 'Practice Reports' },
] as const;

export const REPORT_TITLES: Record<string, { title: string; sub: string }> = {
  analytics: { title: 'Analytics', sub: 'Comprehensive insights, trends, and distributions' },
  'practice-reports': {
    title: 'Practice Reports',
    sub: 'Generate practice-wise reports with business rules applied',
  },
} as const;

// ─── View Mode Options ──────────────────────────────────────────────────
export const VIEW_MODES = {
  LIST: 'list',
  SKILL: 'skill',
} as const;

// ─── Default Filter Values ──────────────────────────────────────────────
export const DEFAULT_FILTERS = {
  status: 'active',
  practice: '',
  cu: '',
  region: '',
  grade: '',
  skill: '',
} as const;

export const DEFAULT_SKILL_UPDATE_FILTERS = {
  practice: '',
  cu: '',
  region: '',
  grade: '',
} as const;

export const DEFAULT_SKILL_REMOVE_FILTERS = {
  skill: '',
  practice: '',
  cu: '',
  region: '',
  grade: '',
} as const;
