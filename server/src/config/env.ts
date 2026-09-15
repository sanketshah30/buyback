import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

const INSECURE_DEFAULT_JWT_SECRET = 'insecure-dev-secret';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET ?? INSECURE_DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  mockOtpCode: process.env.MOCK_OTP_CODE ?? '123456',
  mockOtpExposeInResponse: readBool(process.env.MOCK_OTP_EXPOSE_IN_RESPONSE, true),

  diagnosisCompleteAfterPolls: Number(process.env.DIAGNOSIS_COMPLETE_AFTER_POLLS ?? 3),

  noDiagnosisValueDropPercent: Number(process.env.NO_DIAGNOSIS_VALUE_DROP_PERCENT ?? 35),

  dataDriver: process.env.DATA_DRIVER ?? 'in-memory',

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? 'buyback',
    user: process.env.DB_USER ?? 'buyback_app',
    password: process.env.DB_PASSWORD ?? '',
  },
};

/**
 * This MVP's mock OTP (always the same code, optionally echoed back in API
 * responses) and its insecure default JWT secret are only safe on a
 * localhost/private demo. Refuse to boot with `NODE_ENV=production` unless
 * they've actually been hardened, so this configuration can't accidentally
 * ship to a network-exposed deployment.
 */
export function assertProductionSafety(): void {
  if (env.nodeEnv !== 'production') return;

  const problems: string[] = [];
  if (!process.env.JWT_SECRET || env.jwtSecret === INSECURE_DEFAULT_JWT_SECRET) {
    problems.push('JWT_SECRET must be set to a strong, unique value in production.');
  }
  if (env.mockOtpExposeInResponse) {
    problems.push('MOCK_OTP_EXPOSE_IN_RESPONSE must be false in production (do not leak OTPs in API responses).');
  }
  if (!process.env.MOCK_OTP_CODE) {
    problems.push(
      'MOCK_OTP_CODE is unset, meaning OTPs default to a fixed, publicly-documented value - wire up a real SMS/email OTP gateway before production use.',
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start with NODE_ENV=production and insecure MVP defaults:\n- ${problems.join('\n- ')}`,
    );
  }
}
