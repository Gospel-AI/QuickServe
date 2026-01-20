import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(15),
    code: z.string().length(6),
    deviceToken: z.string().optional(), // FCM token for push notifications
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
