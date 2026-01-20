import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate, authorize } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';
import { emitToUser, emitToBooking } from '../../websocket/index.js';

const router = Router();

const createBookingSchema = z.object({
  categoryId: z.string(),
  workerId: z.string().optional(), // Optional: customer can request specific worker
  description: z.string().min(10).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5).max(500),
  scheduledAt: z.string().datetime().optional(), // ISO string, null = immediate
});

const updateBookingStatusSchema = z.object({
  status: z.enum([
    'ACCEPTED',
    'WORKER_EN_ROUTE',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ]),
  finalPrice: z.number().positive().optional(),
});

/**
 * POST /api/v1/bookings
 * Create a new booking
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = createBookingSchema.parse(req.body);

    // Verify category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError(404, 'Service category not found', 'NOT_FOUND');
    }

    // If worker specified, verify they offer this service
    let estimatedPrice: number | null = null;
    if (data.workerId) {
      const workerService = await prisma.workerService.findFirst({
        where: {
          worker: { id: data.workerId, verificationStatus: 'VERIFIED' },
          categoryId: data.categoryId,
          isActive: true,
        },
      });
      if (!workerService) {
        throw new AppError(400, 'Worker does not offer this service', 'INVALID_WORKER');
      }
      estimatedPrice = workerService.basePrice;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId: req.user!.id,
        workerId: data.workerId,
        categoryId: data.categoryId,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        estimatedPrice,
        status: data.workerId ? 'PENDING' : 'PENDING',
      },
      include: {
        category: true,
        worker: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    });

    // Create conversation for this booking
    await prisma.conversation.create({
      data: {
        bookingId: booking.id,
        participants: {
          create: [
            { userId: req.user!.id },
            ...(data.workerId ? [{ userId: booking.worker!.userId }] : []),
          ],
        },
      },
    });

    // Notify worker if specified
    if (data.workerId && booking.worker) {
      emitToUser(booking.worker.userId, 'booking:new', {
        bookingId: booking.id,
        category: booking.category.name,
        address: booking.address,
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: booking.worker.userId,
          type: 'BOOKING_REQUEST',
          title: 'New Booking Request',
          body: `New ${booking.category.name} service request`,
          data: { bookingId: booking.id },
        },
      });
    }

    res.status(201).json({ success: true, data: booking });
  })
);

/**
 * GET /api/v1/bookings/:id
 * Get booking details
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
        worker: {
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
          },
        },
        payment: true,
        review: true,
      },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    // Check access
    const isCustomer = booking.customerId === req.user!.id;
    const isWorker = booking.worker?.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCustomer && !isWorker && !isAdmin) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    res.json({ success: true, data: booking });
  })
);

/**
 * PATCH /api/v1/bookings/:id/status
 * Update booking status (for workers)
 */
router.patch(
  '/:id/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = updateBookingStatusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { worker: true },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    // Validate permissions
    const isWorker = booking.worker?.userId === req.user!.id;
    const isCustomer = booking.customerId === req.user!.id;

    // Status transition validation
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['WORKER_EN_ROUTE', 'CANCELLED'],
      WORKER_EN_ROUTE: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    };

    if (!validTransitions[booking.status]?.includes(data.status)) {
      throw new AppError(
        400,
        `Cannot transition from ${booking.status} to ${data.status}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Permission checks
    if (data.status === 'CANCELLED') {
      if (!isWorker && !isCustomer) {
        throw new AppError(403, 'Only customer or worker can cancel', 'FORBIDDEN');
      }
    } else if (!isWorker) {
      throw new AppError(403, 'Only worker can update status', 'FORBIDDEN');
    }

    // Update booking
    const updateData: Record<string, unknown> = { status: data.status };

    if (data.status === 'ACCEPTED' && !booking.workerId) {
      // Worker accepting open booking
      const worker = await prisma.worker.findUnique({
        where: { userId: req.user!.id },
      });
      if (!worker) {
        throw new AppError(400, 'Worker profile not found', 'NOT_WORKER');
      }
      updateData.workerId = worker.id;
    }

    if (data.status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (data.finalPrice) {
        updateData.finalPrice = data.finalPrice;
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
      include: {
        category: true,
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        worker: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Emit socket events
    emitToBooking(booking.id, 'booking:status', {
      bookingId: booking.id,
      status: data.status,
    });

    // Notify customer
    const notificationTypes: Record<string, { type: string; title: string; body: string }> = {
      ACCEPTED: {
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Accepted',
        body: 'Your service request has been accepted',
      },
      WORKER_EN_ROUTE: {
        type: 'WORKER_EN_ROUTE',
        title: 'Worker On The Way',
        body: 'Your service provider is on the way',
      },
      COMPLETED: {
        type: 'SERVICE_COMPLETED',
        title: 'Service Completed',
        body: 'Your service has been completed. Please rate your experience.',
      },
    };

    const notif = notificationTypes[data.status];
    if (notif) {
      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          type: notif.type as never,
          title: notif.title,
          body: notif.body,
          data: { bookingId: booking.id },
        },
      });
      emitToUser(booking.customerId, 'notification', notif);
    }

    res.json({ success: true, data: updatedBooking });
  })
);

/**
 * POST /api/v1/bookings/:id/accept
 * Worker accepts a booking (shortcut endpoint)
 */
router.post(
  '/:id/accept',
  authenticate,
  authorize('WORKER'),
  asyncHandler(async (req, res) => {
    const worker = await prisma.worker.findUnique({
      where: { userId: req.user!.id },
    });

    if (!worker || worker.verificationStatus !== 'VERIFIED') {
      throw new AppError(403, 'Worker not verified', 'NOT_VERIFIED');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    if (booking.status !== 'PENDING') {
      throw new AppError(400, 'Booking is not available', 'NOT_AVAILABLE');
    }

    // Get worker's price for this category
    const workerService = await prisma.workerService.findFirst({
      where: {
        workerId: worker.id,
        categoryId: booking.categoryId,
        isActive: true,
      },
    });

    if (!workerService) {
      throw new AppError(400, 'You do not offer this service', 'SERVICE_NOT_OFFERED');
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        workerId: worker.id,
        status: 'ACCEPTED',
        estimatedPrice: workerService.basePrice,
      },
      include: {
        category: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });

    // Add worker to conversation
    const conversation = await prisma.conversation.findUnique({
      where: { bookingId: booking.id },
    });

    if (conversation) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: req.user!.id,
        },
      });
    }

    // Notify customer
    emitToUser(booking.customerId, 'booking:accepted', {
      bookingId: booking.id,
      worker: {
        id: worker.id,
        userId: req.user!.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: booking.customerId,
        type: 'BOOKING_ACCEPTED',
        title: 'Booking Accepted',
        body: 'A worker has accepted your service request',
        data: { bookingId: booking.id },
      },
    });

    res.json({ success: true, data: updatedBooking });
  })
);

export default router;
