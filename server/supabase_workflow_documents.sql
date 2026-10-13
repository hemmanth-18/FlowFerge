-- =========================================================================
-- FLOWFORGE: Workflow Documents & Private Recipients Schema (Updated)
-- Run this in your Supabase SQL Editor.
-- It is safe to run even if you ran the previous query (idempotent migration).
-- =========================================================================

-- 1. Create or update workflow_documents table
CREATE TABLE IF NOT EXISTS public.workflow_documents (
  id TEXT PRIMARY KEY,
  workflow_id TEXT REFERENCES public.workflows(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  mime_type TEXT,
  file_size BIGINT,
  visibility TEXT DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
  is_private BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all new columns exist if table was previously created
ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'PUBLIC';

ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

ALTER TABLE public.workflow_documents 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create document_recipients table for private recipient tracking
CREATE TABLE IF NOT EXISTS public.document_recipients (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES public.workflow_documents(id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES public.workflows(id) ON DELETE CASCADE,
  recipient_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_username TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'DELIVERED',
  revoked_at TIMESTAMPTZ
);

-- 3. Add lookup indexes
CREATE INDEX IF NOT EXISTS idx_workflow_documents_wf_id 
ON public.workflow_documents (workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_documents_uploader 
ON public.workflow_documents (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_workflow_documents_visibility 
ON public.workflow_documents (visibility);

CREATE INDEX IF NOT EXISTS idx_document_recipients_doc_id 
ON public.document_recipients (document_id);

CREATE INDEX IF NOT EXISTS idx_document_recipients_user_id 
ON public.document_recipients (recipient_user_id);

CREATE INDEX IF NOT EXISTS idx_document_recipients_wf_id 
ON public.document_recipients (workflow_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.workflow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_recipients ENABLE ROW LEVEL SECURITY;

-- 5. Safe idempotent Policies for workflow_documents
DROP POLICY IF EXISTS "Allow authenticated read workflow documents" ON public.workflow_documents;
CREATE POLICY "Allow authenticated read workflow documents" 
ON public.workflow_documents FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert workflow documents" ON public.workflow_documents;
CREATE POLICY "Allow authenticated insert workflow documents" 
ON public.workflow_documents FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update workflow documents" ON public.workflow_documents;
CREATE POLICY "Allow authenticated update workflow documents" 
ON public.workflow_documents FOR UPDATE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete workflow documents" ON public.workflow_documents;
CREATE POLICY "Allow authenticated delete workflow documents" 
ON public.workflow_documents FOR DELETE 
TO authenticated 
USING (true);

-- 6. Safe idempotent Policies for document_recipients
DROP POLICY IF EXISTS "Allow authenticated read document recipients" ON public.document_recipients;
CREATE POLICY "Allow authenticated read document recipients" 
ON public.document_recipients FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert document recipients" ON public.document_recipients;
CREATE POLICY "Allow authenticated insert document recipients" 
ON public.document_recipients FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete document recipients" ON public.document_recipients;
CREATE POLICY "Allow authenticated delete document recipients" 
ON public.document_recipients FOR DELETE 
TO authenticated 
USING (true);

-- 7. Ensure private storage bucket exists in Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('workflow-documents', 'workflow-documents', false)
ON CONFLICT (id) DO NOTHING;
