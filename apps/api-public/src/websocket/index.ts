import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '../common/middleware/auth.middleware.js';

let io: Server;

export function initializeSocketIO(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production'
        ? ['https://quickserve.com', 'https://admin.quickserve.com']
        : '*',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 User connected: ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle joining booking room
    socket.on('join:booking', (bookingId: string) => {
      socket.join(`booking:${bookingId}`);
      console.log(`User ${userId} joined booking room: ${bookingId}`);
    });

    // Handle leaving booking room
    socket.on('leave:booking', (bookingId: string) => {
      socket.leave(`booking:${bookingId}`);
    });

    // Handle worker location updates
    socket.on('worker:location', (data: { lat: number; lng: number }) => {
      // Broadcast to relevant booking rooms
      // This will be enhanced when we implement tracking
      console.log(`Worker ${userId} location:`, data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Helper functions to emit events
export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToBooking(bookingId: string, event: string, data: unknown) {
  io?.to(`booking:${bookingId}`).emit(event, data);
}
