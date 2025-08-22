import db from '../database/connection.js';
import { User, CreateUserData, UserPreferences, TABLE_NAMES } from '../types/models.js';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    const [user] = await db(TABLE_NAMES.USERS)
      .insert(userData)
      .returning('*');
    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    const user = await db(TABLE_NAMES.USERS)
      .where({ id })
      .first();
    return user || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const user = await db(TABLE_NAMES.USERS)
      .where({ email })
      .first();
    return user || null;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(id: number, preferences: UserPreferences): Promise<User | null> {
    const [user] = await db(TABLE_NAMES.USERS)
      .where({ id })
      .update({ preferences })
      .returning('*');
    return user || null;
  }

  /**
   * Delete user by ID
   */
  static async deleteById(id: number): Promise<boolean> {
    const deletedCount = await db(TABLE_NAMES.USERS)
      .where({ id })
      .del();
    return deletedCount > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await db(TABLE_NAMES.USERS)
      .where({ email })
      .first();
    return !!user;
  }
}