/**
 * Unit & Integration verification for Email Service and Team Invitations
 */
const mailService = require('./src/services/mailService');
const SupabaseService = require('./src/services/supabaseService');

async function runTests() {
  console.log('🧪 [TEST] Running FlowForge Mail & Team Invitation Test Suite...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // TEST 1: Mail service is safe when unconfigured
  console.log('--- Test 1: Unconfigured Mail Service Safety ---');
  assert(typeof mailService.isConfigured === 'function', 'mailService.isConfigured is a function');
  assert(typeof mailService.sendTeamInvitationEmail === 'function', 'sendTeamInvitationEmail is a function');

  // Verify graceful unconfigured response without throwing
  const unconfiguredResult = await mailService.sendTeamInvitationEmail({
    to: 'test.colleague@example.com',
    inviterName: 'Platform Admin',
    teamName: 'Engineering Workspace',
    role: 'TEAM_MEMBER',
    invitationUrl: 'https://flow-ferge.vercel.app/invite/tinv_test123',
  });

  assert(unconfiguredResult.success === false, 'Returns success: false when unconfigured');
  assert(unconfiguredResult.reason === 'unconfigured', 'Indicates reason: unconfigured');
  assert(typeof unconfiguredResult.message === 'string', 'Provides clear informational message');

  // TEST 2: Email validation prevents sending to empty recipient
  console.log('\n--- Test 2: Validation of Recipient Address ---');
  const emptyToResult = await mailService.sendTeamInvitationEmail({
    to: '',
    inviterName: 'Platform Admin',
    teamName: 'Engineering Workspace',
    role: 'TEAM_MEMBER',
    invitationUrl: 'https://flow-ferge.vercel.app/invite/tinv_test123',
  });
  assert(emptyToResult.success === false, 'Rejects empty recipient email');
  assert(emptyToResult.error.includes('Recipient email address is required'), 'Identifies missing recipient error');

  // TEST 3: Create team invitation in Supabase/Memory Store
  console.log('\n--- Test 3: Creation and Persistence of Team Invitation ---');
  // First seed memory store with a test team if needed
  const testUserId = 'test-inviter-uuid-001';
  let testTeam = null;
  try {
    testTeam = await SupabaseService.createTeam(testUserId, {
      name: 'Alpha Engineering',
      description: 'Test Team for Email Dispatch Verification',
      icon: 'Code',
    });
  } catch (e) {
    // Team may already exist or memory db used
  }

  const teams = await SupabaseService.getUserTeams(testUserId);
  const targetTeam = testTeam || teams[0];
  assert(Boolean(targetTeam?.id), `Found or created test team (${targetTeam?.name})`);

  const inviteResult = await SupabaseService.createTeamInvitation(
    targetTeam.id,
    { email: 'newdev@example.com', role: 'TEAM_MEMBER' },
    testUserId
  );

  assert(Boolean(inviteResult?.id), `Generated invitation ID: ${inviteResult?.id}`);
  assert(inviteResult.id.startsWith('tinv_'), 'Invitation ID starts with tinv_ prefix');
  assert(inviteResult.email === 'newdev@example.com', 'Invitation target email is stored');
  assert(inviteResult.status === 'PENDING', 'Initial status is PENDING');
  assert(Boolean(inviteResult.expiresAt), 'Invitation has expiration timestamp');

  // TEST 4: Fetch invitation by ID
  console.log('\n--- Test 4: Retrieve Invitation Details by Token ---');
  const fetched = await SupabaseService.getInvitationById(inviteResult.id);
  assert(Boolean(fetched), 'Successfully retrieved invitation by ID');
  assert(fetched?.type === 'TEAM', 'Type is identified as TEAM');
  assert(fetched?.resourceName === targetTeam.name, 'Resource name matches team name');
  assert(fetched?.isExpired === false, 'Invitation is not expired');

  // TEST 5: Acceptance Route simulation
  console.log('\n--- Test 5: Acceptance Journey ---');
  const acceptingUser = await SupabaseService.getUserByEmail('priya@example.com');
  if (acceptingUser) {
    const accepted = await SupabaseService.acceptTeamInvitation(inviteResult.id, acceptingUser.id);
    assert(Boolean(accepted), 'Successfully accepted team invitation');

    const acceptedFetch = await SupabaseService.getInvitationById(inviteResult.id);
    assert(acceptedFetch.status === 'ACCEPTED', 'Status updated to ACCEPTED');
  } else {
    console.log('  ⚠️ Skipping acceptance test: priya@example.com not found');
  }

  console.log(`\n========================================`);
  console.log(`🏁 Results: ${passed}/${total} assertions passed!`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
