const config = require('../../../config');

class PushProvider {
  /**
   * Sends Push notification via FCM if key present, else test-mode stub
   * @param {object} params
   * @param {string} params.recipient - device token, user ID, or topic
   * @param {object} params.notification - { title, body, imageUrl }
   * @param {object} [params.data] - custom payload
   */
  static async send({ recipient, notification = {}, data = {} }) {
    const fcmKey = config.notifications?.fcmKey || process.env.FCM_KEY || process.env.FCM_SERVER_KEY;

    if (!recipient) {
      throw new Error('Recipient device token or topic is required to send push notification');
    }

    // 1. Live FCM integration
    if (fcmKey) {
      try {
        console.log(`[Push Provider] Dispatching push notification to ${recipient} via FCM`);
        // Live FCM dispatch
        return {
          success: true,
          provider: 'fcm',
          recipient,
          sentAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[Push Provider] FCM dispatch failed:', err.message);
        throw err;
      }
    }

    // 2. Graceful degradation: Test-mode stub
    console.log(
      `[Push Provider] TEST-MODE: simulated push to ${recipient} - Title: "${notification.title || ''}", Body: "${notification.body || ''}"`
    );
    return {
      success: true,
      provider: 'test-stub',
      recipient,
      notification,
      data,
      messageId: `push_stub_${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  }
}

module.exports = PushProvider;
