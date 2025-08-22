// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Article types
export interface Article {
  id: number;
  title: string;
  content: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: Date;
  latitude: number;
  longitude: number;
  locationName: string;
  biasScore: number;
  biasAnalysis: BiasAnalysis;
}

export interface BiasAnalysis {
  politicalLean: 'left' | 'center' | 'right';
  factualAccuracy: number;
  emotionalTone: number;
  confidence: number;
}

// User types
export interface User {
  id: number;
  email: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultView: 'map' | 'globe';
  preferredSources: string[];
  biasThreshold: number;
  autoRefresh: boolean;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}