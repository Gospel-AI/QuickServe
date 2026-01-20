import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.js';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from './auth.schema.js';
import * as authService from './auth.service.js';

const router = Router();

/**
 * POST /api/v1/auth/otp/send
 * Send OTP to phone number
 */
router.post(
  '/otp/send',
  asyncHandler(async (req, res) => {
    const { body } = sendOtpSchema.parse({ body: req.body });
    const result = await authService.sendOtp(body);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/auth/otp/verify
 * Verify OTP and get tokens
 */
router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { body } = verifyOtpSchema.parse({ body: req.body });
    const result = await authService.verifyOtp(body);
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { body } = refreshTokenSchema.parse({ body: req.body });
    const result = await authService.refreshAccessToken(body.refreshToken);
    res.json({ success: true, data: result });
  })
);

export default router;
