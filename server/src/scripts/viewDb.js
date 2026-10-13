require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {}
}

function getJson(path) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${path}`, {
      headers: { 'Authorization': 'Bearer demo-user-arun' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ data: [] });
        }
      });
    }).on('error', () => resolve({ data: [] }));
  });
}

async function printDatabaseTables() {
  console.log('\x1b[35m%s\x1b[0m', '\n========================================================================================');
  console.log('\x1b[35m%s\x1b[0m', '                 📊 FLOWFORGE V2 SUPABASE POSTGRESQL RAW TABLES');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================================\n');

  let usedSupabaseDirect = false;

  if (supabase) {
    try {
      const { data: users, error: uErr } = await supabase.from('users').select('*').limit(20);
      if (!uErr && users) {
        usedSupabaseDirect = true;
        console.log('\x1b[32m%s\x1b[0m', '⚡ Source: Live Supabase PostgreSQL Connection');
        
        console.log('\x1b[36m%s\x1b[0m', '\n👥 1. public.users TABLE');
        console.table(users.map(u => ({
          ID: u.id,
          Name: u.name,
          Email: u.email,
          GlobalRole: u.role,
          CreatedAt: u.created_at?.substring(0, 19),
          LastLogin: u.last_login?.substring(0, 19)
        })));

        const { data: workflows } = await supabase.from('workflows').select('*').limit(20);
        console.log('\x1b[33m%s\x1b[0m', '\n📁 2. public.workflows TABLE');
        if (workflows && workflows.length > 0) {
          console.table(workflows.map(w => ({
            WorkflowID: w.id,
            Name: w.name,
            Status: w.status,
            CreatedBy: w.created_by,
            CreatedAt: w.created_at?.substring(0, 19)
          })));
        } else {
          console.log('No workflows found in public.workflows.\n');
        }

        const { data: tasks } = await supabase.from('tasks').select('*').limit(20);
        console.log('\x1b[32m%s\x1b[0m', '\n📋 3. public.tasks TABLE');
        if (tasks && tasks.length > 0) {
          console.table(tasks.map(t => ({
            TaskID: t.id,
            Title: t.title,
            WorkflowID: t.workflow_id,
            Status: t.status,
            Priority: t.priority,
            AssignedTo: t.assigned_to,
            DueDate: t.due_date
          })));
        } else {
          console.log('No tasks found in public.tasks.\n');
        }

        const { data: automations } = await supabase.from('automations').select('*').limit(20);
        console.log('\x1b[34m%s\x1b[0m', '\n⚡ 4. public.automations TABLE');
        if (automations && automations.length > 0) {
          console.table(automations.map(a => ({
            RuleID: a.id,
            RuleName: a.name,
            WorkflowID: a.workflow_id,
            Trigger: a.trigger,
            Action: a.action?.type,
            Executions: a.execution_count,
            Enabled: a.enabled ? 'YES' : 'NO'
          })));
        } else {
          console.log('No automations found in public.automations.\n');
        }

        const { data: audits } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(10);
        console.log('\x1b[31m%s\x1b[0m', '\n🔒 5. public.audit_logs TABLE');
        if (audits && audits.length > 0) {
          console.table(audits.map(l => ({
            AuditID: l.id,
            Action: l.action,
            User: l.user_name,
            Role: l.user_role,
            Result: l.result,
            Reason: l.reason || '-',
            Timestamp: l.timestamp?.substring(0, 19)
          })));
        } else {
          console.log('No audit records found in public.audit_logs.\n');
        }

        return;
      }
    } catch (e) {}
  }

  // API Fallback viewer
  console.log('\x1b[33m%s\x1b[0m', '⚡ Source: Application Database Service (API Buffer)');
  const usersRes = await getJson('/api/team');
  console.log('\x1b[36m%s\x1b[0m', '\n👥 1. USERS TABLE');
  if (usersRes.data && usersRes.data.length > 0) {
    console.table(usersRes.data.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      GlobalRole: u.role,
      CreatedAt: u.createdAt?.substring(0, 19),
      LastLogin: u.lastLogin?.substring(0, 19)
    })));
  }

  const wfRes = await getJson('/api/workflows');
  console.log('\x1b[33m%s\x1b[0m', '\n📁 2. WORKFLOWS TABLE');
  if (wfRes.data && wfRes.data.length > 0) {
    console.table(wfRes.data.map(w => ({
      WorkflowID: w.id,
      Name: w.name,
      Status: w.status,
      TotalTasks: w.totalTasks,
      Completed: w.completedTasks,
      Progress: `${w.progress}%`,
      CreatedBy: w.createdBy
    })));
  }

  const tasksRes = await getJson('/api/tasks');
  console.log('\x1b[32m%s\x1b[0m', '\n📋 3. TASKS TABLE');
  if (tasksRes.data && tasksRes.data.length > 0) {
    console.table(tasksRes.data.map(t => ({
      TaskID: t.id,
      Title: t.title,
      WorkflowID: t.workflowId,
      Status: t.status,
      Priority: t.priority,
      AssignedTo: t.assignedTo,
      DueDate: t.dueDate
    })));
  }

  const autoRes = await getJson('/api/automations');
  console.log('\x1b[34m%s\x1b[0m', '\n⚡ 4. AUTOMATIONS TABLE');
  if (autoRes.data && autoRes.data.length > 0) {
    console.table(autoRes.data.map(a => ({
      RuleID: a.id,
      RuleName: a.name,
      Workflow: a.workflowName || a.workflowId,
      Trigger: a.trigger,
      Action: a.action?.type,
      Executions: a.executionCount || 0,
      Enabled: a.enabled ? 'YES' : 'NO'
    })));
  }

  const auditRes = await getJson('/api/audit');
  console.log('\x1b[31m%s\x1b[0m', '\n🔒 5. SECURITY AUDIT TRAIL TABLE');
  if (auditRes.data && auditRes.data.length > 0) {
    console.table(auditRes.data.slice(0, 10).map(l => ({
      AuditID: l.id,
      Action: l.action,
      User: l.userName,
      Role: l.userRole,
      Target: (l.target || l.resource || '').substring(0, 25),
      Result: l.result,
      Timestamp: l.timestamp?.substring(0, 19)
    })));
  }
}

printDatabaseTables();
