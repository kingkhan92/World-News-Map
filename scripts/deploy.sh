#!/bin/bash
set -e

# News Map Deployment Script
# This script handles the deployment of the Interactive World News Map application

echo "🚀 Starting News Map deployment..."

# Check if required files exist
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml file not found!"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET" "NEWS_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set!"
        exit 1
    fi
done

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ssl
mkdir -p logs
mkdir -p backups

# Set proper permissions for scripts
chmod +x scripts/init-db.sh
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build application images
echo "🔨 Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        echo "✅ Services are healthy!"
        break
    fi
    
    if [ $counter -eq $timeout ]; then
        echo "❌ Timeout waiting for services to be healthy!"
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
    
    sleep 5
    counter=$((counter + 5))
    echo "Waiting... ($counter/$timeout seconds)"
done

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate

# Display service status
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

# Display access information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📍 Access Information:"
echo "   Web Application: http://localhost:${HTTP_PORT:-80}"
echo "   API Health Check: http://localhost:${HTTP_PORT:-80}/api/health"
echo "   System Health: http://localhost:${HTTP_PORT:-80}/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "   Backup database: ./scripts/backup.sh"
echo ""
echo "⚠️  Important: Make sure to:"
echo "   1. Configure your API keys in .env.production"
echo "   2. Set up SSL certificates for production use"
echo "   3. Configure proper firewall rules"
echo "   4. Set up regular database backups"