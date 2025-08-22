import db from '../database/connection.js';
import { UserSession, CreateSessionData, TABLE_NAMES } from '../types/models.js';

export class UserSessionModel {
  /**
   * Create a new session
   */
  static async create(sessionData: CreateSessionData): Promise<UserSession> {
    const [session] = await db(TABLE_NAMES.USER_SESSIONS)
      .insert(sessionData)
      .returning('*');
    return session;
  }

  /**
   * Find session by token
   */
  static async findByToken(sessionToken: string): Promise<UserSession | null> {
    const session = await db(TABLE_NAMES.USER_SESSIONS)
      .where({ session_token: sessionToken })
      .andWhere('expires_at', '>', new Date())
      .first();
    return session || null;
  }

  /**
   * Find active sessions by user ID
   */
  static async findActiveByUserId(userId: number): Promise<UserSession[]> {
    return db(TABLE_NAMES.USER_SESSIONS)
      .where({ user_id: userId })
      .andWhere('expires_at', '>', new Date())
      .orderBy('created_at', 'desc');
  }

  /**
   * Delete session by token
   */
  static async deleteByToken(sessionToken: string): Promise<boolean> {
    const deletedCount = await db(TABLE_NAMES.USER_SESSIONS)
      .where({ session_token: sessionToken })
      .del();
    return deletedCount > 0;
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteAllByUserId(userId: number): Promise<number> {
    return db(TABLE_NAMES.USER_SESSIONS)
      .where({ user_id: userId })
      .del();
  }

  /**
   * Delete expired sessions
   */
  static async deleteExpired(): Promise<number> {
    return db(TABLE_NAMES.USER_SESSIONS)
      .where('expires_at', '<=', new Date())
      .del();
  }

  /**
   * Update session expiration
   */
  static async updateExpiration(sessionToken: string, expiresAt: Date): Promise<UserSession | null> {
    const [session] = await db(TABLE_NAMES.USER_SESSIONS)
      .where({ session_token: sessionToken })
      .update({ expires_at: expiresAt })
      .returning('*');
    return session || null;
  }

  /**
   * Check if session is valid and not expired
   */
  static async isValidSession(sessionToken: string): Promise<boolean> {
    const session = await db(TABLE_NAMES.USER_SESSIONS)
      .where({ session_token: sessionToken })
      .andWhere('expires_at', '>', new Date())
      .first();
    return !!session;
  }
}