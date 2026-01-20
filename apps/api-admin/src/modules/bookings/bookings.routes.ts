import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

/**
 * GET /api/v1/admin/bookings
 * 予約一覧取得
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, categoryId, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
            },
          },
          worker: {
            include: {
              user: {
                select: { id: true, phone: true, firstName: true, lastName: true },
              },
            },
          },
          category: true,
          payment: true,
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

/**
 * GET /api/v1/admin/bookings/:id
 * 予約詳細取得
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        worker: {
          include: { user: true },
        },
        category: true,
        payment: true,
        review: true,
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: {
                sender: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    res.json({ success: true, data: booking });
  })
);

/**
 * POST /api/v1/admin/bookings/:id/cancel
 * 予約キャンセル（管理者権限）
 */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    // 返金処理が必要な場合はここで実施
    if (booking.workerId) {
      const worker = await prisma.worker.findUnique({
        where: { id: booking.workerId },
      });
      if (worker) {
        await prisma.notification.create({
          data: {
            userId: worker.userId,
            type: 'BOOKING_CANCELLED',
            title: 'Booking Cancelled',
            body: 'A booking has been cancelled by admin.',
            data: { bookingId: booking.id },
          },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        body: 'Your booking has been cancelled.',
        data: { bookingId: booking.id },
      },
    });

    res.json({ success: true, data: booking });
  })
);

export default router;
