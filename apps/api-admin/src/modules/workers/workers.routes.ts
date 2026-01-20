import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

/**
 * GET /api/v1/admin/workers
 * ワーカー一覧取得
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, search, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.verificationStatus = status;
    if (search) {
      where.user = {
        OR: [
          { phone: { contains: search as string } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              status: true,
            },
          },
          services: {
            include: { category: true },
          },
          _count: {
            select: { bookings: true, reviewsReceived: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.worker.count({ where }),
    ]);

    res.json({
      success: true,
      data: workers,
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
 * GET /api/v1/admin/workers/:id
 * ワーカー詳細取得
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        services: {
          include: { category: true },
        },
        bookings: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
            category: true,
            payment: true,
          },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!worker) {
      throw new AppError(404, 'Worker not found', 'NOT_FOUND');
    }

    res.json({ success: true, data: worker });
  })
);

/**
 * POST /api/v1/admin/workers/:id/verify
 * ワーカー認証承認
 */
router.post(
  '/:id/verify',
  asyncHandler(async (req, res) => {
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // 通知作成
    await prisma.notification.create({
      data: {
        userId: worker.userId,
        type: 'SYSTEM',
        title: 'Verification Approved',
        body: 'Your worker profile has been verified. You can now receive job requests.',
      },
    });

    res.json({ success: true, data: worker });
  })
);

/**
 * POST /api/v1/admin/workers/:id/reject
 * ワーカー認証拒否
 */
router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { verificationStatus: 'REJECTED' },
    });

    await prisma.notification.create({
      data: {
        userId: worker.userId,
        type: 'SYSTEM',
        title: 'Verification Rejected',
        body: reason || 'Your worker verification was rejected. Please contact support.',
      },
    });

    res.json({ success: true, data: worker });
  })
);

/**
 * POST /api/v1/admin/workers/:id/suspend
 * ワーカー停止
 */
router.post(
  '/:id/suspend',
  asyncHandler(async (req, res) => {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
    });

    if (!worker) {
      throw new AppError(404, 'Worker not found', 'NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: worker.userId },
      data: { status: 'SUSPENDED' },
    });

    await prisma.worker.update({
      where: { id: req.params.id },
      data: { isOnline: false },
    });

    res.json({ success: true, message: 'Worker suspended' });
  })
);

export default router;
