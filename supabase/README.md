# 🚀 FlowForge V2 - Supabase Database Conversion Guide

FlowForge V2 has been converted to use **Supabase PostgreSQL** as its relational database.

---

## 🗄️ Supabase PostgreSQL Schema (`schema.sql`)

The schema defines 9 relational tables with indexes and foreign keys:

1. **`public.users`**: User profiles and global workspace roles (`OWNER`, `MANAGER`, `MEMBER`).
2. **`public.workflows`**: Workflow definitions, canvas nodes, and dependency edges.
3. **`public.workflow_members`**: Per-workflow RBAC memberships (`WORKFLOW_OWNER`, `WORKFLOW_MANAGER`, `WORKFLOW_MEMBER`).
4. **`public.tasks`**: Pipeline tasks with statuses, assignees, priorities, and deadlines.
5. **`public.automations`**: Smart automation rules (Triggers, Conditions, Actions).
6. **`public.automation_logs`**: History and audit of automated executions.
7. **`public.audit_logs`**: Security logs tracking user actions and access control decisions.
8. **`public.notifications`**: Real-time user notifications.
9. **`public.activity_logs`**: System activity timeline feed.

---

## ⚡ How to Apply the Schema in Supabase

1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/cmaikbsvampksszasjzg).
2. Go to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Copy the entire contents of [`supabase/schema.sql`](./schema.sql) and paste it into the editor.
5. Click **Run**.
6. Navigate to **Table Editor** to inspect the live PostgreSQL tables!

---

## 🛠️ CLI Utilities

### Seed Initial SDLC Workflow & Personas:
```bash
cd server
npm run db:seed
```

### View Live Database Tables in Terminal:
```bash
cd server
npm run db:view
```
