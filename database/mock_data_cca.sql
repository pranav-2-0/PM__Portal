-- Updated Mock Data with correct departments

-- Insert mock skills for CCA-FS
INSERT INTO skill_repository (practice, skill_name, skill_cluster) VALUES
('CCA-FS', 'Java', 'Backend'),
('CCA-FS', 'JavaScript', 'Frontend'),
('CCA-FS', 'Python', 'Backend'),
('CCA-FS', 'SQL', 'Database'),
('CCA-FS', 'AWS', 'Cloud');

-- Insert mock People Managers for CCA-FS
INSERT INTO people_managers (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity, is_active) VALUES
('PM001', 'John Manager', 'john.m@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'Java', 'C2', 5, 10, true),
('PM002', 'Sarah Lead', 'sarah.l@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'D1', 3, 10, true),
('PM003', 'Mike Senior', 'mike.s@example.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-B', 'AWS', 'C1', 7, 10, true),
('PM004', 'Lisa Director', 'lisa.d@example.com', 'CCA-FS', 'CU-Tech', 'USA', 'Client-C', 'Python', 'D2', 2, 15, true);

-- Insert mock New Joiners (employees without PM assignment)
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, joining_date, is_new_joiner, status) VALUES
('EMP001', 'Alice Developer', 'alice.d@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'Java', 'B2', CURRENT_DATE - INTERVAL '5 days', true, 'active'),
('EMP002', 'Bob Engineer', 'bob.e@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'B1', CURRENT_DATE - INTERVAL '3 days', true, 'active'),
('EMP003', 'Charlie Analyst', 'charlie.a@example.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-B', 'AWS', 'A2', CURRENT_DATE - INTERVAL '2 days', true, 'active');

-- Insert existing employees with PM assignments
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, is_new_joiner, status) VALUES
('EMP101', 'David Senior', 'david.s@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'Java', 'B2', 'PM001', false, 'active'),
('EMP102', 'Emma Tech', 'emma.t@example.com', 'CCA-FS', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'B1', 'PM002', false, 'active'),
('EMP103', 'Frank Cloud', 'frank.c@example.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-B', 'AWS', 'C1', 'PM003', false, 'active');

-- Insert assignment history for PM matching
INSERT INTO pm_assignments (employee_id, old_pm_id, new_pm_id, match_score, assignment_type, status) VALUES
('EMP101', NULL, 'PM001', 92.5, 'new_joiner', 'completed'),
('EMP102', NULL, 'PM002', 88.0, 'new_joiner', 'completed'),
('EMP103', NULL, 'PM003', 95.0, 'new_joiner', 'completed');
