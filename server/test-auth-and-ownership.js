/**
 * Test Suite: Auth, Individual Workflow Ownership, Roles, Invitations & Anti-IDOR
 */
const http = require('http');

function request(options, data = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    if (data) {
      headers['Content-Type'] = 'application/json';
    }
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        ...options,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (e) {
            json = body;
          }
          const setCookies = res.headers['set-cookie'];
          resolve({ status: res.statusCode, headers: res.headers, cookies: setCookies, data: json });
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function parseSessionCookie(setCookies) {
  if (!setCookies) return null;
  const cookieStr = Array.isArray(setCookies) ? setCookies[0] : setCookies;
  const match = cookieStr.match(/flowforge_session=([^;]+)/);
  return match ? match[1] : null;
}

async function runTests() {
  console.log('🧪 Starting FlowForge Complete Auth & Ownership Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request({ path: '/api/health', method: 'GET' });
    assert(health.status === 200 && health.data.status === 'ok', 'API Health check returns 200 OK');

    // 2. Register fresh User A (Test User Hemmanth-New)
    const testUsername = `tester_${Date.now().toString().slice(-6)}`;
    const testEmail = `${testUsername}@example.com`;

    const regRes = await request(
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Hemmanth Kumar',
        username: testUsername,
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }
    );
    assert(regRes.status === 201 && regRes.data.success, 'Registration succeeds with 201 Created');
    assert(regRes.data.user && !regRes.data.user.passwordHash, 'Password hash is NEVER returned in response');
    const userA = regRes.data.user;
    const cookieA = regRes.cookies ? regRes.cookies.join('; ') : `flowforge_session=${regRes.data.token}`;
    const tokenA = regRes.data.token;

    // 3. Duplicate email prevention
    const dupEmailRes = await request(
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Duplicate Guy',
        username: `diff_${testUsername}`,
        email: testEmail, // same email
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }
    );
    assert(dupEmailRes.status === 400 && !dupEmailRes.data.success, 'Duplicate email registration rejected');

    // 4. Duplicate username prevention
    const dupUsernameRes = await request(
      { path: '/api/auth/register', method: 'POST' },
      {
        name: 'Duplicate Guy',
        username: testUsername, // same username
        email: `other_${testEmail}`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }
    );
    assert(dupUsernameRes.status === 400 && !dupUsernameRes.data.success, 'Duplicate username registration rejected');

    // 5. Test Login with email
    const loginRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      {
        identifier: testEmail,
        password: 'Password123!',
      }
    );
    assert(loginRes.status === 200 && loginRes.data.success, 'Login with email succeeds');

    // 6. Test Login with username
    const loginUserRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      {
        identifier: testUsername,
        password: 'Password123!',
      }
    );
    assert(loginUserRes.status === 200 && loginUserRes.data.success, 'Login with username succeeds');

    // 7. Test Login with invalid password
    const badLoginRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      {
        identifier: testEmail,
        password: 'WrongPassword!',
      }
    );
    assert(badLoginRes.status === 401 && !badLoginRes.data.success, 'Invalid password rejected with 401');

    // 8. Session validation /api/auth/me using Bearer token
    const meRes = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(meRes.status === 200 && meRes.data.user.id === userA.id, '/api/auth/me identifies authenticated user');

    // 9. Session validation using HTTP-only cookie
    const meCookieRes = await request({ path: '/api/auth/me', method: 'GET' }, null, cookieA);
    assert(meCookieRes.status === 200 && meCookieRes.data.user.id === userA.id, '/api/auth/me works with HTTP-only cookie');

    // 10. User directory search (/api/users/search?q=)
    const searchRes = await request({
      path: '/api/users/search?q=priya',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(searchRes.status === 200 && searchRes.data.success, 'User directory search succeeds');
    const priyaUser = searchRes.data.data.find((u) => u.username === 'priya' || u.email.includes('priya'));
    assert(!!priyaUser, 'Found Priya in registered users directory');

    // 11. Hemmanth creates a personal workflow: "GDG On Campus CIT Hackathon"
    const wfRes = await request(
      {
        path: '/api/workflows',
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        name: 'GDG On Campus CIT Hackathon',
        description: 'Complete hackathon planning and execution pipeline',
        status: 'ACTIVE',
      }
    );
    assert(wfRes.status === 201 && wfRes.data.success, 'User A created personal workflow successfully');
    const hackathonWf = wfRes.data.data;
    assert(hackathonWf.ownerId === userA.id, 'Workflow ownerId matches authenticated User A');

    // 12. Create tasks in Hackathon workflow
    const task1Res = await request(
      {
        path: `/api/workflows/${hackathonWf.id}/tasks`,
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        title: 'Participant Management',
        description: 'Review applicants and send confirmation passes',
        priority: 'HIGH',
        status: 'TODO',
        assignedTo: 'user_ravi',
      }
    );
    assert(task1Res.status === 201 && task1Res.data.success, 'Created task in workflow');
    const task1 = task1Res.data.data;

    // 13. Invite Priya as MANAGER to the workflow
    const invitePriyaRes = await request(
      {
        path: '/api/invitations',
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
      },
      {
        type: 'WORKFLOW',
        resourceId: hackathonWf.id,
        role: 'MANAGER',
        recipientIdentifier: 'priya',
      }
    );
    assert(invitePriyaRes.status === 201 && invitePriyaRes.data.success, 'Invited Priya as MANAGER');
    const priyaInvite = invitePriyaRes.data.data;

    // 14. Log in as Priya (user_priya)
    const priyaLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      {
        identifier: 'priya',
        password: 'Password123!',
      }
    );
    assert(priyaLogin.status === 200 && priyaLogin.data.success, 'Logged in as Priya');
    const priyaToken = priyaLogin.data.token;

    // 15. Priya checks received invitations
    const priyaInvs = await request({
      path: '/api/invitations/received',
      method: 'GET',
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(priyaInvs.status === 200 && priyaInvs.data.data.length > 0, 'Priya received invitation');

    // 16. Priya accepts invitation
    const acceptRes = await request({
      path: `/api/invitations/${priyaInvite.id}/accept`,
      method: 'POST',
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(acceptRes.status === 200 && acceptRes.data.success, 'Priya accepted workflow invitation');

    // 17. Priya views shared workflows
    const priyaSharedWfs = await request({
      path: '/api/workflows?filter=shared',
      method: 'GET',
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(
      priyaSharedWfs.status === 200 &&
        priyaSharedWfs.data.data.some((w) => w.id === hackathonWf.id && w.userRole === 'MANAGER'),
      'Hackathon workflow appears in Priya Shared Workflows with MANAGER role'
    );

    // 18. Priya can manage tasks (create/edit tasks as Manager)
    const priyaTaskRes = await request(
      {
        path: `/api/workflows/${hackathonWf.id}/tasks`,
        method: 'POST',
        headers: { Authorization: `Bearer ${priyaToken}` },
      },
      {
        title: 'Venue Preparation',
        description: 'Arrange projectors, power strips, and badges',
        priority: 'MEDIUM',
        status: 'TODO',
      }
    );
    assert(priyaTaskRes.status === 201 && priyaTaskRes.data.success, 'Priya (Manager) can create workflow tasks');

    // 19. Priya CANNOT delete the workflow (Manager cannot delete owner workflow)
    const priyaDeleteRes = await request({
      path: `/api/workflows/${hackathonWf.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert(priyaDeleteRes.status === 403, 'Manager forbidden from deleting owner workflow');

    // 20. Log in as Kumar (User D)
    const kumarLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      {
        identifier: 'kumar',
        password: 'Password123!',
      }
    );
    assert(kumarLogin.status === 200 && kumarLogin.data.success, 'Logged in as Kumar');
    const kumarToken = kumarLogin.data.token;

    // 21. Kumar creates his own private workflow
    const kumarWfRes = await request(
      {
        path: '/api/workflows',
        method: 'POST',
        headers: { Authorization: `Bearer ${kumarToken}` },
      },
      {
        name: 'Kumar Solo Workflow',
        description: 'Completely private tasks',
        status: 'ACTIVE',
      }
    );
    assert(kumarWfRes.status === 201 && kumarWfRes.data.success, 'Kumar created his own private workflow');
    const kumarWf = kumarWfRes.data.data;

    // 22. IDOR Protection: Kumar CANNOT access Hemmanth Hackathon Workflow!
    const kumarIdorRes = await request({
      path: `/api/workflows/${hackathonWf.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${kumarToken}` },
    });
    assert(kumarIdorRes.status === 403, 'Anti-IDOR: Kumar forbidden from accessing Hemmanth private workflow');

    // 23. Kumar workflow list only contains his own workflows, not Hemmanth's!
    const kumarWfList = await request({
      path: '/api/workflows?filter=owned',
      method: 'GET',
      headers: { Authorization: `Bearer ${kumarToken}` },
    });
    const hasHemmanthWf = kumarWfList.data.data.some((w) => w.id === hackathonWf.id);
    assert(!hasHemmanthWf, 'Cross-user data isolation: Kumar cannot see Hemmanth private workflows in owned list');

    // 24. Hemmanth duplicates workflow
    const dupWfRes = await request({
      path: `/api/workflows/${hackathonWf.id}/duplicate`,
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupWfRes.status === 201 && dupWfRes.data.success, 'Workflow duplication works');

    // 25. Notifications API
    const notifsRes = await request({
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(notifsRes.status === 200 && notifsRes.data.success, 'Notifications retrieved successfully');

    // 26. Logout
    const logoutRes = await request({
      path: '/api/auth/logout',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(logoutRes.status === 200 && logoutRes.data.success, 'Logout successfully invalidates session');

    // 27. Token is now invalid after logout
    const postLogoutMe = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(postLogoutMe.status === 401, 'Logged out session rejected with 401 Unauthorized');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`Results: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
