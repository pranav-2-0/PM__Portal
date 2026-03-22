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
  /** Transient: PM email address captured from bench files for cross-file PM resolution.
   *  NOT stored directly in DB — resolved to current_pm_id via people_managers.email lookup. */
  _pm_email?: string;
  joining_date?: Date;
  is_new_joiner?: boolean;
  is_frozen?: boolean;
  status?: string;
  // New Phase-2 fields
  sub_practice?: string;
  location?: string;
  hire_reason?: string;
  bench_status?: string;
  upload_source?: string;   // 'gad' | 'bench'
  leave_type?: string;
  leave_start_date?: Date;
  leave_end_date?: Date;
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
  // New Phase-2 fields
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
  assignment_type: 'new_joiner' | 'reassignment';
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
  // Legacy (kept for backward compat)
  cu?: number;
}

export interface PMMatch {
  pm: PeopleManager;
  score: number;
  reasons: string[];
  skillScore?: number;
  warnings?: string[];
}

export interface SeparationReport {
  id?: number;
  employee_id: string;
  lwd: Date;
  reason?: string;
  status?: string;
  separation_type?: string; // 'Resignation' | 'Retirement' — only these trigger reassignment
  person_name?: string;     // extracted from file — shown on page even if not a PM
  grade?: string;           // extracted from file
  designation?: string;     // extracted from file
  person_type?: string;     // 'pm' | 'employee' | 'unknown' — set during insert
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
