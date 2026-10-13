require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const SupabaseService = require('../services/supabaseService');

async function seed() {
  console.log('\x1b[36m%s\x1b[0m', '🌱 Starting FlowForge V2 Database Seeding...');
  
  const status = await SupabaseService.checkConnection();
  console.log('Supabase Connection Status:', status);

  try {
    const result = await SupabaseService.seedV2SoftwareProjectScenario();
    console.log('\x1b[32m%s\x1b[0m', '✓ Seeded Software Project Workflow successfully!');
    console.log(`Workflow ID: ${result.workflow.id} (${result.workflow.name})`);
    console.log(`Users created: ${result.users.map(u => u.name).join(', ')}`);
    console.log(`Tasks created: ${result.tasks.map(t => `${t.title} [${t.status}]`).join(', ')}`);
    console.log('\x1b[35m%s\x1b[0m', '✨ Database seeding completed successfully.');
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Seeding failed:', err);
  }
}

seed();
