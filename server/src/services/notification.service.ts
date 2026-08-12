/**
 * Mock notification gateway. Replace with a real SMS provider (e.g. Twilio,
 * MSG91) and email provider (e.g. SES, SendGrid) integration for production.
 * For the MVP we just log to the server console so the flow can be tested
 * end-to-end without external credentials.
 */
export const notificationService = {
  async sendSms(mobile: string, message: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[mock-sms] -> ${mobile}: ${message}`);
  },

  async sendEmail(email: string, subject: string, message: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[mock-email] -> ${email} [${subject}]: ${message}`);
  },
};
