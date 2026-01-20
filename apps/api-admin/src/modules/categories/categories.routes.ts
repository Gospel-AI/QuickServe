import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { prisma } from '../../config/database.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  nameLocal: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/v1/admin/categories
 * カテゴリー一覧取得（非アクティブ含む）
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { workerServices: true, bookings: true },
        },
      },
    });

    res.json({ success: true, data: categories });
  })
);

/**
 * POST /api/v1/admin/categories
 * カテゴリー作成
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);

    const category = await prisma.serviceCategory.create({
      data,
    });

    res.status(201).json({ success: true, data: category });
  })
);

/**
 * PATCH /api/v1/admin/categories/:id
 * カテゴリー更新
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = categorySchema.partial().parse(req.body);

    const category = await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: category });
  })
);

/**
 * DELETE /api/v1/admin/categories/:id
 * カテゴリー削除（非アクティブ化）
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Category deactivated' });
  })
);

export default router;
