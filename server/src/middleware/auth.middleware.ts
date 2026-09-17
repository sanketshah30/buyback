import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { verifyToken } from '../utils/jwt';

export interface AuthedRequest extends Request {
  auth?: { userId: number; mobile: string; token: string };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyToken(token);
    // A JWT can be cryptographically valid yet belong to a session that's
    // since been revoked (logout) or expired - the session table is the
    // source of truth for whether the login itself is still good.
    const sessionActive = await authService.isSessionActive(token);
    if (!sessionActive) {
      return res.status(401).json({ error: 'Session has been logged out or expired' });
    }
    req.auth = { ...payload, token };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
