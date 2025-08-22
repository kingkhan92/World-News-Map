# Implementation Plan

- [x] 1. Set up project structure and development environment





  - Create monorepo structure with frontend, backend, and shared directories
  - Initialize package.json files with required dependencies
  - Set up TypeScript configurations for both frontend and backend
  - Create Docker Compose configuration for development environment
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement core database schema and models





  - Create PostgreSQL database schema with users, articles, and sessions tables
  - Write database migration scripts using Knex.js
  - Implement TypeScript interfaces for data models
  - Create database connection utilities and configuration
  - _Requirements: 4.2, 4.3, 2.2_

- [x] 3. Build authentication system foundation





  - Implement user registration and login API endpoints
  - Create JWT token generation and validation utilities
  - Write password hashing and verification functions
  - Implement session management with Redis integration
  - Create authentication middleware for protected routes
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 4. Create basic Express.js API server structure





  - Set up Express server with middleware configuration
  - Implement error handling middleware and logging
  - Create API route structure for news, auth, and user endpoints
  - Add request validation and sanitization middleware
  - Write basic health check and status endpoints
  - _Requirements: 5.3, 6.6_

- [x] 5. Implement news data models and storage





  - Create Article model with geographic coordinate fields
  - Implement database queries for article CRUD operations
  - Write functions for storing articles with location data
  - Create database indexes for geographic and date-based queries
  - Add article validation and sanitization functions
  - _Requirements: 1.4, 2.2, 7.1_

- [x] 6. Build news aggregation service





  - Implement news API integration (NewsAPI, Guardian, Reuters)
  - Create news fetching service with error handling
  - Write geographic location extraction from article content
  - Implement geocoding integration for location coordinates
  - Create scheduled job system for automatic news updates
  - _Requirements: 7.1, 7.3, 1.4_

- [x] 7. Implement bias analysis integration





  - Create bias analysis service interface
  - Integrate with AI/ML API for bias scoring
  - Implement bias score calculation and storage
  - Write functions to analyze article content for political lean
  - Create bias analysis caching mechanism
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Build news API endpoints





  - Implement GET /api/news/articles endpoint with filtering
  - Create article retrieval by date and geographic bounds
  - Write endpoint for individual article details
  - Implement news refresh trigger endpoint
  - Add pagination and sorting for article lists
  - _Requirements: 2.1, 2.3, 8.1, 8.3_

- [x] 9. Set up React frontend project structure





  - Initialize React project with TypeScript and Vite
  - Configure Material-UI theme and component library
  - Set up routing with React Router
  - Create basic component structure and folder organization
  - Configure PWA service worker setup
  - _Requirements: 6.1, 6.2_

- [x] 10. Implement authentication components





  - Create login and registration forms with validation
  - Build authentication context and hooks
  - Implement protected route wrapper component
  - Create user profile and preferences components
  - Add logout functionality and session management
  - _Requirements: 4.1, 4.5_

- [x] 11. Build 2D map visualization with Leaflet









  - Set up Leaflet map component with world view
  - Implement news pin markers with custom icons
  - Create pin clustering for dense areas
  - Add map interaction handlers (zoom, pan, click)
  - Implement pin click handlers for article preview
  - _Requirements: 1.1, 1.2_

- [x] 12. Create 3D globe visualization with Three.js





  - Set up Three.js scene with Earth geometry and textures
  - Implement 3D news pin positioning on globe surface
  - Create globe rotation and zoom controls
  - Add country boundary meshes and labels
  - Implement smooth transitions between 2D/3D views
  - _Requirements: 1.3_

- [x] 13. Build map container and view toggle system





  - Create main map container component
  - Implement toggle between 2D map and 3D globe views
  - Add smooth transitions and state management
  - Create unified pin data management for both views
  - Implement responsive design for different screen sizes
  - _Requirements: 1.3, 6.1_

- [x] 14. Implement article display and interaction





  - Create article modal component with full content display
  - Build article preview cards for pin hover/click
  - Implement bias score visualization with color coding
  - Add article sharing and bookmarking functionality
  - Create article source and publication date display
  - _Requirements: 1.2, 3.2, 6.2_

- [x] 15. Build date picker and historical navigation





  - Create date picker component for historical browsing
  - Implement date-based article filtering and display
  - Add calendar view for date selection
  - Create smooth transitions when changing dates
  - Implement date range selection for bulk viewing
  - _Requirements: 2.1, 2.3, 8.3_

