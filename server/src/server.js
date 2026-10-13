const app = require('./app');
const SupabaseService = require('./services/supabaseService');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 FlowForge API Server running on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log('🗄️ Database: Supabase PostgreSQL (100% Pure)');
  console.log('--------------------------------------------------');

  try {
    await SupabaseService.seedDefaultData();
    console.log('✓ Default platform dataset verified and ready!');
  } catch (e) {
    console.error('Initial auto-seed check warning:', e.message);
  }
});

module.exports = app;
