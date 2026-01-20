import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { normalizeGhanaPhone, isValidGhanaPhone } from '../../common/utils/phone.js';
import { AppError } from '../../common/middleware/error.middleware.js';
import type { SendOtpInput, VerifyOtpInput } from './auth.schema.js';

// OTP validity in minutes
const OTP_VALIDITY_MINUTES = 5;

/**
 * Generate 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to phone number
 */
export async function sendOtp(input: SendOtpInput) {
  // Validate and normalize phone
  if (!isValidGhanaPhone(input.phone)) {
    throw new AppError(400, 'Invalid Ghana phone number', 'INVALID_PHONE');
  }

  const phone = normalizeGhanaPhone(input.phone);

  // Find or create user
  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: { phone },
    });
  }

  // Check if user is suspended
  if (user.status === 'SUSPENDED') {
    throw new AppError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
  }

  // Generate OTP
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);

  // Invalidate previous OTPs
  await prisma.otpCode.updateMany({
    where: { userId: user.id, verified: false },
    data: { verified: true },
  });

  // Save new OTP
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      code,
      expiresAt,
    },
  });

  // TODO: Send SMS via Africastalking
  // For development, log the OTP
  if (env.NODE_ENV === 'development') {
    console.log(`📱 OTP for ${phone}: ${code}`);
  }

  // In production, send via SMS
  // await sendSms(phone, `Your QuickServe code is: ${code}`);

  return {
    message: 'OTP sent successfully',
    expiresIn: OTP_VALIDITY_MINUTES * 60, // seconds
  };
}

/**
 * Verify OTP and return tokens
 */
export async function verifyOtp(input: VerifyOtpInput) {
  const phone = normalizeGhanaPhone(input.phone);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Development mode: accept "123456" as valid OTP
  const isDevBypass = env.NODE_ENV === 'development' && input.code === '123456';

  // Find valid OTP
  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      code: input.code,
      verified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp && !isDevBypass) {
    throw new AppError(400, 'Invalid or expired OTP', 'INVALID_OTP');
  }

  // Mark OTP as verified (skip if using dev bypass)
  if (otp) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });
  }

  // Update user status if pending
  if (user.status === 'PENDING_VERIFICATION') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Check if user has worker profile
  const worker = await prisma.worker.findUnique({
    where: { userId: user.id },
    select: { id: true, verificationStatus: true },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isNewUser: !user.firstName,
      worker: worker
        ? {
            id: worker.id,
            verificationStatus: worker.verificationStatus,
          }
        : null,
    },
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw new AppError(401, 'Invalid token type', 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new AppError(401, 'User not found or suspended', 'UNAUTHORIZED');
    }

    const accessToken = generateAccessToken(user.id, user.role);

    return { accessToken };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, 'Invalid refresh token', 'INVALID_TOKEN');
    }
    throw error;
  }
}

function generateAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}
