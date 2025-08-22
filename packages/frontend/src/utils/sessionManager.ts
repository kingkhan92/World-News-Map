/**
 * Session management utilities for handling authentication tokens and user data
 */

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';

export class SessionManager {
  /**
   * Store authentication token
   */
  static setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Get authentication token
   */
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Remove authentication token
   */
  static removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Store user data (for offline access)
   */
  static setUserData(userData: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }

  /**
   * Get stored user data
   */
  static getUserData(): any | null {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Remove user data
   */
  static removeUserData(): void {
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Clear all session data
   */
  static clearSession(): void {
    this.removeToken();
    this.removeUserData();
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.length > 0;
  }

  /**
   * Check if token is expired (basic check)
   */
  static isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Basic JWT token expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      // If we can't parse the token, consider it expired
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }
}

export default SessionManager;