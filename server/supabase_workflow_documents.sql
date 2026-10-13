-- =========================================================================
-- FLOWFORGE: Workflow Documents Table with Privacy Label Support
-- Run this script in the Supabase SQL Editor if you wish to persist
-- document records in PostgreSQL in addition to Supabase Storage.
-- =========================================================================

-- 1. Create workflow_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workflow_documents (
  id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES public.workflows(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  description TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add is_private column if table already exists without it
ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 3. Add index for fast workflow lookups
CREATE INDEX IF NOT EXISTS idx_workflow_documents_wf_id 
ON public.workflow_documents (workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_documents_uploader 
ON public.workflow_documents (uploaded_by);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.workflow_documents ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Allow authenticated read workflow documents" 
ON public.workflow_documents FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated insert workflow documents" 
ON public.workflow_documents FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete workflow documents" 
ON public.workflow_documents FOR DELETE 
TO authenticated 
USING (true);
