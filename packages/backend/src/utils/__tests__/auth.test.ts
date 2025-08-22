import { describe, it, expect, beforeAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  generateSessionToken,
  getSessionExpiration,
  extractTokenFromHeader,
} from '../auth.js';

describe('Auth Utils', () => {
  describe('Password hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token generation', () => {
    it('should generate access token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const token = generateRefreshToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate token pair', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const tokens = generateTokenPair(payload);
      
      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate session token', () => {
      const token = generateSessionToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('Token verification', () => {
    it('should verify valid access token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);
      
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid or expired token');
    });
  });

  describe('Session utilities', () => {
    it('should generate session expiration date', () => {
      const expiration = getSessionExpiration();
      const now = new Date();
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Header token extraction', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'abc123def456';
      const header = `Bearer ${token}`;
      
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      const header = 'InvalidFormat abc123';
      
      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBeNull();
    });

    it('should return null for undefined header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });
  });
});