#!/bin/bash
set -e

echo "Starting database initialization..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready. Running migrations..."

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $POSTGRES_DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB')\gexec
EOSQL

# Run migrations if they exist
if [ -d "/docker-entrypoint-initdb.d/migrations" ]; then
    echo "Running database migrations..."
    for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "Running migration: $(basename "$migration")"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
        fi
    done
fi

# Run seeds if they exist and we're not in production
if [ "$NODE_ENV" != "production" ] && [ -d "/docker-entrypoint-initdb.d/seeds" ]; then
    echo "Running database seeds..."
    for seed in /docker-entrypoint-initdb.d/seeds/*.sql; do
        if [ -f "$seed" ]; then
            echo "Running seed: $(basename "$seed")"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$seed"
        fi
    done
fi

echo "Database initialization completed successfully!"