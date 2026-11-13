-- =====================================================================
-- 05_reference_data.sql  —  Lookup data required by the application
-- (demo users/jobs are created separately by `npm run db:seed`)
-- =====================================================================

INSERT INTO departments (code, name) VALUES
    ('CSE', 'Computer Science & Engineering'),
    ('IT',  'Information Technology'),
    ('ECE', 'Electronics & Communication Engineering'),
    ('EEE', 'Electrical & Electronics Engineering'),
    ('ME',  'Mechanical Engineering'),
    ('CE',  'Civil Engineering')
ON CONFLICT (code) DO NOTHING;
