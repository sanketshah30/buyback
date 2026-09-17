import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import {
  otpRepository,
  partnerLocationRepository,
  roleRepository,
  sessionRepository,
  userRepository,
  userRoleRepository,
} from '../repositories';
import { OtpChallenge, Role } from '../types/domain';
import { nextId } from '../utils/idGenerator';
import { signToken } from '../utils/jwt';
import { notificationService } from './notification.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

async function getActiveRoles(userId: number): Promise<Role[]> {
  const assignments = await userRoleRepository.listByUser(userId);
  const roles = await Promise.all(assignments.map((a) => roleRepository.findById(a.roleId)));
  return roles.filter((r): r is Role => Boolean(r && r.isActive));
}

export const authService = {
  /**
   * Login is whitelist-only: unlike a plain customer-facing app, every staff
   * member who processes a buyback must already exist as a `User` (see
   * data/user.seed.ts) with at least one active role - there's no
   * self-signup on this path anymore. This check only applies to
   * `purpose === 'login'`; the buyback-confirmation OTP a *customer* gets
   * (an unrelated mobile number, never a `User` row) is unaffected.
   */
  async requestOtp(mobile: string, purpose: OtpChallenge['purpose'], buybackId?: number) {
    if (purpose === 'login') {
      const user = await userRepository.findByMobile(mobile);
      if (!user || !user.isActive) {
        throw Object.assign(new Error('This mobile number is not registered. Contact your administrator.'), { status: 403 });
      }
      const roles = await getActiveRoles(user.id);
      if (roles.length === 0) {
        throw Object.assign(new Error('This account has no role assigned. Contact your administrator.'), { status: 403 });
      }
    }

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
      // No auto-create here (see requestOtp) - the whitelist check already
      // guaranteed this user exists and has an active role.
      const user = await userRepository.findByMobile(challenge.mobile);
      if (!user) {
        throw Object.assign(new Error('This mobile number is not registered. Contact your administrator.'), { status: 403 });
      }

      const roles = await getActiveRoles(user.id);
      const partnerLocation = user.partnerLocationId !== undefined
        ? await partnerLocationRepository.findById(user.partnerLocationId)
        : undefined;

      const token = signToken({ userId: user.id, mobile: user.mobile });
      const now = new Date().toISOString();
      await sessionRepository.create({
        id: nextId('sessions'),
        userId: user.id,
        token,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        isActive: true,
      });

      return {
        purpose: challenge.purpose,
        token,
        user,
        partnerId: partnerLocation?.partnerId ?? null,
        partnerLocationId: user.partnerLocationId ?? null,
        roles,
      } as const;
    }

    return { purpose: challenge.purpose, buybackId: challenge.buybackId } as const;
  },

  /** Revokes the session tied to this token, so a validly-signed JWT is rejected by `requireAuth` from this point on. */
  async logout(token: string): Promise<void> {
    await sessionRepository.revoke(token);
  },

  /**
   * Used by `requireAuth`: a JWT can be cryptographically valid yet belong to
   * a session that's been revoked (logout) or has since expired - something
   * a bare stateless JWT has no way to express on its own.
   */
  async isSessionActive(token: string): Promise<boolean> {
    const session = await sessionRepository.findByToken(token);
    if (!session) return false;
    if (session.revokedAt) return false;
    if (new Date(session.expiresAt).getTime() < Date.now()) return false;
    return true;
  },
};
