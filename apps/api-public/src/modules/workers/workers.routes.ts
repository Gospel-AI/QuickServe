import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate, authorize } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

const registerWorkerSchema = z.object({
  bio: z.string().max(500).optional(),
  idCardUrl: z.string().url(),
  services: z.array(z.object({
    categoryId: z.string(),
    basePrice: z.number().positive(),
    priceUnit: z.enum(['per_job', 'per_hour']).default('per_job'),
    description: z.string().max(200).optional(),
  })).min(1),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isOnline: z.boolean().optional(),
});

const searchWorkersSchema = z.object({
  categoryId: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(50).default(10),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

/**
 * POST /api/v1/workers/register
 * Register as a worker
 */
router.post(
  '/register',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = registerWorkerSchema.parse(req.body);

    // Check if already a worker
    const existingWorker = await prisma.worker.findUnique({
      where: { userId: req.user!.id },
    });

    if (existingWorker) {
      throw new AppError(400, 'Already registered as worker', 'ALREADY_WORKER');
    }

    // Create worker with services
    const worker = await prisma.worker.create({
      data: {
        userId: req.user!.id,
        bio: data.bio,
        idCardUrl: data.idCardUrl,
        services: {
          create: data.services.map(s => ({
            categoryId: s.categoryId,
            basePrice: s.basePrice,
            priceUnit: s.priceUnit,
            description: s.description,
          })),
        },
      },
      include: {
        services: {
          include: { category: true },
        },
      },
    });

    // Update user role
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { role: 'WORKER' },
    });

    res.status(201).json({ success: true, data: worker });
  })
);

/**
 * GET /api/v1/workers/search
 * Search nearby workers
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const params = searchWorkersSchema.parse(req.query);

    // Using Haversine formula for distance calculation
    // For production, use PostGIS for better performance
    const workers = await prisma.$queryRaw<Array<{
      id: string;
      userId: string;
      bio: string | null;
      averageRating: number;
      totalReviews: number;
      totalJobsCompleted: number;
      currentLatitude: number;
      currentLongitude: number;
      distance: number;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      phone: string;
    }>>`
      SELECT
        w.id,
        w."userId",
        w.bio,
        w."averageRating",
        w."totalReviews",
        w."totalJobsCompleted",
        w."currentLatitude",
        w."currentLongitude",
        u."firstName",
        u."lastName",
        u."avatarUrl",
        u.phone,
        (
          6371 * acos(
            cos(radians(${params.latitude})) * cos(radians(w."currentLatitude")) *
            cos(radians(w."currentLongitude") - radians(${params.longitude})) +
            sin(radians(${params.latitude})) * sin(radians(w."currentLatitude"))
          )
        ) AS distance
      FROM workers w
      INNER JOIN users u ON w."userId" = u.id
      WHERE w."isOnline" = true
        AND w."verificationStatus" = 'VERIFIED'
        AND w."currentLatitude" IS NOT NULL
        AND w."currentLongitude" IS NOT NULL
        ${params.categoryId ? prisma.$queryRaw`AND EXISTS (
          SELECT 1 FROM worker_services ws
          WHERE ws."workerId" = w.id AND ws."categoryId" = ${params.categoryId}
        )` : prisma.$queryRaw``}
      HAVING (
        6371 * acos(
          cos(radians(${params.latitude})) * cos(radians(w."currentLatitude")) *
          cos(radians(w."currentLongitude") - radians(${params.longitude})) +
          sin(radians(${params.latitude})) * sin(radians(w."currentLatitude"))
        )
      ) <= ${params.radiusKm}
      ORDER BY distance ASC
      LIMIT ${params.limit}
      OFFSET ${(params.page - 1) * params.limit}
    `;

    res.json({ success: true, data: workers });
  })
);

/**
 * GET /api/v1/workers/:id
 * Get worker profile
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
        services: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    });

    if (!worker) {
      throw new AppError(404, 'Worker not found', 'NOT_FOUND');
    }

    // Get recent reviews
    const reviews = await prisma.review.findMany({
      where: { workerId: worker.id },
      include: {
        customer: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ success: true, data: { ...worker, reviews } });
  })
);

/**
 * PATCH /api/v1/workers/me/location
 * Update worker location and online status
 */
router.patch(
  '/me/location',
  authenticate,
  authorize('WORKER'),
  asyncHandler(async (req, res) => {
    const data = updateLocationSchema.parse(req.body);

    const worker = await prisma.worker.update({
      where: { userId: req.user!.id },
      data: {
        currentLatitude: data.latitude,
        currentLongitude: data.longitude,
        ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
      },
    });

    res.json({ success: true, data: worker });
  })
);

/**
 * GET /api/v1/workers/me/bookings
 * Get worker's bookings
 */
router.get(
  '/me/bookings',
  authenticate,
  authorize('WORKER'),
  asyncHandler(async (req, res) => {
    const { status, page = '1', limit = '10' } = req.query;

    const worker = await prisma.worker.findUnique({
      where: { userId: req.user!.id },
    });

    if (!worker) {
      throw new AppError(404, 'Worker profile not found', 'NOT_FOUND');
    }

    const where = {
      workerId: worker.id,
      ...(status && { status: status as string }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, iconUrl: true } },
          customer: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true },
          },
          payment: { select: { status: true, method: true, amount: true } },
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
