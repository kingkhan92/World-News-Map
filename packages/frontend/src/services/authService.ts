import { api } from './api';
import { AuthResponse, LoginRequest, RegisterRequest, User, UserPreferences } from '../types/api';

export class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  }

  // Update user preferences
  async updatePreferences(preferences: UserPreferences): Promise<User> {
    const response = await api.put<User>('/user/preferences', preferences);
    return response.data;
  }

  // Get user interaction history
  async getUserHistory(): Promise<any[]> {
    const response = await api.get<any[]>('/user/history');
    return response.data;
  }

  // Logout user (client-side only, token removal handled by context)
  logout(): void {
    // Any additional cleanup can be done here
    // The actual token removal is handled by the AuthContext
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;