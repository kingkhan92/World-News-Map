import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '../utils/auth.js';
import { UserModel } from '../models/User.js';
import { UserSessionModel } from '../models/UserSession.js';
import { redisClient } from '../utils/redis.js';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
      sessionToken?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Verify JWT token
    const payload: JWTPayload = verifyAccessToken(token);
    
    // Check if user still exists
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Add user data to request
    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Middleware to authenticate session tokens (alternative to JWT)
 */
export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (!sessionToken) {
      res.status(401).json({
        error: {
          code: 'MISSING_SESSION_TOKEN',
          message: 'Session token is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Check session in Redis first (faster)
    const userId = await redisClient.getSession(sessionToken);
    
    if (!userId) {
      // Fallback to database check
      const session = await UserSessionModel.findByToken(sessionToken);
      if (!session) {
        res.status(401).json({
          error: {
            code: 'INVALID_SESSION',
            message: 'Invalid or expired session token',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // Get user data
    const user = await UserModel.findById(userId || 0);
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with session not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Add user data to request
    req.user = {
      id: user.id,
      email: user.email,
    };
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SESSION_AUTH_ERROR',
        message: 'Error during session authentication',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload: JWTPayload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.userId);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
}