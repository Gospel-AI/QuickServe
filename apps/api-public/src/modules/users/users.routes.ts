import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional(),
});

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        latitude: true,
        longitude: true,
        address: true,
        createdAt: true,
        worker: {
          select: {
            id: true,
            verificationStatus: true,
            isOnline: true,
            averageRating: true,
            totalReviews: true,
            totalJobsCompleted: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    res.json({ success: true, data: user });
  })
);

/**
 * PATCH /api/v1/users/me
 * Update current user profile
 */
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });

    res.json({ success: true, data: user });
  })
);

/**
 * GET /api/v1/users/me/bookings
 * Get current user's bookings (as customer)
 */
router.get(
  '/me/bookings',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, page = '1', limit = '10' } = req.query;

    const where = {
      customerId: req.user!.id,
      ...(status && { status: status as string }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, iconUrl: true } },
          worker: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true },
              },
            },
          },
          payment: { select: { status: true, method: true } },
          review: { select: { id: true, rating: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      success: true,
      data: bookings,
      meta: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

export default router;
