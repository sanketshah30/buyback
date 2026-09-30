import { BuybackRequest, Partner, PartnerLocation } from '../types/domain';
import { readObjectBuffer } from './blobStorage.service';
import { notificationService } from './notification.service';

/**
 * Email communication module - the single place every customer/vendor-facing
 * email this app sends is templated, so callers (auth.service.ts,
 * routes/buyback.routes.ts) never hand-compose subject/body strings inline.
 * Built on top of `notificationService.sendEmail()`, which stays the
 * low-level mock transport (console.log for this MVP - swap for a real
 * provider like SES/SendGrid there without touching any of these
 * templates). Each function is a no-op if the required recipient email
 * isn't on file, rather than throwing - a missing email should never block
 * the underlying buyback action.
 */
export const emailService = {
  async sendOtpEmail(email: string, otp: string, ttlMinutes: number): Promise<void> {
    await notificationService.sendEmail(
      email,
      'Your buyback confirmation OTP',
      `Your one-time code to confirm your buyback is ${otp}. It expires in ${ttlMinutes} minute(s). Do not share this code with anyone.`,
    );
  },

  async sendBuybackCompletedEmail(
    request: BuybackRequest,
    receiptPathname?: string,
    partnerLocation?: PartnerLocation,
  ): Promise<void> {
    const email = request.customer?.email;
    if (!email) return;
    const value = request.finalValue ?? request.maxValue;
    const reference = request.referenceId ?? `#${request.id}`;

    let attachments: { filename: string; content: Buffer }[] | undefined;
    if (receiptPathname) {
      try {
        const { buffer } = await readObjectBuffer(receiptPathname);
        attachments = [{ filename: `buyback-receipt-${reference}.pdf`, content: buffer }];
      } catch {
        attachments = undefined;
      }
    }

    await notificationService.sendEmail(
      email,
      `Your buyback ${reference} is complete`,
      `Good news - your buyback request ${reference} has been completed` +
        (value !== undefined ? ` for a final value of \u20b9${value}.` : '.') +
        (attachments
          ? ' Thank you for trading in with us! Your purchase receipt is attached for your records.'
          : ' Thank you for trading in with us!'),
      {
        cc: partnerLocation?.email,
        attachments,
      },
    );
  },

  async sendVendorAllocationEmail(vendor: Partner, request: BuybackRequest): Promise<void> {
    if (!vendor.email) return;
    const reference = request.referenceId ?? `#${request.id}`;
    await notificationService.sendEmail(
      vendor.email,
      `Device allocated to you - buyback ${reference}`,
      `A device from buyback request ${reference} has been allocated to you` +
        (request.vendorPayable !== undefined ? ` at a payable amount of \u20b9${request.vendorPayable}.` : '.') +
        ' Please complete payment so the device can be delivered to you.',
    );
  },

  async sendBuybackCancelledEmail(request: BuybackRequest): Promise<void> {
    const email = request.customer?.email;
    if (!email) return;
    const reference = request.referenceId ?? `#${request.id}`;
    await notificationService.sendEmail(
      email,
      `Your buyback ${reference} has been cancelled`,
      `Your buyback request ${reference} has been cancelled. If you believe this is a mistake, please contact support.`,
    );
  },
};
