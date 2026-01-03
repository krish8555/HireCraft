-- Disable RLS on storage.objects for the resumes bucket
-- This allows public uploads to the resumes bucket

-- First, create policies for the resumes bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to upload to resumes bucket
CREATE POLICY "Allow public uploads to resumes bucket" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'resumes');

-- Allow anyone to read from resumes bucket  
CREATE POLICY "Allow public reads from resumes bucket" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'resumes');

-- Allow anyone to update/delete their uploads (optional)
CREATE POLICY "Allow public updates to resumes bucket" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'resumes');

CREATE POLICY "Allow public deletes from resumes bucket" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'resumes');
