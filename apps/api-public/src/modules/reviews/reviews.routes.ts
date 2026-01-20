import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';
import { emitToUser } from '../../websocket/index.js';

const router = Router();

const createReviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/reviews
 * Create a review for a completed booking
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = createReviewSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { review: true, worker: true },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    if (booking.customerId !== req.user!.id) {
      throw new AppError(403, 'Not your booking', 'FORBIDDEN');
    }

    if (booking.status !== 'COMPLETED') {
      throw new AppError(400, 'Booking is not completed', 'NOT_COMPLETED');
    }

    if (booking.review) {
      throw new AppError(400, 'Review already exists', 'ALREADY_REVIEWED');
    }

    if (!booking.workerId || !booking.worker) {
      throw new AppError(400, 'No worker assigned to booking', 'NO_WORKER');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId: req.user!.id,
        workerId: booking.workerId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Update worker stats
    const workerReviews = await prisma.review.aggregate({
      where: { workerId: booking.workerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.worker.update({
      where: { id: booking.workerId },
      data: {
        averageRating: workerReviews._avg.rating || 0,
        totalReviews: workerReviews._count.id,
      },
    });

    // Notify worker
    emitToUser(booking.worker.userId, 'review:new', {
      bookingId: booking.id,
      rating: data.rating,
    });

    await prisma.notification.create({
      data: {
        userId: booking.worker.userId,
        type: 'REVIEW_RECEIVED',
        title: 'New Review',
        body: `You received a ${data.rating}-star review`,
        data: { bookingId: booking.id, reviewId: review.id },
      },
    });

    res.status(201).json({ success: true, data: review });
  })
);

/**
 * GET /api/v1/reviews/worker/:workerId
 * Get reviews for a worker
 */
router.get(
  '/worker/:workerId',
  asyncHandler(async (req, res) => {
    const { page = '1', limit = '10' } = req.query;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { workerId: req.params.workerId },
        include: {
          customer: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
          booking: {
            select: { category: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.review.count({ where: { workerId: req.params.workerId } }),
    ]);

    // Get rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { workerId: req.params.workerId },
      _count: { rating: true },
    });

    res.json({
      success: true,
      data: reviews,
      meta: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        ratingDistribution: Object.fromEntries(
          ratingDistribution.map(r => [r.rating, r._count.rating])
        ),
      },
    });
  })
);

export default router;
