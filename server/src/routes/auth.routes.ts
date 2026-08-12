import { Router } from 'express';
import { authService } from '../services/auth.service';

export const authRouter = Router();

const MOBILE_REGEX = /^[0-9]{10}$/;

authRouter.post('/otp/request', async (req, res, next) => {
  try {
    const { mobile } = req.body as { mobile?: string };
    if (!mobile || !MOBILE_REGEX.test(mobile)) {
      return res.status(400).json({ error: 'A valid 10-digit mobile number is required' });
    }
    const result = await authService.requestOtp(mobile, 'login');
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/otp/verify', async (req, res, next) => {
  try {
    const { requestId, otp } = req.body as { requestId?: string; otp?: string };
    if (!requestId || !otp) {
      return res.status(400).json({ error: 'requestId and otp are required' });
    }
    const result = await authService.verifyOtp(requestId, otp);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
