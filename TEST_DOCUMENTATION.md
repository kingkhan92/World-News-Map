# Comprehensive Test Suite Documentation

This document describes the comprehensive test suite implemented for the Interactive World News Map application.

## Overview

The test suite covers all aspects of the application with multiple types of tests:

- **Unit Tests**: Test individual components, functions, and modules in isolation
- **Integration Tests**: Test interactions between different parts of the system
- **End-to-End Tests**: Test complete user workflows and scenarios
- **Performance Tests**: Test rendering performance and responsiveness
- **API Tests**: Test all backend endpoints with Supertest

## Test Structure

### Frontend Tests (`packages/frontend/src`)

```
src/
├── __tests__/
│   ├── e2e/                          # End-to-end tests
│   │   └── MapInteractions.e2e.test.tsx
│   ├── performance/                  # Performance tests
│   │   └── MapPerformance.test.tsx
│   └── test-runner.ts               # Test runner script
├── components/
│   ├── auth/__tests__/              # Authentication component tests
│   │   ├── LoginForm.test.tsx
│   │   ├── RegisterForm.test.tsx
│   │   ├── UserProfile.test.tsx
│   │   ├── LogoutButton.test.tsx
│   │   └── ProtectedRoute.test.tsx
│   ├── common/__tests__/            # Common component tests
│   │   ├── LoadingSpinner.test.tsx
│   │   ├── ConnectionStatus.test.tsx
│   │   ├── OfflineIndicator.test.tsx
│   │   ├── VirtualScrollList.test.tsx
│   │   └── ErrorHandling.integration.test.tsx
│   ├── filters/__tests__/           # Filter component tests
│   │   ├── DatePicker.test.tsx
│   │   ├── GeographicFilter.test.tsx
│   │   ├── KeywordSearch.test.tsx
│   │   ├── BiasFilter.test.tsx
│   │   ├── SourceFilter.test.tsx
│   │   ├── HistoricalNavigation.test.tsx
│   │   └── FilterPanel.integration.test.tsx
│   ├── layout/__tests__/            # Layout component tests
│   │   └── Layout.test.tsx
│   ├── map/__tests__/               # Map component tests
│   │   ├── MapContainer.test.tsx
│   │   ├── MapContainer.integration.test.tsx
│   │   ├── MapView.test.tsx
│   │   ├── MapView.integration.test.tsx
│   │   ├── GlobeView.test.tsx
│   │   ├── NewsPin.test.tsx
│   │   ├── PinCluster.test.tsx
│   │   ├── BiasIndicator.test.tsx
│   │   ├── ArticlePreview.test.tsx
│   │   └── ArticleModal.integration.test.tsx
│   └── settings/__tests__/          # Settings component tests
│       └── SettingsPanel.test.tsx
├── contexts/__tests__/              # Context tests
│   └── UserPreferencesContext.test.tsx
├── hooks/__tests__/                 # Custom hook tests
│   ├── useAuthForm.test.tsx
│   ├── useMapData.test.tsx
│   └── useRealTimeUpdates.test.tsx
├── services/__tests__/              # Service tests
│   ├── newsService.test.ts
│   ├── authService.test.ts
│   └── userService.test.ts
└── utils/__tests__/                 # Utility tests
    ├── leafletIcons.test.ts
    └── urlFilters.test.ts
```

### Backend Tests (`packages/backend/src`)

