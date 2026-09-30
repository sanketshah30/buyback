import { getSql } from '../../db/postgres';
import { OtpChallenge } from '../../types/domain';
import { OtpRepository } from '../interfaces';

export class PostgresOtpRepository implements OtpRepository {
  async create(challenge: OtpChallenge): Promise<OtpChallenge> {
    const sql = getSql();
    await sql`
      INSERT INTO otp_challenges (request_id, data)
      VALUES (${challenge.requestId}, ${sql.json(challenge as never)})
    `;
    return challenge;
  }

  async findById(requestId: string): Promise<OtpChallenge | undefined> {
    const sql = getSql();
    const rows = await sql<{ data: OtpChallenge }[]>`
      SELECT data FROM otp_challenges WHERE request_id = ${requestId}
    `;
    return rows[0]?.data;
  }

  async markVerified(requestId: string): Promise<void> {
    const challenge = await this.findById(requestId);
    if (!challenge) return;
    const updated = { ...challenge, verified: true };
    const sql = getSql();
    await sql`
      UPDATE otp_challenges
      SET data = ${sql.json(updated as never)}
      WHERE request_id = ${requestId}
    `;
  }

  async recordFailedAttempt(requestId: string): Promise<OtpChallenge | undefined> {
    const challenge = await this.findById(requestId);
    if (!challenge) return undefined;
    const updated = { ...challenge, attempts: challenge.attempts + 1 };
    const sql = getSql();
    await sql`
      UPDATE otp_challenges
      SET data = ${sql.json(updated as never)}
      WHERE request_id = ${requestId}
    `;
    return updated;
  }
}
