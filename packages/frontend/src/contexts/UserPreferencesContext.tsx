import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserPreferences } from '@shared/types';
import { UserService } from '../services/userService';
import { useAuth } from './AuthContext';

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const defaultPreferences: UserPreferences = {
  defaultView: 'map',
  preferredSources: [],
  biasThreshold: 50,
  autoRefresh: true
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Load preferences when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
    } else {
      // Reset to defaults when not authenticated
      setPreferences(defaultPreferences);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPreferences = await UserService.getPreferences();
      setPreferences(userPreferences);
    } catch (err) {
      console.error('Failed to load user preferences:', err);
      setError('Failed to load preferences');
      // Keep default preferences on error
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      setError(null);
      const updatedPreferences = await UserService.updatePreferences(newPreferences);
      setPreferences(updatedPreferences);
    } catch (err) {
      console.error('Failed to update user preferences:', err);
      setError('Failed to update preferences');
      throw err;
    }
  };

  const value: UserPreferencesContextType = {
    preferences,
    updatePreferences,
    loading,
    error
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};