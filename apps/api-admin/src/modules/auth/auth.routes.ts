import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

const OTP_VALIDITY_MINUTES = 5;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeGhanaPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('233')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length !== 9) throw new Error('Invalid phone number format');
  return '+233' + cleaned;
}

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
});

/**
 * POST /api/v1/admin/auth/otp/send
 * Admin用OTP送信（ADMINロールのみ許可）
 */
router.post(
  '/otp/send',
  asyncHandler(async (req, res) => {
    const { phone } = sendOtpSchema.parse(req.body);
    const normalizedPhone = normalizeGhanaPhone(phone);

    // ADMINユーザーのみ許可
    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AppError(403, 'Admin access only', 'FORBIDDEN');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);

    await prisma.otpCode.updateMany({
      where: { userId: user.id, verified: false },
      data: { verified: true },
    });

    await prisma.otpCode.create({
      data: { userId: user.id, code, expiresAt },
    });

    if (env.NODE_ENV === 'development') {
      console.log(`📱 Admin OTP for ${normalizedPhone}: ${code}`);
    }

    res.json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresIn: OTP_VALIDITY_MINUTES * 60,
      },
    });
  })
);

/**
 * POST /api/v1/admin/auth/otp/verify
 * Admin用OTP検証
 */
router.post(
  '/otp/verify',
  asyncHandler(async (req, res) => {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const normalizedPhone = normalizeGhanaPhone(phone);

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AppError(403, 'Admin access only', 'FORBIDDEN');
    }

    const otp = await prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      throw new AppError(400, 'Invalid or expired OTP', 'INVALID_OTP');
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  })
);

export default router;
