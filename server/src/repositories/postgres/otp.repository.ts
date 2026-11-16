import { getSql } from '../../db/postgres';
import { OtpChallenge } from '../../types/domain';
import { OtpRepository } from '../interfaces';
import { SqlRow, toIso, toNum, toNumOrUndefined } from './helpers';

function fromRow(row: SqlRow): OtpChallenge {
  return {
    requestId: String(row.request_id),
    mobile: String(row.mobile),
    code: String(row.code),
    purpose: row.purpose as OtpChallenge['purpose'],
    buybackId: toNumOrUndefined(row.buyback_id),
    expiresAt: toIso(row.expires_at),
    verified: Boolean(row.verified),
    attempts: toNum(row.attempts),
  };
}

export class PostgresOtpRepository implements OtpRepository {
  async create(challenge: OtpChallenge): Promise<OtpChallenge> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      INSERT INTO otp_challenges (request_id, mobile, code, purpose, buyback_id, expires_at, verified, attempts)
      VALUES (
        ${challenge.requestId},
        ${challenge.mobile},
        ${challenge.code},
        ${challenge.purpose},
        ${challenge.buybackId ?? null},
        ${challenge.expiresAt},
        ${challenge.verified},
        ${challenge.attempts}
      )
      RETURNING *
    `;
    return fromRow(rows[0]);
  }

  async findById(requestId: string): Promise<OtpChallenge | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`SELECT * FROM otp_challenges WHERE request_id = ${requestId}`;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async markVerified(requestId: string): Promise<void> {
    const sql = getSql();
    await sql`UPDATE otp_challenges SET verified = true WHERE request_id = ${requestId}`;
  }

  async recordFailedAttempt(requestId: string): Promise<OtpChallenge | undefined> {
    const sql = getSql();
    const rows = await sql<SqlRow[]>`
      UPDATE otp_challenges
      SET attempts = attempts + 1
      WHERE request_id = ${requestId}
      RETURNING *
    `;
    return rows[0] ? fromRow(rows[0]) : undefined;
  }
}
