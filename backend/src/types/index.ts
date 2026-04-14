export interface Employee {
  id?: number;
  employee_id: string;
  name: string;
  email: string;
  practice: string;
  cu: string;
  region: string;
  account?: string;
  skill?: string;
  grade: string;
  current_pm_id?: string;
  /** Transient: PM email captured from bench files for cross-file PM resolution.
   *  NOT stored in DB — resolved to current_pm_id via people_managers.email lookup. */
  _pm_email?: string;
  joining_date?: Date;
  is_new_joiner?: boolean;
  is_frozen?: boolean;
  status?: string;
  // Phase-2 fields
  sub_practice?: string;
  location?: string;
  hire_reason?: string;
  bench_status?: string;
  upload_source?: string;   // 'gad' | 'bench'
  leave_type?: string;
  leave_status?: string;
  leave_start_date?: Date;
  leave_end_date?: Date;
  _leave_comments?: string;  // Transient field from Leave Report, not stored in DB
}

export interface PeopleManager {
  id?: number;
  employee_id: string;
  name: string;
  email: string;
  practice: string;
  cu: string;
  region: string;
  account?: string;
  skill?: string;
  grade: string;
  reportee_count?: number;
  max_capacity?: number;
  is_active?: boolean;
  // Phase-2 fields
  sub_practice?: string;
  location?: string;
  upload_source?: string;   // 'gad' | 'bench'
  leave_type?: string;
  leave_start_date?: Date;
  leave_end_date?: Date;
}

export interface PMAssignment {
  id?: number;
  employee_id: string;
  old_pm_id?: string;
  new_pm_id: string;
  match_score?: number;
  assignment_type: 'new_joiner' | 'reassignment' | 'FORCED_ASSIGNMENT';
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  effective_date?: Date;
}

export interface MatchingWeights {
  practice: number;
  sub_practice: number;
  region: number;
  grade: number;
  location: number;
  skill: number;
  account: number;
  capacity: number;
  // Legacy alias kept for backward compat
  cu?: number;
}

/** Severity levels for rule-flow flags */
export type FlagSeverity = 'Critical' | 'Major' | 'Minor';

export interface MatchFlag {
  severity: FlagSeverity;
  code: string;
  message: string;
}

/** Confidence tier produced by the cascading rule flow */
export type MatchConfidence = 'High' | 'Medium' | 'Low' | 'Unmappable';

/** Spec path label attached to each match result */
export type MatchPath =
  | 'Path1_Perfect'             // A1→B1→C1→D1→E1   High confidence, ideal match
  | 'Path2_SkillFallback'       // A1→B1→C1→D1→E2   High confidence, skill fallback
  | 'Path3_DiffAccount'         // A1→B1→C1→D2→E1/E2  Minor deviation
  | 'Path4_RegionFallback'      // A1→B2→C1→D1→E1/E2  Region fallback
  | 'Path5_RegionAccount'       // A1→B2→C1→D2→E1/E2  Region + account fallback
  | 'Path6_CrossBU'             // A1→B1/B2→C2→D3→E2  Low confidence
  | 'Path7_CrossBUExactSkill'   // A1→B1/B2→C2→D3→E1  Low confidence
  | 'Path8_PracticeFailure'     // A2→STOP
  | 'Path9_NoMatch'             // A1→B2→C2→D3→E4     Unmappable
  | 'Path10_SkillFailure'       // A1→*→E4             Unmappable
  | 'PathF_ForcedAssignment';   // isPMResigned override — guaranteed assignment after relaxation

export interface PMMatch {
  pm: PeopleManager;
  score: number;
  reasons: string[];
  skillScore?: number;
  warnings?: string[];
  /** Rule-flow structured flags (Steps A-E) */
  flags?: MatchFlag[];
  /** Overall confidence produced by the cascading rule evaluation */
  confidence?: MatchConfidence;
  /** Fallback tier: 'exact' | 'same_bu_diff_account' | 'cross_bu' */
  matchTier?: string;
  /** Spec path label for this match */
  path?: MatchPath;
  /**
   * Which tie-breaker resolved this match (only set on the top result when a tie occurred):
   * 'F1: Lowest available capacity' | 'F2: Highest tenure' |
   * 'F3: Historical alignment (past account match)' | 'F4: Deterministic PM ID sort'
   */
  tiebreakerApplied?: string | null;
  /**
   * Set to 'FORCED_ASSIGNMENT' when isPMResigned = true and a normal match path
   * failed — the system relaxed all constraints to guarantee a PM is returned.
   * confidenceLevel will be 'Low' and reason will be 'PM_RESIGNATION_OVERRIDE'.
   */
  forcedAssignment?: boolean;
  /** Human-readable reason when override is active (PM_RESIGNATION_OVERRIDE) */
  overrideReason?: string;
}

/**
 * Structured output per the spec's "Expected Output Format".
 * Produced from the top PMMatch and returned in the API response alongside matches[].
 *
 *   Employee ID:          <string>
 *   Assigned PM ID:       <string | null>
 *   Decision Path:        <MatchPath label>
 *   Match Type:           Ideal | Acceptable | Low Confidence | Failed
 *   Deviation Flags:      <string[]>
 *   Tie-breaker Applied:  <string | null>
 */
export interface MatchOutput {
  employeeId:        string;
  assignedPmId:      string | null;
  decisionPath:      string;
  matchType:         'Ideal' | 'Acceptable' | 'Low Confidence' | 'Failed' | 'Forced';
  deviationFlags:    string[];
  tiebreakerApplied: string | null;
  score:             number;
  confidence:        MatchConfidence;
  /** true when isPMResigned override guaranteed a PM despite normal path failures */
  forcedAssignment?: boolean;
  /** 'PM_RESIGNATION_OVERRIDE' when override was activated */
  overrideReason?:   string;
}

export interface SeparationReport {
  id?: number;
  employee_id: string;
  lwd: Date;
  reason?: string;
  status?: string;
  separation_type?: string; // 'Resignation' | 'Retirement' — only these trigger reassignment
  person_name?: string;
  grade?: string;
  designation?: string;
  person_type?: string;     // 'pm' | 'employee' | 'unknown'
}

export interface SkillRepositoryEntry {
  id?: number;
  practice: string;
  skill_name: string;
  skill_cluster?: string;
}

export interface Exception {
  id?: number;
  employee_id: string;
  exception_type: string;
  description: string;
  status?: 'open' | 'resolved' | 'escalated';
  assigned_to?: string;
}

export interface AuditLog {
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by?: string;
  old_value?: any;
  new_value?: any;
  justification?: string;
}
