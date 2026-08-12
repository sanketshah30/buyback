import { env } from '../config/env';
import { InMemoryBuybackRepository } from './inMemory/buyback.repository';
import { InMemoryCatalogRepository } from './inMemory/catalog.repository';
import { InMemoryOtpRepository } from './inMemory/otp.repository';
import { InMemoryUserRepository } from './inMemory/user.repository';
import { BuybackRepository, CatalogRepository, OtpRepository, UserRepository } from './interfaces';

/**
 * Central place to select the active data driver.
 *
 * Today `DATA_DRIVER=in-memory` is the only supported value. When MySQL
 * support is added, branch on `env.dataDriver === 'mysql'` here and return
 * MySQL-backed implementations of the same interfaces - callers never need
 * to change.
 */
function assertSupportedDriver() {
  if (env.dataDriver !== 'in-memory') {
    // eslint-disable-next-line no-console
    console.warn(
      `[repositories] DATA_DRIVER="${env.dataDriver}" is not implemented yet, falling back to in-memory mock data.`,
    );
  }
}

assertSupportedDriver();

export const userRepository: UserRepository = new InMemoryUserRepository();
export const otpRepository: OtpRepository = new InMemoryOtpRepository();
export const catalogRepository: CatalogRepository = new InMemoryCatalogRepository();
export const buybackRepository: BuybackRepository = new InMemoryBuybackRepository();
