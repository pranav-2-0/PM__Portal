-- Add authentication tables
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department_id INTEGER,
  role VARCHAR(50) DEFAULT 'Employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Insert default departments
INSERT INTO departments (name, description) VALUES
  ('CCA-FS', 'Customer Cloud Architecture - Financial Services'),
  ('Cloud & Infrastructure', 'Cloud & Infrastructure'),
  ('Data & AI', 'Data & AI'),
  ('DCX-DE', 'Digital Customer Experience - Digital Engineering'),
  ('DCX-FS', 'Digital Customer Experience - Financial Services'),
  ('Digital Engineering', 'Digital Engineering'),
  ('Enterprise Architecture', 'Enterprise Architecture'),
  ('Insights & Data', 'Insights & Data'),
  ('SAP', 'SAP')
ON CONFLICT (name) DO NOTHING;

-- Insert demo users
INSERT INTO users (name, email, password_hash, department_id, role) VALUES
  ('Super Admin', 'admin@test.com', '$2a$10$YourHashedPasswordHere', NULL, 'Super Admin'),
  ('Demo User', 'demo@test.com', '$2a$10$YourHashedPasswordHere', 1, 'Manager'),
  ('Demo PM', 'pm@test.com', '$2a$10$YourHashedPasswordHere', 1, 'People Manager')
ON CONFLICT (email) DO NOTHING;
