-- Enable RLS on applications table (if not already enabled)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert applications (for job applicants)
CREATE POLICY "Allow public to insert applications" ON applications
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow authenticated users (admins) to read all applications
CREATE POLICY "Allow authenticated users to read applications" ON applications
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users (admins) to update applications (for shortlisting)
CREATE POLICY "Allow authenticated users to update applications" ON applications
  FOR UPDATE TO authenticated
  USING (true);

-- Optional: For the jobs table, allow public to read
CREATE POLICY "Allow public to read jobs" ON jobs
  FOR SELECT TO public
  USING (true);

-- Allow authenticated users to manage jobs
CREATE POLICY "Allow authenticated users to manage jobs" ON jobs
  FOR ALL TO authenticated
  USING (true);
