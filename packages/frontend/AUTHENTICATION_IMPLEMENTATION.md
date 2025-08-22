# Frontend Authentication Implementation

This document describes the authentication system implementation for the Interactive World News Map frontend application.

## Overview

The authentication system provides secure user login, registration, session management, and protected routes. It's built using React Context API, TypeScript, and Material-UI components.

## Architecture

### Components Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication context and provider
├── components/
│   └── auth/
│       ├── LoginForm.tsx        # Login form component
│       ├── RegisterForm.tsx     # Registration form component
│       ├── ProtectedRoute.tsx   # Route protection wrapper
│       ├── UserProfile.tsx      # User profile and preferences
│       └── LogoutButton.tsx     # Logout functionality
├── pages/
│   ├── AuthPage.tsx            # Combined auth page (login/register)
│   └── ProfilePage.tsx         # User profile page
├── services/
│   └── authService.ts          # Authentication API service
├── hooks/
│   ├── useAuthRedirect.ts      # Authentication redirect logic
│   └── useAuthForm.ts          # Form handling utilities
└── utils/
    └── sessionManager.ts       # Session management utilities
```

## Key Features

### 1. Authentication Context (`AuthContext.tsx`)

Provides global authentication state management:

- **State Management**: User data, authentication status, loading states, errors
- **Actions**: Login, register, logout, user updates
- **Session Persistence**: Automatic token validation and user data persistence
- **Error Handling**: Centralized error management with user-friendly messages

### 2. Authentication Forms

#### LoginForm Component
- Email/password validation
- Password visibility toggle
- Form validation with real-time feedback
- Loading states and error display
- Switch to registration option

#### RegisterForm Component
- Email/password/confirm password validation
- Strong password requirements
- Real-time validation feedback
- Account creation with automatic login

### 3. Protected Routes (`ProtectedRoute.tsx`)

- Automatic authentication checking
- Redirect to login for unauthenticated users
- Loading states during authentication verification
- Preserve intended destination after login

### 4. User Profile Management (`UserProfile.tsx`)

- View and edit user preferences
- Map display preferences (2D/3D toggle)
- News source preferences
- Bias threshold settings
- Auto-refresh preferences

### 5. Session Management (`SessionManager.ts`)

Utility class for handling authentication tokens and user data:

- **Token Management**: Store, retrieve, and validate JWT tokens
- **User Data Caching**: Offline user data storage
- **Expiration Checking**: Automatic token expiration validation
- **Session Cleanup**: Complete session data removal

## API Integration

### Authentication Service (`authService.ts`)

Handles all authentication-related API calls:

```typescript
class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse>
  async register(userData: RegisterRequest): Promise<AuthResponse>
  async getProfile(): Promise<User>
  async updatePreferences(preferences: UserPreferences): Promise<User>
  async getUserHistory(): Promise<any[]>
}
```

### API Configuration (`api.ts`)

- Automatic token injection in requests
- Response interceptors for 401 handling
- Session cleanup on authentication failures
- Base URL configuration for development/production

## Security Features

### 1. Token Management
- JWT tokens stored in localStorage
- Automatic token expiration checking
- Token injection in API requests
- Secure token cleanup on logout

### 2. Form Validation
- Email format validation
- Password strength requirements
- Real-time validation feedback
- XSS prevention through proper input handling

### 3. Route Protection
- Authentication required for protected routes
- Automatic redirects for unauthenticated users
- Session validation on route changes

## Usage Examples

### 1. Using Authentication Context

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {user.email}!</div>;
};
```

### 2. Creating Protected Routes

```typescript
import { ProtectedRoute } from '../components/auth';

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/map" element={
      <ProtectedRoute>
        <MapPage />
      </ProtectedRoute>
    } />
  </Routes>
);
```

### 3. Using Authentication Forms

```typescript
import { LoginForm, RegisterForm } from '../components/auth';

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  
  return mode === 'login' ? (
    <LoginForm onSwitchToRegister={() => setMode('register')} />
  ) : (
    <RegisterForm onSwitchToLogin={() => setMode('login')} />
  );
};
```

## Testing

The authentication system includes comprehensive tests:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Authentication flow testing
- **Mock Services**: API service mocking for testing
- **Error Scenarios**: Error handling and edge cases

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
```

## Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3001/api  # Development API URL
```

### TypeScript Types

All authentication-related types are defined in `src/types/api.ts`:

```typescript
interface User {
  id: number;
  email: string;
  preferences: UserPreferences;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface LoginRequest {
  email: string;
  password: string;
}
```

## Error Handling

### Client-Side Errors
- Form validation errors with user-friendly messages
- Network error handling with retry options
- Session expiration notifications

### Server-Side Errors
- API error response parsing
- HTTP status code handling
- Automatic logout on authentication failures

## Performance Considerations

### Optimization Features
- Lazy loading of authentication components
- Efficient state management with React Context
- Minimal re-renders through proper dependency management
- Session data caching for offline access

### Bundle Size
- Tree-shaking compatible exports
- Minimal external dependencies
- Efficient component structure

## Future Enhancements

### Planned Features
- Social authentication (Google, GitHub)
- Two-factor authentication (2FA)
- Password reset functionality
- Remember me option
- Session timeout warnings

### Security Improvements
- Refresh token rotation
- CSRF protection
- Rate limiting on client side
- Enhanced password policies

## Troubleshooting

### Common Issues

1. **Token Expiration**: Automatic handling with user notification
2. **Network Errors**: Retry mechanisms and offline support
3. **Form Validation**: Real-time feedback and error messages
4. **Route Protection**: Proper redirect handling and state preservation

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('auth_debug', 'true');
```

This provides detailed authentication flow logging in the browser console.