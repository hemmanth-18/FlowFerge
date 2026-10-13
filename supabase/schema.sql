-- ====================================================================
-- FlowForge — Supabase PostgreSQL Database Schema
-- ====================================================================
-- Complete Relational Schema with Teams, Workflows, Tasks,
-- Automations, Invitations, Notifications, Audit Logs, and RLS Policies.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'MANAGER', 'MEMBER')),
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure username and password_hash columns exist if users table already was created
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- 3. TEAMS TABLE (Core Organizational Unit)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY DEFAULT ('team_' || replace(gen_random_uuid()::text, '-', '')),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '💻',
    created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TEAM MEMBERS (Team-level RBAC: TEAM_ADMIN, TEAM_MANAGER, TEAM_MEMBER)
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY DEFAULT ('tm_' || replace(gen_random_uuid()::text, '-', '')),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'TEAM_MEMBER' CHECK (role IN ('TEAM_ADMIN', 'TEAM_MANAGER', 'TEAM_MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

-- 5. TEAM INVITATIONS
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id TEXT PRIMARY KEY DEFAULT ('tinv_' || replace(gen_random_uuid()::text, '-', '')),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'TEAM_MEMBER' CHECK (role IN ('TEAM_MANAGER', 'TEAM_MEMBER')),
    invited_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- 6. WORKFLOWS TABLE (Supports both Team and Personal workflows)
CREATE TABLE IF NOT EXISTS public.workflows (
    id TEXT PRIMARY KEY DEFAULT ('wf_' || replace(gen_random_uuid()::text, '-', '')),
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED', 'PAUSED')),
    created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make team_id nullable if it was previously NOT NULL
DO $$
BEGIN
    ALTER TABLE public.workflows ALTER COLUMN team_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 7. WORKFLOW MEMBERS (Collaborator Roles: OWNER, MANAGER, MEMBER, VIEWER)
CREATE TABLE IF NOT EXISTS public.workflow_members (
    id TEXT PRIMARY KEY DEFAULT ('wfm_' || replace(gen_random_uuid()::text, '-', '')),
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER', 'WORKFLOW_MANAGER', 'WORKFLOW_MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workflow_user UNIQUE (workflow_id, user_id)
);

-- 8. WORKFLOW INVITATIONS
CREATE TABLE IF NOT EXISTS public.workflow_invitations (
    id TEXT PRIMARY KEY DEFAULT ('winv_' || replace(gen_random_uuid()::text, '-', '')),
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    workflow_name TEXT NOT NULL,
    invited_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invited_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MANAGER', 'MEMBER', 'VIEWER')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- 9. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY DEFAULT ('task_' || replace(gen_random_uuid()::text, '-', '')),
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    due_date DATE,
    position JSONB DEFAULT '{"x": 100, "y": 100}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUTOMATIONS TABLE
CREATE TABLE IF NOT EXISTS public.automations (
    id TEXT PRIMARY KEY DEFAULT ('auto_' || replace(gen_random_uuid()::text, '-', '')),
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    trigger TEXT NOT NULL DEFAULT 'TASK_COMPLETED',
    condition JSONB NOT NULL DEFAULT '{"field": "status", "operator": "equals", "value": "COMPLETED"}'::jsonb,
    action JSONB NOT NULL DEFAULT '{"type": "ACTIVATE_NEXT_TASK", "params": {}}'::jsonb,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUTOMATION LOGS
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id TEXT PRIMARY KEY DEFAULT ('autolog_' || replace(gen_random_uuid()::text, '-', '')),
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    rule_name TEXT,
    trigger TEXT,
    action_type TEXT,
    status TEXT DEFAULT 'SUCCESS',
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SECURITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT ('audit_' || replace(gen_random_uuid()::text, '-', '')),
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    target_user_id TEXT,
    result TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'DENIED', 'ERROR')),
    reason TEXT DEFAULT '',
    workflow_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || replace(gen_random_uuid()::text, '-', '')),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    link TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT ('act_' || replace(gen_random_uuid()::text, '-', '')),
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    workflow_id TEXT,
    task_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ULTRA-PERFORMANCE INDEXES & QUERY ACCELERATION
-- ====================================================================

-- 1. USERS: Fast case-insensitive lookups & fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON public.users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);

-- 2. TEAMS & MEMBERS (High-speed RBAC and membership joins)
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON public.team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_role ON public.team_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_team_invitations_lookup ON public.team_invitations(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email_pending ON public.team_invitations(email, status) WHERE status = 'PENDING';

-- 3. WORKFLOWS (Accelerated filtering & ownership lookups)
CREATE INDEX IF NOT EXISTS idx_workflows_owner ON public.workflows(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by_created ON public.workflows(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_team_status ON public.workflows(team_id, status) WHERE status != 'ARCHIVED';
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);

-- 4. WORKFLOW MEMBERS & COLLABORATORS
CREATE INDEX IF NOT EXISTS idx_workflow_members_wf_user ON public.workflow_members(workflow_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_members_user_role ON public.workflow_members(user_id, role);

-- 5. WORKFLOW INVITATIONS (Instant pending invitation resolution)
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_pending ON public.workflow_invitations(invited_user_id, status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_wf_status ON public.workflow_invitations(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_invitations_sender ON public.workflow_invitations(invited_by, status);

-- 6. TASKS (Filtered by workflow, assignment, or team with status)
CREATE INDEX IF NOT EXISTS idx_tasks_wf_status ON public.tasks(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON public.tasks(team_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_pending ON public.tasks(due_date) WHERE status != 'COMPLETED' AND due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- 7. NOTIFICATIONS (User feed ordered by recency + partial unread index)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE read = FALSE;

-- 8. AUTOMATIONS & AUTOMATION LOGS
CREATE INDEX IF NOT EXISTS idx_automations_wf_enabled ON public.automations(workflow_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automations_team ON public.automations(team_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_wf_time ON public.automation_logs(workflow_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_team_time ON public.automation_logs(team_id, timestamp DESC);

-- 9. AUDIT & ACTIVITY LOGS (Chronological feeds)
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_time ON public.audit_logs(team_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_wf_time ON public.audit_logs(workflow_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_time ON public.activity_logs(team_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON public.activity_logs(user_id, timestamp DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Service Role Bypass (allows full access to backend operations)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on teams" ON public.teams;
CREATE POLICY "Service role full access on teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on team_members" ON public.team_members;
CREATE POLICY "Service role full access on team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on team_invitations" ON public.team_invitations;
CREATE POLICY "Service role full access on team_invitations" ON public.team_invitations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on workflows" ON public.workflows;
CREATE POLICY "Service role full access on workflows" ON public.workflows FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on workflow_members" ON public.workflow_members;
CREATE POLICY "Service role full access on workflow_members" ON public.workflow_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on workflow_invitations" ON public.workflow_invitations;
CREATE POLICY "Service role full access on workflow_invitations" ON public.workflow_invitations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on automations" ON public.automations;
CREATE POLICY "Service role full access on automations" ON public.automations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on automation_logs" ON public.automation_logs;
CREATE POLICY "Service role full access on automation_logs" ON public.automation_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on activity_logs" ON public.activity_logs;
CREATE POLICY "Service role full access on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Authenticated Users RLS Policies
DROP POLICY IF EXISTS "Users can view profile directory" ON public.users;
CREATE POLICY "Users can view profile directory" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users view notifications for them" ON public.notifications;
CREATE POLICY "Users view notifications for them" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);

-- Realtime Publication for Notifications & Tasks
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
