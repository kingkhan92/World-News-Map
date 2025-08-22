#!/bin/bash

# Backend startup script with database migration support
set -e

echo "Starting Interactive World News Map Backend..."

# Function to run migrations
run_migrations() {
    echo "Running database migrations..."
    
    # Check if we have local migration files
    if [ -d "./migrations" ] && [ "$(ls -A ./migrations)" ]; then
        echo "Using local migration files..."
        # Run migrations using knex if available
        if command -v npx &> /dev/null; then
            npx knex migrate:latest || echo "Warning: Migration failed, continuing..."
        fi
    else
        echo "No local migrations found, checking for RUN_MIGRATIONS flag..."
        if [ "$RUN_MIGRATIONS" = "true" ]; then
            echo "Downloading and running migrations from GitHub..."
            
            # Create temp directory for migrations
            mkdir -p /tmp/migrations
            
            # Download migration files
            REPO_URL="https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"
            migration_files=(
                "001_create_users_table.sql"
                "002_create_articles_table.sql"
                "003_create_user_sessions_table.sql"
                "004_create_user_interactions_table.sql"
                "005_add_article_performance_indexes.sql"
            )
            
            for file in "${migration_files[@]}"; do
                if curl -fsSL "$REPO_URL/packages/backend/migrations/$file" -o "/tmp/migrations/$file"; then
                    echo "Downloaded migration: $file"
                else
                    echo "Warning: Could not download migration $file"
                fi
            done
            
            # Apply migrations directly to database
            for migration in /tmp/migrations/*.sql; do
                if [ -f "$migration" ]; then
                    echo "Applying $(basename "$migration")..."
                    # Use psql if available, otherwise skip
                    if command -v psql &> /dev/null; then
                        psql "$DATABASE_URL" -f "$migration" || echo "Warning: Migration $(basename "$migration") failed"
                    else
                        echo "Warning: psql not available, skipping SQL migration"
                    fi
                fi
            done
            
            # Cleanup
            rm -rf /tmp/migrations
        fi
    fi
}

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if node -e "
        const { Client } = require('pg');
        const client = new Client(process.env.DATABASE_URL);
        client.connect()
            .then(() => {
                console.log('Database connected successfully');
                client.end();
                process.exit(0);
            })
            .catch((err) => {
                console.log('Database connection failed:', err.message);
                process.exit(1);
            });
    "; then
        echo "Database is ready!"
        break
    else
        echo "Database not ready, attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "Warning: Database connection timeout, starting anyway..."
fi

# Run migrations if requested
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$NODE_ENV" = "development" ]; then
    run_migrations
fi

# Validate LLM configuration if script exists
if [ -f "../../scripts/validate-llm-config.js" ]; then
    echo "Validating LLM configuration..."
    node ../../scripts/validate-llm-config.js || echo "Warning: LLM validation failed, continuing..."
fi

# Start the application
echo "Starting application..."
exec node dist/index.js