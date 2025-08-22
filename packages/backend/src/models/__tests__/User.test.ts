import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { UserModel } from '../User.js';
import db from '../../database/connection.js';

describe('UserModel', () => {
  beforeAll(async () => {
    // Run migrations for test database
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Clean up and close connection
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await db('users').del();
  });

  it('should create a new user', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
      preferences: {
        defaultView: 'map' as const,
        biasThreshold: 50,
      },
    };

    const user = await UserModel.create(userData);

    expect(user).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.password_hash).toBe(userData.password_hash);
    expect(user.preferences).toEqual(userData.preferences);
    expect(user.id).toBeDefined();
    expect(user.created_at).toBeDefined();
  });

  it('should find user by email', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
    };

    const createdUser = await UserModel.create(userData);
    const foundUser = await UserModel.findByEmail(userData.email);

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(createdUser.id);
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should find user by ID', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
    };

    const createdUser = await UserModel.create(userData);
    const foundUser = await UserModel.findById(createdUser.id);

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(createdUser.id);
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should return null for non-existent user', async () => {
    const foundUser = await UserModel.findByEmail('nonexistent@example.com');
    expect(foundUser).toBeNull();
  });

  it('should update user preferences', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
    };

    const createdUser = await UserModel.create(userData);
    const newPreferences = {
      defaultView: 'globe' as const,
      biasThreshold: 75,
      autoRefresh: true,
    };

    const updatedUser = await UserModel.updatePreferences(createdUser.id, newPreferences);

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.preferences).toEqual(newPreferences);
  });

  it('should check if email exists', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
    };

    await UserModel.create(userData);

    const exists = await UserModel.emailExists(userData.email);
    const notExists = await UserModel.emailExists('nonexistent@example.com');

    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });

  it('should delete user by ID', async () => {
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
    };

    const createdUser = await UserModel.create(userData);
    const deleted = await UserModel.deleteById(createdUser.id);
    const foundUser = await UserModel.findById(createdUser.id);

    expect(deleted).toBe(true);
    expect(foundUser).toBeNull();
  });
});