// User-related interfaces
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultView?: 'map' | 'globe';
  preferredSources?: string[];
  biasThreshold?: number;
  autoRefresh?: boolean;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  preferences?: UserPreferences;
}

// Article-related interfaces
export interface Article {
  id: number;
  title: string;
  content: string;
  summary: string;
  url: string;
  source: string;
  published_at: Date;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  bias_score: number | null;
  bias_analysis: BiasAnalysis | null;
  created_at: Date;
  updated_at: Date;
}

export interface BiasAnalysis {
  politicalLean: 'left' | 'center' | 'right';
  factualAccuracy: number;
  emotionalTone: number;
  confidence: number;
}

export interface CreateArticleData {
  title: string;
  content: string;
  summary: string;
  url: string;
  source: string;
  published_at: Date;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  bias_score?: number | null;
  bias_analysis?: BiasAnalysis | null;
}

// Session-related interfaces
export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateSessionData {
  user_id: number;
  session_token: string;
  expires_at: Date;
}

// User interaction interfaces
export interface UserInteraction {
  id: number;
  user_id: number;
  article_id: number;
  interaction_type: 'view' | 'bookmark' | 'share';
  created_at: Date;
}

export interface CreateInteractionData {
  user_id: number;
  article_id: number;
  interaction_type: 'view' | 'bookmark' | 'share';
}

// Database table names
export const TABLE_NAMES = {
  USERS: 'users',
  ARTICLES: 'articles',
  USER_SESSIONS: 'user_sessions',
  USER_INTERACTIONS: 'user_interactions',
} as const;