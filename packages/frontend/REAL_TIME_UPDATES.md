# Real-Time Updates Implementation

This document describes the real-time updates feature implemented using Socket.io for the Interactive World News Map application.

## Overview

The real-time updates system allows users to receive live news updates without refreshing the page. When new articles are published, existing articles are updated with bias analysis, or articles are removed, all connected users receive these updates instantly.

## Architecture

### Backend Components

1. **Socket.io Server** (`packages/backend/src/services/socketService.ts`)
   - Handles WebSocket connections
   - Authenticates users using JWT tokens
   - Manages user-specific rooms and geographic region subscriptions
   - Broadcasts news updates to connected clients

2. **News Broadcasting Integration**
   - News aggregation service broadcasts new articles
   - Article model broadcasts bias analysis updates
   - Supports different update types: 'new', 'updated', 'deleted'

### Frontend Components

1. **Socket.io Client Service** (`packages/frontend/src/services/socketService.ts`)
   - Manages WebSocket connection to server
   - Handles authentication and reconnection logic
   - Provides connection status monitoring
   - Supports geographic region subscriptions

2. **React Hook** (`packages/frontend/src/hooks/useRealTimeUpdates.ts`)
   - Integrates Socket.io with React components
   - Updates React Query cache automatically
   - Provides connection status and control methods
   - Handles custom event callbacks

3. **UI Components**
   - `ConnectionStatus`: Shows connection status in the app bar
   - `RealTimeIndicator`: Displays recent updates and notifications
   - Integrated into `MapContainer` for live pin updates

## Features

### Authentication
- JWT token-based authentication for Socket.io connections
- Automatic connection when user logs in
- Automatic disconnection when user logs out

### Connection Management
- Automatic reconnection with exponential backoff
- Connection status indicators
- Manual reconnection controls
- Ping/pong heartbeat monitoring

### News Updates
- Real-time broadcasting of new articles
- Live updates when bias analysis completes
- Automatic cache invalidation in React Query
- Visual notifications for new updates

### Geographic Subscriptions
- Subscribe to updates for specific map regions
- Efficient region-based broadcasting
- Automatic subscription management

### User-Specific Updates
- Private channels for user preferences
- Isolated session management
- Personal update history

## Usage

### Basic Setup

```typescript
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates'

const MyComponent = () => {
  const {
    isConnected,
    isConnecting,
    connectionError,
    subscribeToRegion,
    reconnect
  } = useRealTimeUpdates({
    onNewsUpdate: (data) => {
      console.log('New article:', data.article.title)
    },
    onConnectionStatusChange: (status) => {
      console.log('Connection status:', status)
    },
    autoConnect: true
  })

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {connectionError && <p>Error: {connectionError}</p>}
    </div>
  )
}
```

### Geographic Subscriptions

```typescript
// Subscribe to updates for a specific region
const bounds = {
  north: 41.0,
  south: 40.0,
  east: -73.0,
  west: -75.0
}

subscribeToRegion(bounds)

// Unsubscribe when no longer needed
unsubscribeFromRegion(bounds)
```

### Connection Status Display

```typescript
import { ConnectionStatus } from '../components/common/ConnectionStatus'

const Header = () => (
  <AppBar>
    <Toolbar>
      <Typography variant="h6">My App</Typography>
      <ConnectionStatus showDetails variant="chip" />
    </Toolbar>
  </AppBar>
)
```

## Configuration

### Environment Variables

Backend:
```env
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

Frontend:
```env
VITE_API_URL=http://localhost:3001
```

### Socket.io Options

The Socket.io client is configured with:
- WebSocket and polling transports
- 10-second connection timeout
- Automatic reconnection with 5 max attempts
- 1-second initial reconnection delay

## Error Handling

### Connection Errors
- Authentication failures (invalid/expired tokens)
- Network connectivity issues
- Server unavailability

### Graceful Degradation
- App continues to work without real-time updates
- Manual refresh options available
- Clear error messaging to users

### Retry Logic
- Automatic reconnection attempts
- Exponential backoff for failed connections
- Manual reconnection controls

## Performance Considerations

### Client-Side
- Efficient React Query cache updates
- Debounced connection status updates
- Lazy loading of Socket.io client

### Server-Side
- Room-based broadcasting for efficiency
- Geographic region optimization
- Connection pooling and cleanup

## Security

### Authentication
- JWT token validation on connection
- User session isolation
- Automatic token refresh handling

### Rate Limiting
- Connection attempt limits
- Message rate limiting
- Geographic subscription limits

## Testing

### Backend Tests
- Socket.io server authentication
- News broadcasting functionality
- User-specific update channels
- Error handling scenarios

### Frontend Tests
- React hook functionality
- Connection management
- Event handling
- Error scenarios

## Monitoring

### Connection Metrics
- Active connection count
- Connection success/failure rates
- Average connection duration

### Update Metrics
- News update broadcast frequency
- User engagement with updates
- Geographic subscription patterns

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check JWT token validity
   - Verify server is running
   - Check CORS configuration

2. **Updates Not Received**
   - Verify user is authenticated
   - Check geographic subscriptions
   - Confirm server broadcasting

3. **Performance Issues**
   - Monitor connection count
   - Check message frequency
   - Optimize region subscriptions

### Debug Tools

Enable debug logging:
```typescript
// Client-side
localStorage.debug = 'socket.io-client:*'

// Server-side
DEBUG=socket.io:* npm start
```

## Future Enhancements

- Push notifications for mobile devices
- Offline update queuing
- Advanced geographic filtering
- Real-time collaboration features
- Analytics and usage tracking