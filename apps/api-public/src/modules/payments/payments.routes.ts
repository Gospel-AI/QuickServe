import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/utils/async.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/middleware/error.middleware.js';
import { emitToUser } from '../../websocket/index.js';

const router = Router();

const initiatePaymentSchema = z.object({
  bookingId: z.string(),
  method: z.enum(['MTN_MOMO', 'VODAFONE_CASH', 'CASH']),
  phone: z.string().optional(), // Required for mobile money
});

/**
 * POST /api/v1/payments/initiate
 * Initiate payment for a booking
 */
router.post(
  '/initiate',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = initiatePaymentSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new AppError(404, 'Booking not found', 'NOT_FOUND');
    }

    if (booking.customerId !== req.user!.id) {
      throw new AppError(403, 'Not your booking', 'FORBIDDEN');
    }

    if (booking.status !== 'COMPLETED') {
      throw new AppError(400, 'Booking is not completed yet', 'NOT_COMPLETED');
    }

    if (booking.payment?.status === 'COMPLETED') {
      throw new AppError(400, 'Payment already completed', 'ALREADY_PAID');
    }

    const amount = booking.finalPrice || booking.estimatedPrice;
    if (!amount) {
      throw new AppError(400, 'No price set for booking', 'NO_PRICE');
    }

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        amount,
        method: data.method,
        status: data.method === 'CASH' ? 'COMPLETED' : 'PROCESSING',
        paidAt: data.method === 'CASH' ? new Date() : null,
      },
      update: {
        method: data.method,
        status: data.method === 'CASH' ? 'COMPLETED' : 'PROCESSING',
        paidAt: data.method === 'CASH' ? new Date() : null,
      },
    });

    // For cash payments, we're done
    if (data.method === 'CASH') {
      // Notify worker
      if (booking.workerId) {
        const worker = await prisma.worker.findUnique({
          where: { id: booking.workerId },
        });
        if (worker) {
          emitToUser(worker.userId, 'payment:completed', {
            bookingId: booking.id,
            amount,
            method: 'CASH',
          });

          await prisma.notification.create({
            data: {
              userId: worker.userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Payment Received',
              body: `Cash payment of GHS ${amount} confirmed`,
              data: { bookingId: booking.id },
            },
          });
        }
      }

      return res.json({
        success: true,
        data: {
          payment,
          message: 'Cash payment recorded',
        },
      });
    }

    // For MTN MoMo, initiate STK push
    if (data.method === 'MTN_MOMO') {
      if (!data.phone) {
        throw new AppError(400, 'Phone number required for mobile money', 'PHONE_REQUIRED');
      }

      // TODO: Integrate with MTN MoMo API
      // const momoResult = await initiateMomoPayment({
      //   amount,
      //   phone: data.phone,
      //   reference: payment.id,
      //   description: `QuickServe Payment #${booking.id}`,
      // });

      // For now, return pending status
      return res.json({
        success: true,
        data: {
          payment,
          message: 'Payment initiated. Please confirm on your phone.',
          // providerRef: momoResult.transactionId,
        },
      });
    }

    // Vodafone Cash - similar to MoMo
    if (data.method === 'VODAFONE_CASH') {
      if (!data.phone) {
        throw new AppError(400, 'Phone number required for mobile money', 'PHONE_REQUIRED');
      }

      return res.json({
        success: true,
        data: {
          payment,
          message: 'Payment initiated. Please confirm on your phone.',
        },
      });
    }

    res.json({ success: true, data: payment });
  })
);

/**
 * POST /api/v1/payments/webhook/mtn
 * MTN MoMo webhook for payment confirmation
 */
router.post(
  '/webhook/mtn',
  asyncHandler(async (req, res) => {
    // Verify webhook signature (TODO: implement proper verification)
    const { transactionId, status, externalId } = req.body;

    const payment = await prisma.payment.findFirst({
      where: { providerRef: transactionId },
      include: { booking: true },
    });

    if (!payment) {
      console.warn('Payment not found for webhook:', transactionId);
      return res.status(200).json({ received: true });
    }

    if (status === 'SUCCESSFUL') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          providerResponse: req.body,
        },
      });

      // Notify worker
      if (payment.booking.workerId) {
        const worker = await prisma.worker.findUnique({
          where: { id: payment.booking.workerId },
        });
        if (worker) {
          emitToUser(worker.userId, 'payment:completed', {
            bookingId: payment.bookingId,
            amount: payment.amount,
            method: 'MTN_MOMO',
          });

          await prisma.notification.create({
            data: {
              userId: worker.userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Payment Received',
              body: `Mobile money payment of GHS ${payment.amount} received`,
              data: { bookingId: payment.bookingId },
            },
          });
        }
      }

      // Notify customer
      emitToUser(payment.booking.customerId, 'payment:success', {
        bookingId: payment.bookingId,
      });
    } else if (status === 'FAILED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerResponse: req.body,
        },
      });

      emitToUser(payment.booking.customerId, 'payment:failed', {
        bookingId: payment.bookingId,
      });
    }

    res.status(200).json({ received: true });
  })
);

/**
 * GET /api/v1/payments/:id
 * Get payment details
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        booking: {
          select: {
            id: true,
            customerId: true,
            worker: { select: { userId: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found', 'NOT_FOUND');
    }

    // Check access
    const isCustomer = payment.booking.customerId === req.user!.id;
    const isWorker = payment.booking.worker?.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCustomer && !isWorker && !isAdmin) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    res.json({ success: true, data: payment });
  })
);

export default router;
