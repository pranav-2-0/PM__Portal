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
  joining_date?: string;
  is_new_joiner?: boolean;
  status?: string;
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
  /** Spec-enforced hard cap of 10 — returned by API in capacity queries */
  spec_capacity_cap?: number;
  is_active?: boolean;
}

/** Severity levels for rule-flow flags */
export type FlagSeverity = 'Critical' | 'Major' | 'Minor';

export interface MatchFlag {
  severity: FlagSeverity;
  code: string;
  message: string;
}

/** Confidence tier produced by the matching engine */
export type MatchConfidence = 'High' | 'Medium' | 'Low' | 'Unmappable';

/** Spec path labels (Steps A→E decision tree) */
export type MatchPath =
  | 'Path1_Perfect'
  | 'Path2_SkillFallback'
  | 'Path3_DiffAccount'
  | 'Path4_RegionFallback'
  | 'Path5_RegionAccount'
  | 'Path6_CrossBU'
  | 'Path7_CrossBUExactSkill'
  | 'Path8_PracticeFailure'
  | 'Path9_NoMatch'
  | 'Path10_SkillFailure';

export interface PMMatch {
  pm: PeopleManager;
  score: number;
  reasons: string[];
  skillScore?: number;
  warnings?: string[];
  flags?: MatchFlag[];
  confidence?: MatchConfidence;
  matchTier?: string;
  path?: MatchPath;
  /** Tie-breaker that resolved this match (only present when a tie occurred) */
  tiebreakerApplied?: string | null;
}

/**
 * Structured output per spec "Expected Output Format".
 * Returned as `result` in the /employees/:id/find-pm response.
 */
export interface MatchOutput {
  employee_id:        string;
  assigned_pm_id:     string | null;
  decision_path:      string;
  match_type:          'Ideal' | 'Acceptable' | 'Low Confidence' | 'Failed' | 'Forced';
  forced_assignment?:  boolean;
  override_reason?:    string | null;
  deviation_flags:    string[];
  tiebreaker_applied: string | null;
  score:              number;
  confidence:         MatchConfidence;
}

export interface PMAssignment {
  id?: number;
  employee_id: string;
  old_pm_id?: string;
  new_pm_id: string;
  match_score?: number;
  assignment_type: 'new_joiner' | 'reassignment';
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  effective_date?: string;
  employee_name?: string;
  pm_name?: string;
}

export interface UploadResponse {
  message: string;
  success: boolean;
  count: number;
}
