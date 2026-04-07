-- Comprehensive sample data for PM Alignment System - CCA-FS Practice
-- All data is for the CCA-FS practice to match the demo user's department

-- Insert sample skills for CCA-FS
INSERT INTO skill_repository (practice, skill_name, skill_cluster) VALUES
('CCA-FS', 'Java', 'Backend'),
('CCA-FS', 'Python', 'Backend'),
('CCA-FS', 'JavaScript', 'Frontend'),
('CCA-FS', 'React', 'Frontend'),
('CCA-FS', 'AWS', 'Cloud'),
('CCA-FS', 'Azure', 'Cloud'),
('CCA-FS', 'DevOps', 'Infrastructure'),
('CCA-FS', 'Data Science', 'Analytics'),
('CCA-FS', 'Machine Learning', 'AI'),
('CCA-FS', 'SQL', 'Database');

-- Insert People Managers - all for CCA-FS
INSERT INTO people_managers (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity, is_active) VALUES
('PM001', 'John Manager', 'john.manager@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'C2', 5, 10, true),
('PM002', 'Sarah Williams', 'sarah.williams@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'D1', 8, 15, true),
('PM003', 'Michael Chen', 'michael.chen@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'D2', 10, 15, true),
('PM004', 'Emily Davis', 'emily.davis@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Data Science', 'C1', 3, 10, true),
('PM005', 'Robert Taylor', 'robert.taylor@capgemini.com', 'CCA-FS', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'D1', 7, 15, true),
('PM006', 'Lisa Anderson', 'lisa.anderson@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'Azure', 'C2', 4, 10, true),
('PM007', 'David Martinez', 'david.martinez@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Machine Learning', 'D3', 12, 15, true),
('PM008', 'Jennifer Brown', 'jennifer.brown@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'React', 'C1', 2, 10, true),
('PM009', 'James Wilson', 'james.wilson@capgemini.com', 'CCA-FS', 'CU-Cloud', 'UK', 'Client-GlobalTech', 'DevOps', 'D1', 9, 15, true),
('PM010', 'Patricia Moore', 'patricia.moore@capgemini.com', 'CCA-FS', 'CU-Analytics', 'India', 'Client-DataHub', 'SQL', 'C2', 6, 10, true);

-- Insert Employees - all for CCA-FS
INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, joining_date, is_new_joiner, status) VALUES
('EMP001', 'Alice Johnson', 'alice.johnson@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'B2', 'PM001', '2023-05-15', false, 'active'),
('EMP002', 'Bob Smith', 'bob.smith@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'B1', NULL, '2024-02-01', true, 'active'),
('EMP003', 'Carol White', 'carol.white@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'C1', 'PM003', '2022-08-10', false, 'active'),
('EMP004', 'Daniel Lee', 'daniel.lee@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Python', 'B2', 'PM004', '2023-11-20', false, 'active'),
('EMP005', 'Emma Garcia', 'emma.garcia@capgemini.com', 'CCA-FS', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'B1', 'PM005', '2023-07-01', false, 'active'),
('EMP006', 'Frank Miller', 'frank.miller@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'Azure', 'B2', 'PM006', '2024-01-15', false, 'active'),
('EMP007', 'Grace Davis', 'grace.davis@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Machine Learning', 'C1', 'PM007', '2022-04-12', false, 'active'),
('EMP008', 'Henry Wilson', 'henry.wilson@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'React', 'B1', NULL, '2024-02-20', true, 'active'),
('EMP009', 'Iris Martinez', 'iris.martinez@capgemini.com', 'CCA-FS', 'CU-Cloud', 'UK', 'Client-GlobalTech', 'DevOps', 'B2', 'PM009', '2023-09-05', false, 'active'),
('EMP010', 'Jack Anderson', 'jack.anderson@capgemini.com', 'CCA-FS', 'CU-Analytics', 'India', 'Client-DataHub', 'SQL', 'B1', 'PM010', '2023-12-01', false, 'active'),
('EMP011', 'Karen Thomas', 'karen.thomas@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Java', 'B2', 'PM001', '2023-03-18', false, 'active'),
('EMP012', 'Leo Jackson', 'leo.jackson@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'Python', 'B1', NULL, '2024-02-28', true, 'active'),
('EMP013', 'Maria Rodriguez', 'maria.rodriguez@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'AWS', 'C1', 'PM003', '2022-11-22', false, 'active'),
('EMP014', 'Nathan Harris', 'nathan.harris@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Data Science', 'B2', 'PM004', '2023-06-14', false, 'active'),
('EMP015', 'Olivia Clark', 'olivia.clark@capgemini.com', 'CCA-FS', 'CU-Technology', 'UK', 'Client-GlobalTech', 'JavaScript', 'B1', 'PM005', '2023-10-08', false, 'active'),
('EMP016', 'Peter Lewis', 'peter.lewis@capgemini.com', 'CCA-FS', 'CU-Cloud', 'India', 'Client-CloudNet', 'Azure', 'B2', 'PM006', '2024-01-22', false, 'active'),
('EMP017', 'Quinn Walker', 'quinn.walker@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Python', 'B1', 'PM007', '2023-08-30', false, 'active'),
('EMP018', 'Rachel Hall', 'rachel.hall@capgemini.com', 'CCA-FS', 'CU-Technology', 'India', 'Client-TechCorp', 'React', 'B2', 'PM008', '2023-04-25', false, 'active'),
('EMP019', 'Samuel Allen', 'samuel.allen@capgemini.com', 'CCA-FS', 'CU-Cloud', 'UK', 'Client-GlobalTech', 'DevOps', 'B1', 'PM009', '2023-11-15', false, 'active'),
('EMP020', 'Tina Turner', 'tina.turner@capgemini.com', 'CCA-FS', 'CU-Analytics', 'USA', 'Client-DataHub', 'Data Science', 'B2', NULL, '2024-03-01', true, 'active');

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
('EMP015', NULL, 'PM005', 88.5, 'new_joiner', 'completed', '2023-10-08'),
('EMP016', NULL, 'PM006', 90.5, 'new_joiner', 'completed', '2024-01-22'),
('EMP017', NULL, 'PM007', 87.0, 'new_joiner', 'completed', '2023-08-30'),
('EMP018', NULL, 'PM008', 91.5, 'new_joiner', 'completed', '2023-04-25'),
('EMP019', NULL, 'PM009', 89.0, 'new_joiner', 'completed', '2023-11-15');
