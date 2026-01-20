import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate, authorize } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  nameLocal: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * GET /api/v1/categories
 * Get all active service categories
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        nameLocal: true,
        description: true,
        iconUrl: true,
        _count: {
          select: {
            workerServices: {
              where: {
                isActive: true,
                worker: { verificationStatus: 'VERIFIED', isOnline: true },
              },
            },
          },
        },
      },
    });

    // Transform to include worker count
    const transformed = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      nameLocal: cat.nameLocal,
      description: cat.description,
      iconUrl: cat.iconUrl,
      activeWorkersCount: cat._count.workerServices,
    }));

    res.json({ success: true, data: transformed });
  })
);

/**
 * GET /api/v1/categories/:id
 * Get category by ID with workers
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await prisma.serviceCategory.findUnique({
      where: { id: req.params.id },
      include: {
        workerServices: {
          where: {
            isActive: true,
            worker: { verificationStatus: 'VERIFIED' },
          },
          include: {
            worker: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          take: 20,
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found', 'NOT_FOUND');
    }

    res.json({ success: true, data: category });
  })
);

/**
 * POST /api/v1/categories (Admin only)
 * Create new category
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createCategorySchema.parse(req.body);

    const category = await prisma.serviceCategory.create({
      data,
    });

    res.status(201).json({ success: true, data: category });
  })
);

/**
 * PATCH /api/v1/categories/:id (Admin only)
 * Update category
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createCategorySchema.partial().parse(req.body);

    const category = await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: category });
  })
);

export default router;
