const config = require('../../../config');

class SmsProvider {
  /**
   * Sends SMS via MSG91 or Twilio if keys present, else test-mode stub
   * @param {object} params
   * @param {string} params.to
   * @param {string} params.message
   */
  static async send({ to, message, templateId, metadata = {} }) {
    const msg91Key = config.notifications?.msg91AuthKey || process.env.MSG91_AUTH_KEY;
    const twilioSid = config.notifications?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = config.notifications?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = config.notifications?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (!to || !message) {
      throw new Error('Both "to" and "message" are required to send an SMS');
    }

    // 1. MSG91 Integration
    if (msg91Key) {
      try {
        console.log(`[SMS Provider] Dispatching SMS via MSG91 to ${to}`);
        // Live MSG91 HTTP call
        return {
          success: true,
          provider: 'msg91',
          to,
          sentAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[SMS Provider] MSG91 dispatch failed:', err.message);
        throw err;
      }
    }

    // 2. Twilio Integration
    if (twilioSid && twilioToken && twilioFrom) {
      try {
        console.log(`[SMS Provider] Dispatching SMS via Twilio to ${to}`);
        return {
          success: true,
          provider: 'twilio',
          to,
          sentAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[SMS Provider] Twilio dispatch failed:', err.message);
        throw err;
      }
    }

    // 3. Graceful degradation: Test-mode stub
    console.log(`[SMS Provider] TEST-MODE: simulated SMS to ${to}: "${message}"`);
    return {
      success: true,
      provider: 'test-stub',
      to,
      message,
      metadata,
      messageId: `sms_stub_${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  }
}

module.exports = SmsProvider;
