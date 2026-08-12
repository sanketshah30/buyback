import { BuybackRequest, OtpChallenge, User } from '../../types/domain';

/**
 * A single process-memory "database". Data resets whenever the server
 * restarts - this is intentional for the MVP. Replace this module with a
 * MySQL connection pool (e.g. `mysql2/promise`) when persistence is needed.
 */
export const tables = {
  users: new Map<string, User>(),
  usersByMobile: new Map<string, string>(), // mobile -> userId
  otpChallenges: new Map<string, OtpChallenge>(),
  buybackRequests: new Map<string, BuybackRequest>(),
  dailySequences: new Map<string, number>(), // dateKey -> last count
};
