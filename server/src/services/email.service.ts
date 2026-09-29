import { BuybackRequest, Partner } from '../types/domain';
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
 *
 * The four communications this module covers (see server/README.md "Email
 * communication module"):
 *   1. sendOtpEmail            - customer buyback-confirmation OTP
 *   2. sendBuybackCompletedEmail - customer, once /confirm completes the buyback
 *   3. sendVendorAllocationEmail  - allocated vendor, once /confirm completes the buyback
 *   4. sendBuybackCancelledEmail  - customer, once /cancel cancels the buyback
 */
export const emailService = {
  /**
   * Always carries the *real* OTP code, independent of
   * `MOCK_OTP_EXPOSE_IN_RESPONSE` - that env flag only controls whether the
   * HTTP response body echoes the code back (a dev/testing convenience);
   * it must never affect what's actually delivered to the customer. Called
   * from auth.service.ts's requestOtp() for every buyback-confirmation OTP
   * request/resend, so the customer always gets it by email in addition to
   * SMS, regardless of resend channel.
   */
  async sendOtpEmail(email: string, otp: string, ttlMinutes: number): Promise<void> {
    await notificationService.sendEmail(
      email,
      'Your buyback confirmation OTP',
      `Your one-time code to confirm your buyback is ${otp}. It expires in ${ttlMinutes} minute(s). Do not share this code with anyone.`,
    );
  },

  /** Sent to the customer once POST /api/buyback/:id/confirm advances requestStatusId to "Completed". */
  async sendBuybackCompletedEmail(request: BuybackRequest): Promise<void> {
    const email = request.customer?.email;
    if (!email) return;
    const value = request.finalValue ?? request.maxValue;
    const reference = request.referenceId ?? `#${request.id}`;
    await notificationService.sendEmail(
      email,
      `Your buyback ${reference} is complete`,
      `Good news - your buyback request ${reference} has been completed` +
        (value !== undefined ? ` for a final value of \u20b9${value}.` : '.') +
        ' Thank you for trading in with us!',
    );
  },

  /**
   * Sent to the allocated vendor once the buyback completes - not at
   * allocation time - since that's when the vendor actually owes payment
   * before the device is delivered to them (see buybackEngine.service.ts's
   * allocate phase for how `vendor`/`vendorPayable` were determined).
   */
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

  /** Sent to the customer once POST /api/buyback/:id/cancel advances requestStatusId to "Cancelled". */
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
