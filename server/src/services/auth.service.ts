import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { otpRepository, userRepository } from '../repositories';
import { OtpChallenge } from '../types/domain';
import { signToken } from '../utils/jwt';
import { notificationService } from './notification.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

export const authService = {
  async requestOtp(mobile: string, purpose: OtpChallenge['purpose'], buybackId?: number) {
    const requestId = uuid();
    const challenge: OtpChallenge = {
      requestId,
      mobile,
      code: env.mockOtpCode,
      purpose,
      buybackId,
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      verified: false,
      attempts: 0,
    };
    await otpRepository.create(challenge);
    await notificationService.sendSms(mobile, `Your buyback OTP is ${challenge.code}. Valid for 5 minutes.`);

    return {
      requestId,
      expiresAt: challenge.expiresAt,
      // Only exposed because there's no real SMS gateway in this MVP.
      devOtp: env.mockOtpExposeInResponse ? challenge.code : undefined,
    };
  },

  async verifyOtp(requestId: string, code: string) {
    const challenge = await otpRepository.findById(requestId);
    if (!challenge) {
      throw Object.assign(new Error('OTP request not found'), { status: 404 });
    }
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw Object.assign(new Error('OTP has expired'), { status: 410 });
    }
    if (challenge.verified) {
      throw Object.assign(new Error('OTP has already been used'), { status: 400 });
    }
    if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw Object.assign(new Error('Too many incorrect attempts - request a new OTP'), { status: 429 });
    }
    if (challenge.code !== code) {
      await otpRepository.recordFailedAttempt(requestId);
      throw Object.assign(new Error('Incorrect OTP'), { status: 400 });
    }

    await otpRepository.markVerified(requestId);

    if (challenge.purpose === 'login') {
      let user = await userRepository.findByMobile(challenge.mobile);
      if (!user) {
        user = await userRepository.create(challenge.mobile);
      }
      const token = signToken({ userId: user.id, mobile: user.mobile });
      return { purpose: challenge.purpose, token, user } as const;
    }

    return { purpose: challenge.purpose, buybackId: challenge.buybackId } as const;
  },
};
