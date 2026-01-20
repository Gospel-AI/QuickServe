import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from './error.middleware.js';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Admin認証・認可ミドルウェア
 * ADMINロールのみアクセス許可
 */
export async function adminOnly(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided', 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // ADMINロール確認
    if (decoded.role !== 'ADMIN') {
      throw new AppError(403, 'Admin access required', 'FORBIDDEN');
    }

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true },
    });

    if (!user) {
      throw new AppError(401, 'User not found', 'UNAUTHORIZED');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
    }

    if (user.role !== 'ADMIN') {
      throw new AppError(403, 'Admin access required', 'FORBIDDEN');
    }

    req.admin = { id: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid token', 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Token expired', 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
}
