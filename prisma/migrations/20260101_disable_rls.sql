-- Disable RLS on applications table completely
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on jobs table so public can read jobs
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
