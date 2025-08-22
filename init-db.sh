#!/bin/bash

# Database initialization script for standalone deployment
# This script downloads and applies database migrations and seeds

set -e

echo "Initializing database for Interactive World News Map..."

# Configuration
REPO_URL="https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"
MIGRATIONS_DIR="/tmp/migrations"
SEEDS_DIR="/tmp/seeds"

# Create temporary directories
mkdir -p "$MIGRATIONS_DIR" "$SEEDS_DIR"

# Download migration files
echo "Downloading database migrations..."
migration_files=(
    "001_create_users_table.sql"
    "002_create_articles_table.sql"
    "003_create_user_sessions_table.sql"
    "004_create_user_interactions_table.sql"
    "005_add_article_performance_indexes.sql"
)

for file in "${migration_files[@]}"; do
    if curl -fsSL "$REPO_URL/packages/backend/migrations/$file" -o "$MIGRATIONS_DIR/$file"; then
        echo "Downloaded migration: $file"
    else
        echo "Warning: Could not download migration $file"
    fi
done

# Download seed files
echo "Downloading database seeds..."
seed_files=(
    "001_sample_data.sql"
)

for file in "${seed_files[@]}"; do
    if curl -fsSL "$REPO_URL/packages/backend/seeds/$file" -o "$SEEDS_DIR/$file"; then
        echo "Downloaded seed: $file"
    else
        echo "Warning: Could not download seed $file"
    fi
done

# Apply migrations
echo "Applying database migrations..."
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo "Applying $(basename "$migration")..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < "$migration"
    fi
done

# Apply seeds (optional, only in development)
if [ "$NODE_ENV" != "production" ]; then
    echo "Applying database seeds..."
    for seed in "$SEEDS_DIR"/*.sql; do
        if [ -f "$seed" ]; then
            echo "Applying $(basename "$seed")..."
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" < "$seed" || echo "Warning: Seed failed, continuing..."
        fi
    done
fi

echo "Database initialization completed!"

# Cleanup
rm -rf "$MIGRATIONS_DIR" "$SEEDS_DIR"