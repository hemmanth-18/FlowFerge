    -- ====================================================================
    -- FlowForge — Supabase PostgreSQL Performance Index Optimization
    -- ====================================================================
    -- Run this script in the Supabase SQL Editor to instantly accelerate:
    -- - Workflow queries & canvas loading
    -- - User search & collaborator autocomplete
    -- - Task filtering by status/assignee/priority
    -- - Notifications & unread counts
    -- - Audit and activity chronological feeds
    -- ====================================================================

    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(LOWER(email));
    CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users(LOWER(username));
    CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON public.users USING gin (username gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);

      CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
    CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
    CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON public.team_members(team_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user_role ON public.team_members(user_id, role);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_lookup ON public.team_invitations(team_id, status);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email_pending ON public.team_invitations(email, status) WHERE status = 'PENDING';

    -- 4. WORKFLOWS
    CREATE INDEX IF NOT EXISTS idx_workflows_owner ON public.workflows(owner_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_created_by_created ON public.workflows(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workflows_team_status ON public.workflows(team_id, status) WHERE status != 'ARCHIVED';
    CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);

    -- 5. WORKFLOW MEMBERS (Collaborators)
    CREATE INDEX IF NOT EXISTS idx_workflow_members_wf_user ON public.workflow_members(workflow_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_members_user_role ON public.workflow_members(user_id, role);

    -- 6. WORKFLOW INVITATIONS
    CREATE INDEX IF NOT EXISTS idx_workflow_invitations_pending ON public.workflow_invitations(invited_user_id, status) WHERE status = 'PENDING';
    CREATE INDEX IF NOT EXISTS idx_workflow_invitations_wf_status ON public.workflow_invitations(workflow_id, status);
    CREATE INDEX IF NOT EXISTS idx_workflow_invitations_sender ON public.workflow_invitations(invited_by, status);

    -- 7. TASKS (Filtered by workflow, assignment, or team with status)
    CREATE INDEX IF NOT EXISTS idx_tasks_wf_status ON public.tasks(workflow_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON public.tasks(team_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_pending ON public.tasks(due_date) WHERE status != 'COMPLETED' AND due_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

    -- 8. NOTIFICATIONS (User feed ordered by recency + partial unread index)
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE read = FALSE;

    -- 9. AUTOMATIONS & AUTOMATION LOGS
    CREATE INDEX IF NOT EXISTS idx_automations_wf_enabled ON public.automations(workflow_id, enabled);
    CREATE INDEX IF NOT EXISTS idx_automations_team ON public.automations(team_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_wf_time ON public.automation_logs(workflow_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_team_time ON public.automation_logs(team_id, timestamp DESC);

    -- 10. AUDIT & ACTIVITY LOGS (Chronological feeds)
    CREATE INDEX IF NOT EXISTS idx_audit_logs_team_time ON public.audit_logs(team_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON public.audit_logs(user_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_wf_time ON public.audit_logs(workflow_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_team_time ON public.activity_logs(team_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time ON public.activity_logs(user_id, timestamp DESC);

    -- 11. UPDATE PLANNER STATISTICS
    ANALYZE public.users;
    ANALYZE public.teams;
    ANALYZE public.team_members;
    ANALYZE public.workflows;
    ANALYZE public.workflow_members;
    ANALYZE public.workflow_invitations;
    ANALYZE public.tasks;
    ANALYZE public.notifications;
    ANALYZE public.automations;
    ANALYZE public.audit_logs;
    ANALYZE public.activity_logs;
