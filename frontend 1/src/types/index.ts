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
  is_active?: boolean;
}

export interface PMMatch {
  pm: PeopleManager;
  score: number;
  reasons: string[];
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
