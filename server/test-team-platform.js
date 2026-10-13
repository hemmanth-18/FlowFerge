const SupabaseService = require('./src/services/supabaseService');

async function runTests() {
  console.log('=== STARTING FLOWFORGE SUPABASE TEAM-BASED PLATFORM TESTS ===\n');

  // 1. Seed Multi-Team Scenario
  console.log('1. Seeding multi-team dataset in Supabase...');
  const { devTeam, mktTeam, eventTeam } = await SupabaseService.seedMultiTeamScenario();
  console.log(`Seeded teams: Dev=${devTeam.id}, Mkt=${mktTeam.id}, Event=${eventTeam.id}`);

  // 2. Verify User Teams & Multi-Role Support (Section 23: Multi-Team User)
  console.log('\n2. Testing Multi-Team User (Ravi)...');
  const raviTeams = await SupabaseService.getUserTeams('user_ravi');
  console.log('Ravi is in', raviTeams.length, 'teams:');
  raviTeams.forEach(t => console.log(`   - ${t.name} (${t.id}): Role = ${t.userRole}`));

  const devRole = await SupabaseService.getTeamMemberRole(devTeam.id, 'user_ravi');
  const eventRole = await SupabaseService.getTeamMemberRole(eventTeam.id, 'user_ravi');
  console.log(`Assertion check: Ravi in Dev Team is ${devRole} (expected TEAM_MEMBER)`);
  console.log(`Assertion check: Ravi in Event Team is ${eventRole} (expected TEAM_MANAGER)`);
  if (devRole !== 'TEAM_MEMBER' || eventRole !== 'TEAM_MANAGER') {
    throw new Error('Multi-Team Role test failed!');
  }
  console.log('✓ Multi-Team Role test passed!');

  // 3. Test Team Dashboard Stats (Section 4 & 22)
  console.log('\n3. Testing Team Dashboard stats for Dev Team...');
  const devDashboard = await SupabaseService.getTeamDashboard(devTeam.id, 'user_arun');
  console.log('Dev Team Stats:', JSON.stringify(devDashboard.stats));
  console.log(`Active Workflows: ${devDashboard.activeWorkflows.length}`);
  console.log(`Recent Activities: ${devDashboard.recentActivity.length}`);
  if (devDashboard.stats.activeWorkflows < 1) {
    throw new Error('Dashboard stats check failed!');
  }
  console.log('✓ Team Dashboard test passed!');

  // 4. Test Workflow Scoping & Granular Roles (Section 7, 8, 9)
  console.log('\n4. Testing Workflow Scoping & Restriction...');
  const devWorkflows = await SupabaseService.getWorkflowsByTeam(devTeam.id, 'user_arun');
  console.log(`Dev Team has ${devWorkflows.length} workflows:`);
  devWorkflows.forEach(w => console.log(`   - [${w.id}] ${w.name} (Restricted: ${w.isRestricted})`));

  const mobileWf = devWorkflows.find(w => w.name === 'Mobile App');
  const webWf = devWorkflows.find(w => w.name === 'Website Development');

  // Check Ravi's access to Website Dev vs Mobile App
  const canRaviAccessWebsite = await SupabaseService.isUserWorkflowMember(webWf.id, 'user_ravi');
  const canKumarAccessMobile = await SupabaseService.isUserWorkflowMember(mobileWf.id, 'user_kumar');
  console.log(`Ravi can access Website Dev: ${canRaviAccessWebsite} (expected true)`);
  console.log(`Kumar can access Mobile App: ${canKumarAccessMobile} (expected false, restricted to Arun & Ravi)`);
  if (!canRaviAccessWebsite || canKumarAccessMobile) {
    throw new Error('Workflow scoping & restriction check failed!');
  }
  console.log('✓ Workflow scoping test passed!');

  // 5. Test Tasks: My Tasks vs Team Tasks (Section 10, 11, 12)
  console.log('\n5. Testing Task Assignment & Scoping...');
  const raviTasks = await SupabaseService.getMyTasks('user_ravi', devTeam.id);
  console.log(`Ravi's "My Tasks" in Dev Team: ${raviTasks.length} tasks`);
  raviTasks.forEach(t => console.log(`   - [${t.status}] ${t.title} (Priority: ${t.priority}, AssignedTo: ${t.assignedTo})`));

  const allDevTasks = await SupabaseService.getTeamTasks(devTeam.id);
  console.log(`Manager's "Team Tasks" in Dev Team: ${allDevTasks.length} tasks`);
  if (raviTasks.length === 0 || allDevTasks.length <= raviTasks.length) {
    throw new Error('Task scoping check failed!');
  }
  console.log('✓ Task scoping test passed!');

  // 6. Test Team-Scoped Search (Section 29) & Anti-IDOR (Section 19)
  console.log('\n6. Testing Access-Controlled Scoped Search (Section 29)...');
  const arunSearch = await SupabaseService.searchTeamResources(devTeam.id, 'user_arun', 'Workspace');
  console.log(`Arun searched 'Workspace' in Dev Team:`, arunSearch.tasks.length, 'tasks found');
  if (arunSearch.tasks.length === 0) {
    throw new Error('Expected task match for Arun search in Dev Team');
  }

  // Cross-team search attempt by unauthorized user (Anti-IDOR validation)
  let idorBlocked = false;
  try {
    await SupabaseService.searchTeamResources(mktTeam.id, 'user_kumar', 'Launch');
  } catch (err) {
    idorBlocked = true;
    console.log(`Anti-IDOR defense confirmed: Kumar blocked from searching Marketing Team (${err.message})`);
  }
  if (!idorBlocked) {
    throw new Error('Anti-IDOR security test failed: Unauthorized user was able to search another team!');
  }
  console.log('✓ Scoped search & Anti-IDOR test passed!');

  // 7. Test Invitations (Section 6 & 25)
  console.log('\n7. Testing Team Invitation Lifecycle (Section 6 & 25)...');
  const newInvite = await SupabaseService.createTeamInvitation(
    devTeam.id,
    { email: 'newdev@example.com', role: 'TEAM_MEMBER' },
    'user_arun'
  );
  console.log(`Created invitation for newdev@example.com: ID = ${newInvite.id}, status = ${newInvite.status}`);
  const teamInvites = await SupabaseService.getTeamInvitations(devTeam.id);
  console.log(`Team pending invitations count: ${teamInvites.length}`);
  if (teamInvites.length === 0) {
    throw new Error('Invitation creation failed!');
  }
  console.log('✓ Invitation test passed!');

  // 8. Test Audit Logging (Section 16)
  console.log('\n8. Testing Team Audit Logs (Section 16)...');
  const auditLogs = await SupabaseService.getTeamAuditLogs(devTeam.id);
  console.log(`Dev Team has ${auditLogs.length} audit logs:`);
  auditLogs.slice(0, 3).forEach(l => console.log(`   - [${l.action}] by ${l.userId} (${l.result})`));
  if (auditLogs.length === 0) {
    throw new Error('Audit logs check failed!');
  }
  console.log('✓ Audit logging test passed!');

  // 9. Test Team-Based Automation Engine (Section 13, 14, 15, 16)
  console.log('\n9. Testing Team-Based Automation Engine (Section 13 & 14)...');
  const AutomationEngine = require('./src/services/automationEngine');
  const devTasks = await SupabaseService.getTasksByWorkflow(webWf.id);
  const devTaskWorkspace = devTasks.find(t => t.title === 'Development: Team Workspace');
  const testingTaskBefore = devTasks.find(t => t.title === 'Integration & Testing');

  console.log(`Before Automation: "${testingTaskBefore.title}" status = ${testingTaskBefore.status}`);

  // Ravi completes Development task
  const updatedT2 = await SupabaseService.updateTask('user_ravi', devTaskWorkspace.id, { status: 'COMPLETED' });
  await AutomationEngine.dispatchEvent('TASK_COMPLETED', {
    workflowId: webWf.id,
    task: updatedT2,
    user: { id: 'user_ravi', name: 'Ravi' },
  });

  const testingTaskAfter = await SupabaseService.getTaskById(testingTaskBefore.id);
  console.log(`After Automation: "${testingTaskAfter.title}" status = ${testingTaskAfter.status} (expected IN_PROGRESS)`);

  if (testingTaskAfter.status !== 'IN_PROGRESS') {
    throw new Error('Automation failed to activate downstream task!');
  }

  // Verify Team Activity recorded
  const devActivities = await SupabaseService.getTeamActivity(devTeam.id, 5);
  console.log(`Dev Team Recent Activity: "${devActivities[0]?.details || devActivities[0]?.action}"`);
  console.log('✓ Team-Based Automation Execution test passed!');

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND SUPABASE TEAM-BASED CAPABILITIES VALIDATED!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});

