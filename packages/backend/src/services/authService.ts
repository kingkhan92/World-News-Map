import { UserModel } from '../models/User.js';
import { UserSessionModel } from '../models/UserSession.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokenPair, 
  generateSessionToken, 
  getSessionExpiration,
  TokenPair 
} from '../utils/auth.js';
import { redisClient, ensureRedisConnection } from '../utils/redis.js';
import { User, CreateUserData } from '../types/models.js';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    preferences: any;
  };
  tokens: TokenPair;
  sessionToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    const { email, password } = data;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user data
    const userData: CreateUserData = {
      email,
      password_hash: passwordHash,
      preferences: {
        defaultView: 'map',
        preferredSources: [],
        biasThreshold: 50,
        autoRefresh: true,
      },
    };

    // Create user in database
    const user = await UserModel.create(userData);

    // Generate tokens and session
    const tokens = generateTokenPair({ userId: user.id, email: user.email });
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Store session in database
    await UserSessionModel.create({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt,
    });

    // Store session in Redis for faster access
    try {
      await ensureRedisConnection();
      const expirationSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      await redisClient.setSession(sessionToken, user.id, expirationSeconds);
    } catch (error) {
      console.warn('Failed to store session in Redis:', error);
      // Continue without Redis - database session is still valid
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences,
      },
      tokens,
      sessionToken,
    };
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens and session
    const tokens = generateTokenPair({ userId: user.id, email: user.email });
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiration();

    // Store session in database
    await UserSessionModel.create({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt,
    });

    // Store session in Redis for faster access
    try {
      await ensureRedisConnection();
      const expirationSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      await redisClient.setSession(sessionToken, user.id, expirationSeconds);
    } catch (error) {
      console.warn('Failed to store session in Redis:', error);
      // Continue without Redis - database session is still valid
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        preferences: user.preferences,
      },
      tokens,
      sessionToken,
    };
  }

  /**
   * Logout user (invalidate session)
   */
  static async logout(sessionToken: string): Promise<void> {
    // Remove from Redis
    try {
      await ensureRedisConnection();
      await redisClient.deleteSession(sessionToken);
    } catch (error) {
      console.warn('Failed to remove session from Redis:', error);
    }

    // Remove from database
    await UserSessionModel.deleteByToken(sessionToken);
  }

  /**
   * Logout all sessions for a user
   */
  static async logoutAll(userId: number): Promise<void> {
    // Remove from Redis
    try {
      await ensureRedisConnection();
      await redisClient.deleteUserSessions(userId);
    } catch (error) {
      console.warn('Failed to remove user sessions from Redis:', error);
    }

    // Remove from database
    await UserSessionModel.deleteAllByUserId(userId);
  }

  /**
   * Refresh session (extend expiration)
   */
  static async refreshSession(sessionToken: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    // Check if session exists in database
    const session = await UserSessionModel.findByToken(sessionToken);
    if (!session) {
      throw new Error('Invalid session token');
    }

    // Generate new expiration
    const newExpiresAt = getSessionExpiration();

    // Update database
    await UserSessionModel.updateExpiration(sessionToken, newExpiresAt);

    // Update Redis
    try {
      await ensureRedisConnection();
      const expirationSeconds = Math.floor((newExpiresAt.getTime() - Date.now()) / 1000);
      await redisClient.extendSession(sessionToken, expirationSeconds);
    } catch (error) {
      console.warn('Failed to extend session in Redis:', error);
    }

    return {
      sessionToken,
      expiresAt: newExpiresAt,
    };
  }

  /**
   * Validate session token
   */
  static async validateSession(sessionToken: string): Promise<User | null> {
    // Check Redis first
    try {
      await ensureRedisConnection();
      const userId = await redisClient.getSession(sessionToken);
      if (userId) {
        return await UserModel.findById(userId);
      }
    } catch (error) {
      console.warn('Failed to check session in Redis:', error);
    }

    // Fallback to database
    const session = await UserSessionModel.findByToken(sessionToken);
    if (!session) {
      return null;
    }

    return await UserModel.findById(session.user_id);
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    await UserSessionModel.deleteExpired();
    // Note: Redis handles expiration automatically
  }
}