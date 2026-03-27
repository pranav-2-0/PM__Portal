-- Mock Data for Testing Phase 1

-- Insert mock skills
INSERT INTO skill_repository (practice, skill_name, skill_cluster) VALUES
('Digital Engineering', 'Java', 'Backend'),
('Digital Engineering', 'JavaScript', 'Frontend'),
('Digital Engineering', 'Python', 'Backend'),
('Cloud & Infrastructure', 'AWS', 'Cloud'),
('Cloud & Infrastructure', 'Azure', 'Cloud');

-- Insert mock People Managers
INSERT INTO people_managers (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity) VALUES
('PM001', 'John Manager', 'john.m@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'Java', 'C2', 5, 10),
('PM002', 'Sarah Lead', 'sarah.l@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'D1', 3, 10),
('PM003', 'Mike Senior', 'mike.s@example.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-B', 'AWS', 'C1', 7, 10),
('PM004', 'Lisa Director', 'lisa.d@example.com', 'Digital Engineering', 'CU-Tech', 'USA', 'Client-C', 'Python', 'D2', 2, 15);

-- Insert mock Employees (New Joiners)
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, joining_date, is_new_joiner) VALUES
('EMP001', 'Alice Developer', 'alice.d@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'Java', 'B2', CURRENT_DATE - INTERVAL '5 days', true),
('EMP002', 'Bob Engineer', 'bob.e@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'B1', CURRENT_DATE - INTERVAL '3 days', true),
('EMP003', 'Charlie Analyst', 'charlie.a@example.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-B', 'AWS', 'A2', CURRENT_DATE - INTERVAL '2 days', true);

-- Insert existing employees with PMs
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, is_new_joiner) VALUES
('EMP101', 'David Senior', 'david.s@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'Java', 'B2', 'PM001', false),
('EMP102', 'Emma Tech', 'emma.t@example.com', 'Digital Engineering', 'CU-Tech', 'India', 'Client-A', 'JavaScript', 'B1', 'PM002', false);

-- Insert separation report (PM resigning)
INSERT INTO separation_reports (employee_id, lwd, reason) VALUES
('PM001', CURRENT_DATE + INTERVAL '45 days', 'Resignation');
