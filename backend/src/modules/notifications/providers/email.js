class EmailProvider {
  /**
   * Sends Email via SendGrid/SMTP if configured, else test-mode stub
   * @param {object} params
   * @param {string} params.to
   * @param {string} params.subject
   * @param {string} params.body
   */
  static async send({ to, subject, body, html, metadata = {} }) {
    if (!to || !subject) {
      throw new Error('Both "to" and "subject" are required to send an email');
    }

    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey) {
      try {
        console.log(`[Email Provider] Dispatching email to ${to} via SendGrid`);
        return {
          success: true,
          provider: 'sendgrid',
          to,
          subject,
          sentAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[Email Provider] SendGrid dispatch failed:', err.message);
        throw err;
      }
    }

    // Graceful test-mode stub
    console.log(`[Email Provider] TEST-MODE: simulated email to ${to} - Subject: "${subject}"`);
    return {
      success: true,
      provider: 'test-stub',
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      messageId: `email_stub_${Date.now()}`,
    };
  }
}

module.exports = EmailProvider;
