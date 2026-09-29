export interface EmailAttachment {
  filename: string;
  /** Absolute path on local disk to the file to attach - e.g. the generated purchase-receipt PDF (see services/receipt.service.ts). */
  path: string;
}

export interface SendEmailOptions {
  /** Secondary recipient(s) - e.g. the partner location gets cc'd the customer's purchase-receipt email. */
  cc?: string;
  attachments?: EmailAttachment[];
}

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

  async sendEmail(email: string, subject: string, message: string, options?: SendEmailOptions): Promise<void> {
    const ccSuffix = options?.cc ? ` (cc: ${options.cc})` : '';
    const attachmentSuffix = options?.attachments?.length
      ? ` [attached: ${options.attachments.map((a) => a.filename).join(', ')}]`
      : '';
    // eslint-disable-next-line no-console
    console.log(`[mock-email] -> ${email}${ccSuffix} [${subject}]: ${message}${attachmentSuffix}`);
  },
};
