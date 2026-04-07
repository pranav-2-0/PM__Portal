-- Comprehensive sample data for PM Alignment System
-- This data matches the Sample CSV files in templates/

-- Insert sample skills
INSERT INTO skill_repository (practice, skill_name, skill_cluster) VALUES
('Digital Engineering', 'Java', 'Backend'),
('Digital Engineering', 'Python', 'Backend'),
('Digital Engineering', 'JavaScript', 'Frontend'),
('Digital Engineering', 'React', 'Frontend'),
('Cloud & Infrastructure', 'AWS', 'Cloud'),
('Cloud & Infrastructure', 'Azure', 'Cloud'),
('Cloud & Infrastructure', 'DevOps', 'Infrastructure'),
('Data & AI', 'Python', 'Data'),
('Data & AI', 'Machine Learning', 'AI'),
('Data & AI', 'Data Science', 'Analytics'),
('CCA-FS', 'Java', 'Backend'),
('CCA-FS', 'Python', 'Backend'),
('CCA-FS', 'JavaScript', 'Frontend'),
('CCA-FS', 'AWS', 'Cloud'),
('CCA-FS', 'Data Science', 'Analytics');

-- Insert People Managers - from all practices
INSERT INTO people_managers (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity, is_active) VALUES
('PM001', 'John Manager', 'john.manager@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'C2', 5, 10, true),
('PM002', 'Sarah Williams', 'sarah.williams@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'D1', 8, 15, true),
('PM003', 'Michael Chen', 'michael.chen@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'D2', 10, 15, true),
('PM004', 'Emily Davis', 'emily.davis@capgemini.com', 'Data & AI', 'CU-Analytics', 'USA', 'Client-DataHub', 'Data Science', 'C1', 3, 10, true),
('PM005', 'Robert Taylor', 'robert.taylor@capgemini.com', 'Digital Engineering', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'D1', 7, 15, true),
('PM006', 'Lisa Anderson', 'lisa.anderson@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-CloudNet', 'Azure', 'C2', 4, 10, true),
('PM007', 'David Martinez', 'david.martinez@capgemini.com', 'Data & AI', 'CU-Analytics', 'USA', 'Client-DataHub', 'Machine Learning', 'D3', 12, 15, true),
('PM008', 'Jennifer Brown', 'jennifer.brown@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'React', 'C1', 2, 10, true),
('PM009', 'James Wilson', 'james.wilson@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'UK', 'Client-GlobalTech', 'DevOps', 'D1', 9, 15, true),
('PM010', 'Patricia Moore', 'patricia.moore@capgemini.com', 'Data & AI', 'CU-Analytics', 'India', 'Client-DataHub', 'Python', 'C2', 6, 10, true);

-- Insert Employees - from all practices
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, joining_date, is_new_joiner, status) VALUES
('EMP001', 'Alice Johnson', 'alice.johnson@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'B2', 'PM001', '2023-05-15', false, 'active'),
('EMP002', 'Bob Smith', 'bob.smith@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'B1', NULL, '2024-02-01', true, 'active'),
('EMP003', 'Carol White', 'carol.white@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'C1', 'PM003', '2022-08-10', false, 'active'),
('EMP004', 'Daniel Lee', 'daniel.lee@capgemini.com', 'Data & AI', 'CU-Analytics', 'USA', 'Client-DataHub', 'Python', 'B2', 'PM004', '2023-11-20', false, 'active'),
('EMP005', 'Emma Garcia', 'emma.garcia@capgemini.com', 'Digital Engineering', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'B1', 'PM005', '2023-07-01', false, 'active'),
('EMP006', 'Frank Miller', 'frank.miller@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-CloudNet', 'Azure', 'B2', 'PM006', '2024-01-15', false, 'active'),
('EMP007', 'Grace Davis', 'grace.davis@capgemini.com', 'Data & AI', 'CU-Analytics', 'USA', 'Client-DataHub', 'Machine Learning', 'C1', 'PM007', '2022-04-12', false, 'active'),
('EMP008', 'Henry Wilson', 'henry.wilson@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'React', 'B1', NULL, '2024-02-20', true, 'active'),
('EMP009', 'Iris Martinez', 'iris.martinez@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'UK', 'Client-GlobalTech', 'DevOps', 'B2', 'PM009', '2023-09-05', false, 'active'),
('EMP010', 'Jack Anderson', 'jack.anderson@capgemini.com', 'Data & AI', 'CU-Analytics', 'India', 'Client-DataHub', 'Python', 'B1', 'PM010', '2023-12-01', false, 'active'),
('EMP011', 'Karen Thomas', 'karen.thomas@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'B2', 'PM001', '2023-03-18', false, 'active'),
('EMP012', 'Leo Jackson', 'leo.jackson@capgemini.com', 'Digital Engineering', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'B1', NULL, '2024-02-28', true, 'active'),
('EMP013', 'Maria Rodriguez', 'maria.rodriguez@capgemini.com', 'Cloud & Infrastructure', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'C1', 'PM003', '2022-11-22', false, 'active'),
('EMP014', 'Nathan Harris', 'nathan.harris@capgemini.com', 'Data & AI', 'CU-Analytics', 'USA', 'Client-DataHub', 'Data Science', 'B2', 'PM004', '2023-06-14', false, 'active'),
('EMP015', 'Olivia Clark', 'olivia.clark@capgemini.com', 'Digital Engineering', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'B1', 'PM005', '2023-10-08', false, 'active');

-- Insert PM Assignments (completed assignments)
INSERT INTO pm_assignments (employee_id, old_pm_id, new_pm_id, match_score, assignment_type, status, effective_date) VALUES
('EMP001', NULL, 'PM001', 92.5, 'new_joiner', 'completed', '2023-05-15'),
('EMP003', NULL, 'PM003', 88.0, 'new_joiner', 'completed', '2022-08-10'),
('EMP004', NULL, 'PM004', 95.0, 'new_joiner', 'completed', '2023-11-20'),
('EMP005', NULL, 'PM005', 87.5, 'new_joiner', 'completed', '2023-07-01'),
('EMP006', NULL, 'PM006', 91.0, 'new_joiner', 'completed', '2024-01-15'),
('EMP007', NULL, 'PM007', 89.5, 'new_joiner', 'completed', '2022-04-12'),
('EMP009', NULL, 'PM009', 93.0, 'new_joiner', 'completed', '2023-09-05'),
('EMP010', NULL, 'PM010', 86.0, 'new_joiner', 'completed', '2023-12-01'),
('EMP011', NULL, 'PM001', 90.0, 'new_joiner', 'completed', '2023-03-18'),
('EMP013', NULL, 'PM003', 92.0, 'new_joiner', 'completed', '2022-11-22'),
('EMP014', NULL, 'PM004', 94.0, 'new_joiner', 'completed', '2023-06-14'),
('EMP015', NULL, 'PM005', 88.5, 'new_joiner', 'completed', '2023-10-08');
