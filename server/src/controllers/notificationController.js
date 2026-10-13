const SupabaseService = require('../services/supabaseService');

const notificationController = {
  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const notifs = await SupabaseService.getUserNotifications(userId);
      res.json({ success: true, data: notifs });
    } catch (err) {
      console.error('[Get Notifications Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  },

  // PATCH or PUT /api/notifications/:id/read
  async markRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await SupabaseService.markNotificationRead(id, userId);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      console.error('[Mark Read Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to mark notification read' });
    }
  },

  // PATCH or PUT /api/notifications/read-all
  async markAllRead(req, res) {
    try {
      const userId = req.user.id;
      await SupabaseService.markAllNotificationsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      console.error('[Mark All Read Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to mark all notifications read' });
    }
  },

  // DELETE /api/notifications/:id
  async deleteNotification(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await SupabaseService.deleteNotification(id, userId);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
      console.error('[Delete Notification Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
  },
};

module.exports = notificationController;
