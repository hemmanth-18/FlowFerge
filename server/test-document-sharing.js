const SupabaseService = require('./src/services/supabaseService');

async function runDocumentSharingTests() {
  console.log('================================================================');
  console.log('🚀 TESTING FLOWFORGE SECURE WORKFLOW DOCUMENT SHARING & PRIVACY');
  console.log('================================================================\n');

  // 1. Seed or retrieve test environment
  console.log('1. Setting up multi-team environment and test accounts...');
  const { devTeam } = await SupabaseService.seedMultiTeamScenario();
  const workflows = await SupabaseService.getWorkflowsByTeam(devTeam.id, 'user_arun');
  const webWf = workflows.find((w) => w.name === 'Website Development') || workflows[0];
  console.log(`✓ Active Team: ${devTeam.name} (${devTeam.id})`);
  console.log(`✓ Target Workflow: ${webWf.name} (${webWf.id})`);

  // Add Kumar as workflow member so we can test multiple recipients within workflow
  await SupabaseService.addWorkflowMember(webWf.id, 'user_kumar', 'MEMBER');

  // Verify roles in workflow
  const arunRole = await SupabaseService.getWorkflowMemberRole(webWf.id, 'user_arun'); // Owner / Admin
  const raviRole = await SupabaseService.getWorkflowMemberRole(webWf.id, 'user_ravi'); // Member
  const kumarRole = await SupabaseService.getWorkflowMemberRole(webWf.id, 'user_kumar'); // Member
  console.log(`   - Arun: ${arunRole}`);
  console.log(`   - Ravi: ${raviRole}`);
  console.log(`   - Kumar: ${kumarRole}`);

  // Create valid PDF buffer with magic bytes %PDF-1.4
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  const validDocxBuffer = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('mock docx content')]);

  // 2. Test Private Document Delivery to Specific Member (Ravi)
  console.log('\n2. Testing Private Document Delivery to Ravi...');
  const privateDoc = await SupabaseService.saveWorkflowDocument({
    workflowId: webWf.id,
    file: {
      originalname: 'confidential_compensation_plan.pdf',
      buffer: validPdfBuffer,
      size: validPdfBuffer.length,
      mimetype: 'application/pdf',
    },
    uploadedBy: 'user_arun',
    description: 'Q4 executive compensation review strictly for Ravi.',
    recipientIds: ['user_ravi'], // Specified recipient
  });

  console.log(`✓ Document uploaded with ID: ${privateDoc.id}`);
  console.log(`✓ Automatic Visibility: ${privateDoc.visibility} (isPrivate: ${privateDoc.isPrivate})`);
  console.log(`✓ Visibility Label for Sender: "${privateDoc.visibilityLabel}"`);

  if (privateDoc.visibility !== 'PRIVATE' || !privateDoc.isPrivate) {
    throw new Error('FAILED: Document with recipients was not automatically marked as PRIVATE!');
  }
  if (!privateDoc.visibilityLabel.includes('Private — ravi')) {
    throw new Error(`FAILED: Visibility label expected to contain "Private — ravi", got "${privateDoc.visibilityLabel}"`);
  }

  // 3. Test Recipient Access (Ravi)
  console.log('\n3. Testing Recipient (Ravi) access and view...');
  const raviDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_ravi');
  const raviDoc = raviDocs.find((d) => d.id === privateDoc.id);

  if (!raviDoc) {
    throw new Error('FAILED: Intended recipient (Ravi) cannot see the private document in workflow list!');
  }
  console.log(`✓ Ravi can see document: "${raviDoc.fileName}"`);
  console.log(`✓ Ravi visibility label: "${raviDoc.visibilityLabel}"`);
  console.log(`✓ Ravi recipients view count: ${raviDoc.recipients.length} (must be 1 to conceal other recipients)`);

  if (raviDoc.recipients.length !== 1 || raviDoc.recipients[0].id !== 'user_ravi') {
    throw new Error('FAILED: Recipient privacy leak! Ravi should only see his own delivery record.');
  }

  // Ravi tests download
  const raviDownload = await SupabaseService.getDocumentDownloadUrl(privateDoc.id, 'user_ravi');
  if (!raviDownload.doc) {
    throw new Error('FAILED: Ravi cannot download private document!');
  }
  console.log('✓ Ravi successfully generated download metadata/URL.');

  // 4. Test Isolation from other ordinary workflow members (Kumar)
  console.log('\n4. Testing Isolation: Kumar (ordinary member of same workflow)...');
  const kumarDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_kumar');
  const kumarLeakedDoc = kumarDocs.find((d) => d.id === privateDoc.id);

  if (kumarLeakedDoc) {
    throw new Error('FAILED: SECURITY LEAK! Kumar can see private document intended only for Ravi!');
  }
  console.log('✓ Kumar workflow document list strictly excludes private document (Zero leak).');

  // Kumar tries direct download of private document ID
  let kumarDownloadBlocked = false;
  try {
    await SupabaseService.getDocumentDownloadUrl(privateDoc.id, 'user_kumar');
  } catch (err) {
    kumarDownloadBlocked = true;
    console.log(`✓ Direct access blocked for Kumar with error: "${err.message}"`);
  }

  if (!kumarDownloadBlocked) {
    throw new Error('FAILED: SECURITY LEAK! Kumar was able to download private document via ID manipulation!');
  }

  // 5. Test Multiple Recipients Confidentiality
  console.log('\n5. Testing Multiple Recipients Confidentiality...');
  const multiRecDoc = await SupabaseService.saveWorkflowDocument({
    workflowId: webWf.id,
    file: {
      originalname: 'performance_bonus_matrix.docx',
      buffer: validDocxBuffer,
      size: validDocxBuffer.length,
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    uploadedBy: 'user_arun',
    description: 'Confidential performance matrix.',
    recipientIds: ['user_ravi', 'user_kumar'], // Sent to both
  });

  console.log(`✓ Multi-recipient doc label for Sender (Arun): "${multiRecDoc.visibilityLabel}"`);
  if (!multiRecDoc.visibilityLabel.includes('+ 1')) {
    throw new Error(`FAILED: Multi-recipient label expected "+ 1", got "${multiRecDoc.visibilityLabel}"`);
  }

  // Check what Ravi sees vs Kumar
  const raviMultiDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_ravi');
  const raviView = raviMultiDocs.find((d) => d.id === multiRecDoc.id);
  console.log(`✓ Ravi view of multi-recipient doc: label = "${raviView.visibilityLabel}", recipients = ${JSON.stringify(raviView.recipients)}`);

  if (raviView.recipients.length !== 1 || raviView.recipients[0].id !== 'user_ravi') {
    throw new Error('FAILED: Co-recipient leak! Ravi must not see that Kumar also received the file.');
  }

  const kumarMultiDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_kumar');
  const kumarView = kumarMultiDocs.find((d) => d.id === multiRecDoc.id);
  console.log(`✓ Kumar view of multi-recipient doc: label = "${kumarView.visibilityLabel}", recipients = ${JSON.stringify(kumarView.recipients)}`);

  if (kumarView.recipients.length !== 1 || kumarView.recipients[0].id !== 'user_kumar') {
    throw new Error('FAILED: Co-recipient leak! Kumar must not see that Ravi also received the file.');
  }

  // 6. Test Public Workflow Document Sharing
  console.log('\n6. Testing Public Workflow Document Sharing...');
  const publicDoc = await SupabaseService.saveWorkflowDocument({
    workflowId: webWf.id,
    file: {
      originalname: 'project_architecture_spec.pdf',
      buffer: validPdfBuffer,
      size: validPdfBuffer.length,
      mimetype: 'application/pdf',
    },
    uploadedBy: 'user_arun',
    description: 'Shared technical specifications for all members.',
    shareWithEntireWorkflow: true,
  });

  console.log(`✓ Public doc created: "${publicDoc.fileName}", visibility = "${publicDoc.visibility}", label = "${publicDoc.visibilityLabel}"`);
  if (publicDoc.visibility !== 'PUBLIC' || publicDoc.visibilityLabel !== 'Public') {
    throw new Error('FAILED: Public workflow document label must be "Public"!');
  }

  // Verify all members can access public doc
  const raviPubDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_ravi');
  const kumarPubDocs = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_kumar');

  if (!raviPubDocs.some((d) => d.id === publicDoc.id) || !kumarPubDocs.some((d) => d.id === publicDoc.id)) {
    throw new Error('FAILED: Public document not visible to all authorized workflow members!');
  }
  console.log('✓ Public document is visible to both Ravi and Kumar.');

  // 7. Test User Outside Workflow Boundary
  console.log('\n7. Testing User Outside Workflow Boundary...');
  let outsideBlocked = false;
  try {
    await SupabaseService.getDocumentDownloadUrl(publicDoc.id, 'user_nonexistent_outsider');
  } catch (err) {
    outsideBlocked = true;
    console.log(`✓ Outside user access blocked: "${err.message}"`);
  }

  if (!outsideBlocked) {
    throw new Error('FAILED: User outside workflow accessed workflow document!');
  }

  // 8. Test Manager sending private document & Admin oversight & Notifications
  console.log('\n8. Testing Manager sending private document, Admin oversight, and Detailed Notifications...');
  // Promote Ravi to Workflow Manager in Website Development
  await SupabaseService.updateWorkflowMemberRole(webWf.id, 'user_ravi', 'MANAGER');
  const raviWfRole = await SupabaseService.getWorkflowMemberRole(webWf.id, 'user_ravi');
  console.log(`✓ Ravi role updated to: ${raviWfRole}`);

  // Manager (Ravi) sends private document to Member (Kumar)
  const managerDoc = await SupabaseService.saveWorkflowDocument({
    workflowId: webWf.id,
    file: {
      originalname: 'manager_private_brief.pdf',
      buffer: validPdfBuffer,
      size: validPdfBuffer.length,
      mimetype: 'application/pdf',
    },
    uploadedBy: 'user_ravi', // Manager
    recipientIds: ['user_kumar'], // Member
    description: 'Confidential project brief from Manager Ravi to Kumar.',
  });

  console.log(`✓ Manager (Ravi) sent private document: ${managerDoc.id} (${managerDoc.visibilityLabel})`);
  if (!managerDoc.visibilityLabel.includes('Private — kumar')) {
    throw new Error('FAILED: Manager private doc label mismatch!');
  }

  // Admin (Arun) can view and download the manager's private document
  const adminDocList = await SupabaseService.getWorkflowDocuments(webWf.id, 'user_arun');
  const adminFoundDoc = adminDocList.find((d) => d.id === managerDoc.id);
  if (!adminFoundDoc) {
    throw new Error('FAILED: Administrator cannot view private document sent by manager!');
  }
  console.log(`✓ Admin (Arun) successfully discovered manager private document: "${adminFoundDoc.fileName}"`);

  const adminDownload = await SupabaseService.getDocumentDownloadUrl(managerDoc.id, 'user_arun');
  if (!adminDownload.doc) {
    throw new Error('FAILED: Administrator cannot download private document sent by manager!');
  }
  console.log('✓ Admin (Arun) successfully downloaded manager private document with audit tracking.');

  // Verify Kumar's notification contains: Sender Name, Sender Role, Team Name, Workflow Name
  const kumarNotifs = await SupabaseService.getUserNotifications('user_kumar');
  const receivedNotif = kumarNotifs.find((n) => n.data?.documentId === managerDoc.id);
  if (!receivedNotif) {
    throw new Error('FAILED: Recipient (Kumar) did not receive in-app notification for private document!');
  }

  console.log(`✓ Recipient notification title: "${receivedNotif.title}"`);
  console.log(`✓ Recipient notification message: "${receivedNotif.message}"`);

  if (!receivedNotif.message.includes('Ravi')) {
    throw new Error('FAILED: Notification message does not contain sender name (Ravi)!');
  }
  if (!receivedNotif.message.includes('Manager')) {
    throw new Error('FAILED: Notification message does not contain sender role (Manager)!');
  }
  if (!receivedNotif.message.includes(devTeam.name)) {
    throw new Error(`FAILED: Notification message does not contain team name (${devTeam.name})!`);
  }
  if (!receivedNotif.message.includes(webWf.name)) {
    throw new Error(`FAILED: Notification message does not contain workflow name (${webWf.name})!`);
  }
  console.log('✓ All notification details verified: sender name, sender role, team name, and workflow name!');

  // 9. Test Invalid File Rejection (Security validation)
  console.log('\n9. Testing File Header & Extension Security Validation...');
  let fakePdfRejected = false;
  try {
    await SupabaseService.saveWorkflowDocument({
      workflowId: webWf.id,
      file: {
        originalname: 'malicious.pdf',
        buffer: Buffer.from('NOT A PDF FILE HEADER AT ALL'),
        size: 28,
        mimetype: 'application/pdf',
      },
      uploadedBy: 'user_arun',
      recipientIds: ['user_ravi'],
    });
  } catch (err) {
    fakePdfRejected = true;
    console.log(`✓ Corrupted/spoofed PDF header rejected: "${err.message}"`);
  }

  if (!fakePdfRejected) {
    throw new Error('FAILED: Corrupted PDF file was not rejected by magic bytes verification!');
  }

  let disallowedExtRejected = false;
  try {
    await SupabaseService.saveWorkflowDocument({
      workflowId: webWf.id,
      file: {
        originalname: 'script.exe',
        buffer: Buffer.from('MZ...'),
        size: 100,
        mimetype: 'application/octet-stream',
      },
      uploadedBy: 'user_arun',
      recipientIds: ['user_ravi'],
    });
  } catch (err) {
    disallowedExtRejected = true;
    console.log(`✓ Disallowed file extension (.exe) rejected: "${err.message}"`);
  }

  if (!disallowedExtRejected) {
    throw new Error('FAILED: Disallowed file extension was not rejected!');
  }

  // 10. Test Document Deletion
  console.log('\n10. Testing Document Deletion & Cascade...');
  await SupabaseService.deleteWorkflowDocument(privateDoc.id, 'user_arun');
  let deletedAccessBlocked = false;
  try {
    await SupabaseService.getDocumentDownloadUrl(privateDoc.id, 'user_ravi');
  } catch (err) {
    deletedAccessBlocked = true;
    console.log(`✓ Deleted document access blocked: "${err.message}"`);
  }

  if (!deletedAccessBlocked) {
    throw new Error('FAILED: Deleted document was still accessible!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 10 TEST SUITES PASSED FLAWLESSLY!');
  console.log('================================================================\n');
}

runDocumentSharingTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  });
