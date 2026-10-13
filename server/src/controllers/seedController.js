const SupabaseService = require('../services/supabaseService');

const seedController = {
  // POST /api/seed (Initial seed dataset)
  async seedSampleData(req, res) {
    try {
      await SupabaseService.seedDefaultData();
      res.status(201).json({
        success: true,
        message: 'Successfully seeded platform dataset into Supabase!',
      });
    } catch (err) {
      console.error('[Seed Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to seed dataset' });
    }
  },

  // POST /api/seed/v2
  async seedV2Scenario(req, res) {
    try {
      await SupabaseService.seedDefaultData();
      res.status(201).json({
        success: true,
        message: 'Successfully seeded FlowForge Supabase scenario!',
      });
    } catch (err) {
      console.error('[Seed V2 Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to seed scenario' });
    }
  },
};

module.exports = seedController;
