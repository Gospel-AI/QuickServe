import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';

const router = Router();

/**
 * GET /api/v1/admin/analytics/dashboard
 * ダッシュボード統計
 */
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalWorkers,
      verifiedWorkers,
      pendingWorkers,
      totalBookings,
      todayBookings,
      completedBookings,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.worker.count(),
      prisma.worker.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.worker.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: today } } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
        },
        workers: {
          total: totalWorkers,
          verified: verifiedWorkers,
          pending: pendingWorkers,
        },
        bookings: {
          total: totalBookings,
          today: todayBookings,
          completed: completedBookings,
          completionRate: totalBookings > 0
            ? ((completedBookings / totalBookings) * 100).toFixed(1)
            : 0,
        },
        revenue: {
          total: totalRevenue._sum.amount || 0,
          currency: 'GHS',
        },
      },
    });
  })
);

/**
 * GET /api/v1/admin/analytics/bookings
 * 予約統計（日別）
 */
router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    const byCategory = await prisma.booking.groupBy({
      by: ['categoryId'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    const categories = await prisma.serviceCategory.findMany({
      where: { id: { in: byCategory.map(b => b.categoryId) } },
      select: { id: true, name: true },
    });

    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(
          bookings.map(b => [b.status, b._count.id])
        ),
        byCategory: byCategory.map(b => ({
          category: categoryMap[b.categoryId] || 'Unknown',
          count: b._count.id,
        })),
      },
    });
  })
);

/**
 * GET /api/v1/admin/analytics/revenue
 * 収益統計
 */
router.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate },
      },
      select: {
        amount: true,
        method: true,
        paidAt: true,
      },
    });

    const byMethod = payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        total,
        currency: 'GHS',
        byMethod,
        transactionCount: payments.length,
      },
    });
  })
);

export default router;
