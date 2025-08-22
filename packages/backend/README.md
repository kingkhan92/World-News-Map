# Interactive World News Map - Backend

This is the backend API server for the Interactive World News Map application.

## Database Setup

### Prerequisites

- PostgreSQL server running locally or accessible via network
- Node.js and npm installed

### Environment Configuration

1. Copy `.env.example` to `.env` and update the database configuration:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=news_map_dev
DB_NAME_TEST=news_map_test
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
```

### Database Initialization

1. **Initialize the database** (run migrations):
   ```bash
   npm run db:init
   ```

2. **Reset the database** (rollback all migrations and re-run):
   ```bash
   npm run db:reset
   ```

3. **Seed the database** with sample data:
   ```bash
   npm run seed
   ```

### Manual Migration Commands

- Run migrations: `npm run migrate`
- Rollback last migration: `npm run migrate:rollback`

## Database Schema

The application uses the following tables:

### Users Table
- `id` - Primary key
- `email` - Unique user email
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp
- `preferences` - JSON object with user preferences

### Articles Table
- `id` - Primary key
- `title` - Article title
- `content` - Full article content
- `summary` - Article summary
- `url` - Unique article URL
- `source` - News source name
- `published_at` - Article publication date
- `latitude/longitude` - Geographic coordinates
- `location_name` - Human-readable location
- `bias_score` - Bias analysis score (0-100)
- `bias_analysis` - JSON object with detailed bias analysis
- `created_at/updated_at` - Record timestamps

### User Sessions Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `session_token` - Unique session token
- `expires_at` - Session expiration timestamp
- `created_at` - Session creation timestamp

### User Interactions Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `article_id` - Foreign key to articles table
- `interaction_type` - Type of interaction ('view', 'bookmark', 'share')
- `created_at` - Interaction timestamp

## Models

The application provides the following model classes:

- `UserModel` - User management operations
- `ArticleModel` - Article CRUD and filtering operations
- `UserSessionModel` - Session management
- `UserInteractionModel` - User interaction tracking

## Testing

Run the database test suite:
```bash
npm run test:db
```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on port 3001 by default and automatically initialize the database connection.

## API Endpoints

- `GET /` - API information
- `GET /api/health` - Health check with database status