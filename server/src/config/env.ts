import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET ?? 'insecure-dev-secret',
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
