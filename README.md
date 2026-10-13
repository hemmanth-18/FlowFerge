# FlowForge — Smart Workflow Management Platform

**Build. Manage. Flow.**

FlowForge is a full-stack, team-based workflow management and automation SaaS platform built with **React, Vite, Express, and Supabase**.

---

## 🏛️ Architecture Overview

```text
Vite + React
      │
      ├─── Supabase Auth (Sign Up, Sign In, Sessions, JWT Identity)
      │
      ├─── Supabase PostgreSQL (Relational Tables, Foreign Keys, RLS)
      │
      ├─── Supabase Realtime (Notifications, Task Updates, Live Activity)
      │
      └─── Node.js + Express Backend
                │
                ├─── Workflow Business Logic & DAG Validation
                ├─── Automation Engine & Graph Traversal
                └─── Secure Server Operations & Role Enforcement
```

> **Pure Supabase Platform**: FlowForge is powered 100% by **Supabase** for all backend functions. All persistence, authentication, authorization, sessions, real-time events, and audit logs are powered directly by Supabase.

---

## 🚀 Key Highlights & Capabilities

- **Complete Supabase Backend**: Persistence is backed entirely by Supabase PostgreSQL with relational foreign keys, constraints, and Row Level Security (RLS).
- **Supabase Authentication**: Integrated authentication with password hashing, secure sessions, JWT verification, and user identity tracking.
- **Teams as the Core Organizational Unit**:
  - Workspace scoping: `User` → `Team` → `Workflows` → `Tasks` → `Automations`.
  - Roles: `TEAM_ADMIN`, `TEAM_MANAGER`, `TEAM_MEMBER`, `TEAM_VIEWER`.
- **Granular Workflow Ownership & RBAC**:
  - `OWNER`: Full control, manage settings, invite members, archive/delete.
  - `MANAGER`: Edit tasks, manage dependencies, trigger automations.
  - `MEMBER`: View workflow, update assigned tasks, participate in discussions.
  - `VIEWER`: Read-only access to workflow progress.
- **Visual DAG Workflow Builder**:
  - Powered by React Flow (`@xyflow/react`).
  - Custom task nodes, color-coded status badges, and drag-and-drop dependency linking.
  - Cycle detection and automated downstream task activation.
- **Automation Engine**:
  - Event triggers (`TASK_COMPLETED`, `STATUS_CHANGED`, `WORKFLOW_STARTED`).
  - Automated task activation when upstream dependencies are met.
  - Full execution history and audit logging.
- **Notification & Invitation Center**:
  - In-app notification feeds with read/unread filtering.
  - Team and workflow collaborator invitations with inline Accept/Decline action buttons.
- **Anti-IDOR & Server-Side Security**:
  - Express authorization middleware validates Supabase tokens and enforces team and workflow membership.
  - Supabase Row Level Security (RLS) guarantees data isolation at the database level.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Lucide React, Axios, `@supabase/supabase-js` |
| **Backend** | Node.js, Express.js, `@supabase/supabase-js`, `cookie-parser`, `bcryptjs`, `cors`, `helmet` |
| **Database** | Supabase PostgreSQL with relational tables, foreign keys, and RLS |
| **Auth** | Supabase Auth with JWT token verification and server sessions |
| **Realtime** | Supabase Realtime publication for tables |

---

## 🗄️ Supabase PostgreSQL Database Schema

The database schema (`supabase/schema.sql`) includes the following relational tables with Row Level Security:

| Table | Purpose |
| :--- | :--- |
| `users` | User profiles (`id`, `email`, `username`, `name`, `avatar_url`, `created_at`) |
| `teams` | Team workspaces (`id`, `name`, `description`, `created_by`, `archived`) |
| `team_members` | Team membership & roles (`team_id`, `user_id`, `role`, `joined_at`) |
| `team_invitations` | Team member invite records (`team_id`, `email`, `role`, `status`) |
| `workflows` | Workflows (`id`, `title`, `description`, `team_id`, `owner_id`, `status`, `nodes`, `edges`) |
| `workflow_members` | Workflow collaborator permissions (`workflow_id`, `user_id`, `role`) |
| `workflow_invitations` | Workflow collaborator invite records (`workflow_id`, `invited_user_id`, `role`, `status`) |
| `tasks` | Actionable tasks (`id`, `workflow_id`, `title`, `status`, `priority`, `assigned_to`, `dependencies`) |
| `automations` | Workflow automation rules (`id`, `workflow_id`, `trigger_type`, `action_type`, `config`, `enabled`) |
| `automation_logs` | Execution history of automations (`id`, `automation_id`, `status`, `executed_at`, `payload`) |
| `notifications` | Notification alerts (`id`, `user_id`, `type`, `title`, `message`, `read`, `metadata`) |
| `activity_logs` | User activity feed (`id`, `team_id`, `workflow_id`, `user_id`, `action`, `details`) |
| `audit_logs` | Security and compliance audit trail (`id`, `team_id`, `workflow_id`, `user_id`, `action`, `result`) |

---

## ⚙️ Environment Variables

### Frontend Client (`client/.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_API_URL=
```

### Backend Server (`server/.env`)

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
```

> **Security Note**: `SUPABASE_SERVICE_ROLE_KEY` is kept exclusively on the server and is never exposed to the frontend.

---

## 🏃 Running Locally

### 1. Database Setup (Supabase)
Execute the migration script in `supabase/schema.sql` inside your Supabase project's SQL Editor to create all required tables, indexes, and RLS policies.

### 2. Backend Server
```bash
cd server
npm install
node src/server.js
```
The server will start on [http://localhost:5000](http://localhost:5000) and verify the Supabase connection.

### 3. Frontend Client
```bash
cd client
npm install
npm run dev
```
The client will start on [http://localhost:5173](http://localhost:5173).

---

## 🔑 Pre-Seeded Test Accounts

| User | Email | Username | Password | Role / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Hemmanth** | `hemmanth@example.com` | `hemmanth` | `Password123!` | Platform Admin / Team Owner |
| **Priya** | `priya@example.com` | `priya` | `Password123!` | Workflow Manager Collaborator |
| **Ravi** | `ravi@example.com` | `ravi` | `Password123!` | Multi-Team Developer (Dev Team Member, Event Team Manager) |
| **Kumar** | `kumar@example.com` | `kumar` | `Password123!` | Marketing Team Member |

---

## 🌐 Application URL Directory

- **Sign In**: [http://localhost:5173/login](http://localhost:5173/login)
- **Registration**: [http://localhost:5173/register](http://localhost:5173/register)
- **Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
- **Workflows**: [http://localhost:5173/workflows](http://localhost:5173/workflows)
- **Teams**: [http://localhost:5173/teams](http://localhost:5173/teams)
- **Tasks**: [http://localhost:5173/tasks](http://localhost:5173/tasks)
- **People Directory**: [http://localhost:5173/people](http://localhost:5173/people)
- **Notifications**: [http://localhost:5173/notifications](http://localhost:5173/notifications)
- **Audit Logs**: [http://localhost:5173/audit-logs](http://localhost:5173/audit-logs)
- **Settings & Profile**: [http://localhost:5173/settings](http://localhost:5173/settings)

---

## 🧪 Automated Test Suite

FlowForge includes test suites validating authentication, RBAC, Supabase PostgreSQL synchronization, and DAG automation:

```bash
# Test API endpoints, anti-IDOR isolation, and sessions
cd server
node test-auth-and-ownership.js

# Test multi-team scoping, invitations, and automation engine
node test-team-platform.js
```