- [x] 16. Implement filtering and search functionality





  - Create geographic region filter controls
  - Build keyword search functionality with highlighting
  - Implement bias score filtering with range sliders
  - Add news source filtering with checkboxes
  - Create filter state management and URL persistence
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 17. Add real-time updates with Socket.io





  - Set up Socket.io server and client connections
  - Implement real-time news update broadcasting
  - Create live pin updates on map without page refresh
  - Add connection status indicators and reconnection logic
  - Implement user-specific update channels
  - _Requirements: 7.2, 4.3_

- [x] 18. Build user preferences and settings





  - Create user preferences storage and API endpoints
  - Implement settings panel for map preferences
  - Add bias threshold and source preference controls
  - Create user interaction history tracking
  - Implement preference persistence across sessions
  - _Requirements: 4.3_

- [x] 19. Implement caching and performance optimization





  - Add Redis caching for frequently accessed articles
  - Implement frontend caching with React Query
  - Create lazy loading for map components and data
  - Add image optimization and compression
  - Implement virtual scrolling for large article lists
  - _Requirements: 6.3, 7.2_

- [x] 20. Create comprehensive error handling





  - Implement global error boundaries in React
  - Add user-friendly error messages and retry mechanisms
  - Create offline support with cached data fallback
  - Implement API error handling with proper status codes
  - Add loading states and progress indicators
  - _Requirements: 6.5, 6.4_

- [x] 21. Write comprehensive test suites





  - Create unit tests for all React components
  - Write API endpoint tests with Supertest
  - Implement integration tests for authentication flow
  - Create end-to-end tests for map interactions
  - Add performance tests for map rendering
  - _Requirements: All requirements validation_

- [x] 22. Finalize Docker deployment configuration





  - Create production Docker images for all services
  - Write comprehensive docker-compose.yml with all services
  - Add environment variable configuration
  - Create database initialization and migration scripts
  - Implement health checks and service dependencies
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 23. Add security hardening and production readiness





  - Implement rate limiting and API security measures
  - Add HTTPS configuration and security headers
  - Create input validation and sanitization
  - Implement proper error logging and monitoring
  - Add backup and recovery procedures documentation
  - _Requirements: 4.4, 6.5_
- [x] 24. Implement LLM provider abstraction layer
  - Create base LLMProvider interface and abstract class
  - Implement provider factory pattern for dynamic provider selection
  - Add provider configuration management with environment variables
  - Create provider health check and availability monitoring
  - Implement consistent bias analysis prompt templates across providers
  - _Requirements: 9.1, 9.4, 9.6_

- [x] 25. Build OpenAI provider implementation





  - Create OpenAI-specific provider class implementing LLMProvider interface
  - Implement OpenAI API client with proper authentication
  - Add structured prompts for bias analysis using GPT models
  - Implement response parsing and bias score normalization
  - Add error handling and retry logic for OpenAI API calls
  - _Requirements: 9.1, 9.4_

- [x] 26. Build Grok API provider implementation





  - Create Grok-specific provider class implementing LLMProvider interface
  - Implement Grok API client with authentication and request formatting
  - Adapt bias analysis prompts for Grok's model capabilities
  - Implement response parsing and score normalization for Grok responses
  - Add Grok-specific error handling and rate limiting
  - _Requirements: 9.1, 9.4_

- [x] 27. Build Ollama local provider implementation





  - Create Ollama-specific provider class for local LLM integration
  - Implement Ollama API client for local model communication
  - Add support for multiple Ollama models (Llama 2, Mistral, etc.)
  - Implement local model health checks and availability detection
  - Create optimized prompts for local model performance
  - _Requirements: 9.2, 9.4_

- [x] 28. Implement provider fallback and error handling





  - Create provider fallback chain with configurable priority order
  - Implement graceful degradation when primary providers fail
  - Add provider-specific error handling and logging
  - Create cached result fallback for when all providers are unavailable
  - Implement provider performance monitoring and automatic switching
  - _Requirements: 9.5_

- [x] 29. Update bias analysis service with multi-provider support





  - Refactor existing bias analysis service to use provider abstraction
  - Implement provider selection logic based on configuration
  - Add provider-specific caching with appropriate cache keys
  - Update bias analysis endpoints to support provider selection
  - Create provider status and health check endpoints
  - _Requirements: 9.1, 9.4, 9.6_

- [x] 30. Add LLM provider configuration and deployment updates





  - Update Docker Compose configuration with LLM provider environment variables
  - Create Ollama service container for local deployment option
  - Add provider configuration validation and startup checks
  - Update deployment documentation with provider setup instructions
  - Create provider configuration examples and best practices guide
  - _Requirements: 9.6_