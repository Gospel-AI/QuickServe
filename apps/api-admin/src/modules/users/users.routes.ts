import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

/**
 * GET /api/v1/admin/users
 * ユーザー一覧取得
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, status, search, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { phone: { contains: search as string } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { customerBookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

/**
 * GET /api/v1/admin/users/:id
 * ユーザー詳細取得
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        worker: true,
        customerBookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            worker: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        reviewsGiven: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    res.json({ success: true, data: user });
  })
);

const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['CUSTOMER', 'WORKER', 'ADMIN']).optional(),
});

/**
 * PATCH /api/v1/admin/users/:id
 * ユーザー更新
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    res.json({ success: true, data: user });
  })
);

/**
 * DELETE /api/v1/admin/users/:id
 * ユーザー削除（ソフトデリート）
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'INACTIVE' },
    });

    res.json({ success: true, message: 'User deactivated' });
  })
);

export default router;
