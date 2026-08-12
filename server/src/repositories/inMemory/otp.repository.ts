import { OtpChallenge } from '../../types/domain';
import { OtpRepository } from '../interfaces';
import { tables } from './db';

export class InMemoryOtpRepository implements OtpRepository {
  async create(challenge: OtpChallenge): Promise<OtpChallenge> {
    tables.otpChallenges.set(challenge.requestId, challenge);
    return challenge;
  }

  async findById(requestId: string): Promise<OtpChallenge | undefined> {
    return tables.otpChallenges.get(requestId);
  }

  async markVerified(requestId: string): Promise<void> {
    const challenge = tables.otpChallenges.get(requestId);
    if (challenge) {
      challenge.verified = true;
      tables.otpChallenges.set(requestId, challenge);
    }
  }
}
