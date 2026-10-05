class NotificationsService {
  static async sendNotification({ userId, title, body, channel = 'IN_APP' }) {
    // TODO: Connect to DB notifications table & push notification service
    return {
      id: `NOTIF-${Date.now()}`,
      userId,
      title,
      body,
      channel,
      isRead: false,
      sentAt: new Date().toISOString(),
    };
  }

  static async listUserNotifications(userId) {
    // TODO: Connect to DB notifications table
    return [
      {
        id: 'notif-1',
        title: 'Order Placed Successfully',
        body: 'Your hyperlocal food order has been placed.',
        isRead: false,
        sentAt: new Date().toISOString(),
      },
    ];
  }

  static async markAsRead(notificationId) {
    // TODO: Update notification is_read = true
    return {
      notificationId,
      isRead: true,
      updatedAt: new Date().toISOString(),
    };
  }
}

module.exports = NotificationsService;