```
src/
├── __tests__/
│   ├── integration/                 # Integration tests
│   │   └── AuthFlow.integration.test.ts
│   └── test-runner.ts              # Test runner script
├── middleware/__tests__/            # Middleware tests
│   └── errorHandler.test.ts
├── models/__tests__/                # Model tests
│   ├── User.test.ts
│   ├── Article.test.ts
│   ├── UserSession.test.ts
│   └── UserInteraction.test.ts
├── routes/__tests__/                # Route tests
│   ├── auth.test.ts
│   ├── news.test.ts
│   ├── news-integration.test.ts
│   ├── user.test.ts
│   └── health.test.ts
├── services/__tests__/              # Service tests
│   ├── authService.test.ts
│   ├── newsAggregationService.test.ts
│   ├── biasAnalysisService.test.ts
│   ├── biasAnalysisIntegration.test.ts
│   ├── cacheService.test.ts
│   ├── newsScheduler.test.ts
│   └── socketService.test.ts
└── utils/__tests__/                 # Utility tests
    ├── auth.test.ts
    └── articleValidation.test.ts
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation

**Coverage**:
- All React components with props, state, and event handling
- All custom hooks with various input scenarios
- All utility functions and helper methods
- All service methods with mocked dependencies
- All database models with mocked database calls

**Example**:
```typescript
// Component unit test
it('renders login form with validation', () => {
  render(<LoginForm />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

// Service unit test
it('fetches articles with filters', async () => {
  mockApiClient.get.mockResolvedValue({ data: mockArticles });
  const result = await newsService.getArticles({ date: testDate });
  expect(result).toEqual(mockArticles);
});
```

### 2. Integration Tests

**Purpose**: Test interactions between different parts of the system

**Coverage**:
- Component integration with contexts and providers
- API endpoint integration with database and services
- Authentication flow from login to protected routes
- Filter panel integration with map updates
- Real-time updates integration with socket connections

**Example**:
```typescript
// Component integration test
it('updates map when filters are applied', async () => {
  render(<MapPageWithProviders />);
  
  const searchInput = screen.getByPlaceholderText(/search/i);
  fireEvent.change(searchInput, { target: { value: 'climate' } });
  
  await waitFor(() => {
    expect(mockNewsService.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: 'climate' })
    );
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows and scenarios

**Coverage**:
- User registration and login flow
- Map navigation and article interaction
- Filter application and URL state management
- View switching between 2D map and 3D globe
- Real-time updates and notifications
- Offline functionality and data caching

**Example**:
```typescript
// E2E test
it('completes full news exploration workflow', async () => {
  render(<App />);
  
  // Login
  await userEvent.click(screen.getByText(/login/i));
  await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  
  // Navigate to map
  await waitFor(() => {
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
  
  // Interact with news pin
  await userEvent.click(screen.getByTestId('news-pin-1'));
  
  // Verify article modal opens
  await waitFor(() => {
    expect(screen.getByTestId('article-modal')).toBeInTheDocument();
  });
});
```

### 4. Performance Tests

**Purpose**: Test rendering performance and responsiveness

**Coverage**:
- Map rendering with large datasets (100, 1000, 2000+ articles)
- View switching performance (2D ↔ 3D)
- Pin interaction response times
- Filter application performance
- Memory usage monitoring
- Animation frame rate testing

**Example**:
```typescript
// Performance test
it('renders 1000 articles within performance threshold', async () => {
  const articles = generateMockArticles(1000);
  const startTime = Date.now();
  
  render(<MapContainer articles={articles} />);
  
  await waitFor(() => {
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
  
  const renderTime = Date.now() - startTime;
  expect(renderTime).toBeLessThan(5000); // 5 second threshold
});
```

### 5. API Tests with Supertest

**Purpose**: Test all backend endpoints with real HTTP requests

**Coverage**:
- Authentication endpoints (login, register, logout, refresh)
- News endpoints (get articles, filters, sources)
- User endpoints (profile, preferences, history)
- Health check endpoints
- Error handling and validation
- Rate limiting and security measures

**Example**:
```typescript
// API test
it('GET /api/news/articles returns filtered articles', async () => {
  const response = await request(app)
    .get('/api/news/articles')
    .query({ date: '2023-01-01', keywords: 'climate' })
    .set('Authorization', `Bearer ${validToken}`)
    .expect(200);
  
  expect(response.body).toBeInstanceOf(Array);
  expect(response.body[0]).toHaveProperty('title');
  expect(response.body[0]).toHaveProperty('latitude');
});
```

## Test Commands

### Frontend Tests

```bash
# Run all frontend tests
npm run test:all

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only

# Development commands
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

### Backend Tests

```bash
# Run all backend tests
npm run test:all

# Run specific test suites
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:models       # Model tests only
npm run test:routes       # Route tests only
npm run test:services     # Service tests only

# Development commands
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

## Coverage Goals

### Minimum Coverage Targets

- **Overall Code Coverage**: 85%
- **Critical Paths**: 95% (authentication, data fetching, error handling)
- **Components**: 80%
- **Services**: 90%
- **Models**: 95%
- **API Routes**: 90%

### Coverage Reports

Coverage reports are generated in multiple formats:
- Terminal summary during test runs
- HTML reports in `coverage/` directory
- JSON reports for CI/CD integration

## Mocking Strategy

### Frontend Mocks

- **API Calls**: Mock `apiClient` and service methods
- **External Libraries**: Mock Leaflet, Three.js, Socket.io
- **Browser APIs**: Mock `localStorage`, `sessionStorage`, `navigator`
- **Contexts**: Provide mock context values for testing

### Backend Mocks

- **Database**: Mock Knex query builder methods
- **External APIs**: Mock news APIs, geocoding services
- **Redis**: Mock Redis client methods
- **File System**: Mock file operations when needed

## Continuous Integration

### Test Pipeline

1. **Lint Check**: ESLint validation
2. **Unit Tests**: Fast, isolated tests
3. **Integration Tests**: Component and API integration
4. **E2E Tests**: Full workflow validation
5. **Performance Tests**: Rendering and response time validation
6. **Coverage Report**: Generate and validate coverage metrics

### Quality Gates

- All tests must pass
- Coverage must meet minimum thresholds
- No linting errors
- Performance tests must meet benchmarks

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests focused and independent

### Test Data

- Use factories for generating test data
- Create realistic but minimal test datasets
- Avoid hardcoded values where possible
- Use constants for repeated test values

### Assertions

- Use specific assertions (`toEqual` vs `toBeTruthy`)
- Test both positive and negative cases
- Verify error conditions and edge cases
- Check accessibility attributes where relevant

### Performance

- Keep unit tests fast (< 100ms each)
- Use appropriate timeouts for async operations
- Mock expensive operations
- Parallelize test execution where possible

## Troubleshooting

### Common Issues

1. **Async Test Failures**: Use `waitFor` and proper async/await
2. **Mock Issues**: Ensure mocks are cleared between tests
3. **DOM Cleanup**: Use proper cleanup in React Testing Library
4. **Database State**: Reset database state between integration tests

### Debugging Tests

- Use `screen.debug()` to inspect rendered DOM
- Add `console.log` statements for debugging
- Use `--reporter=verbose` for detailed output
- Run single tests with `vitest run -t "test name"`

## Future Enhancements

### Planned Additions

- Visual regression testing with screenshot comparison
- Accessibility testing with axe-core
- Load testing with Artillery
- Contract testing for API endpoints
- Mutation testing for test quality validation

### Monitoring

- Test execution time tracking
- Flaky test detection and reporting
- Coverage trend analysis
- Performance benchmark tracking