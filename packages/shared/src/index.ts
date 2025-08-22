// Shared types and interfaces
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

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}