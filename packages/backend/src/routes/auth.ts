import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthService } from '../services/authService.js';
import { authenticateToken, authenticateSession } from '../middleware/auth.js';
import { 
  emailValidation, 
  passwordValidation, 
  handleValidationErrors,
  authRateLimit 
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Apply auth rate limiting to all auth routes
router.use(authRateLimit);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', 
  [emailValidation, passwordValidation],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    logger.info('User registration attempt', { email });

    // Register user
    const authResponse = await AuthService.register({ email, password });

    logger.info('User registered successfully', { 
      email, 
      userId: authResponse.user.id 
    });

    res.status(201).json({
      message: 'User registered successfully',
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', 
  [
    emailValidation,
    body('password').notEmpty().withMessage('Password is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    logger.info('User login attempt', { email });

    // Login user
    const authResponse = await AuthService.login({ email, password });

    logger.info('User logged in successfully', { 
      email, 
      userId: authResponse.user.id 
    });

    res.json({
      message: 'Login successful',
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout user (requires session token)
 */
router.post('/logout', 
  authenticateSession, 
  asyncHandler(async (req: Request, res: Response) => {
    const sessionToken = req.sessionToken;
    
    if (!sessionToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SESSION_TOKEN',
          message: 'Session token is required for logout',
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('User logout', { sessionToken });

    await AuthService.logout(sessionToken);

    logger.info('User logged out successfully', { sessionToken });

    res.json({
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/auth/logout-all
 * Logout all sessions for the current user
 */
router.post('/logout-all', 
  authenticateToken, 
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('User logout all sessions', { userId });

    await AuthService.logoutAll(userId);

    logger.info('All user sessions logged out successfully', { userId });

    res.json({
      message: 'All sessions logged out successfully',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', 
  authenticateToken, 
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('User profile requested', { userId: user.id });

    res.json({
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * POST /api/auth/refresh-session
 * Refresh session expiration
 */
router.post('/refresh-session', 
  authenticateSession, 
  asyncHandler(async (req: Request, res: Response) => {
    const sessionToken = req.sessionToken;
    
    if (!sessionToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_SESSION_TOKEN',
          message: 'Session token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    logger.info('Session refresh requested', { sessionToken });

    const refreshResult = await AuthService.refreshSession(sessionToken);

    logger.info('Session refreshed successfully', { sessionToken });

    res.json({
      message: 'Session refreshed successfully',
      data: refreshResult,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;