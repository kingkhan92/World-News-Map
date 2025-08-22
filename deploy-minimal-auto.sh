#!/bin/bash

# Automatic Minimal Deployment Script
# This script tries pre-built images first, falls back to local build if needed

set -e

FORCE_LOCAL=false
SHOW_HELP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-local)
            FORCE_LOCAL=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    cat << EOF
Interactive World News Map - Automatic Minimal Deployment

Usage: ./deploy-minimal-auto.sh [options]

Options:
  --force-local    Force local build instead of trying pre-built images
  --help, -h       Show this help message

This script will:
1. Check if pre-built images are accessible
2. Use pre-built images if available, otherwise build locally
3. Deploy the application with minimal configuration

EOF
    exit 0
fi

echo "🚀 Interactive World News Map - Automatic Minimal Deployment"
echo "============================================================"

# Check if source code is available for local build
HAS_SOURCE_CODE=false
if [ -f "packages/backend/Dockerfile" ] && [ -f "packages/frontend/Dockerfile" ]; then
    HAS_SOURCE_CODE=true
fi

if [ "$HAS_SOURCE_CODE" = false ] && [ "$FORCE_LOCAL" = true ]; then
    echo "❌ Error: Source code not available for local build"
    echo "   Make sure you're running this from the project root directory"
    exit 1
fi

# Test image accessibility
BACKEND_IMAGE="ghcr.io/kingkhan92/interactive-world-news-map-backend:latest"
FRONTEND_IMAGE="ghcr.io/kingkhan92/interactive-world-news-map-frontend:latest"
USE_PREBUILT=false

if [ "$FORCE_LOCAL" = false ]; then
    echo "🔍 Checking pre-built image accessibility..."
    
    if docker manifest inspect "$BACKEND_IMAGE" >/dev/null 2>&1 && docker manifest inspect "$FRONTEND_IMAGE" >/dev/null 2>&1; then
        echo "✅ Pre-built images are accessible"
        USE_PREBUILT=true
    else
        echo "⚠️  Pre-built images not accessible, will build locally"
    fi
fi

# Prepare environment
echo "📋 Preparing environment..."

if [ ! -f ".env" ]; then
    if [ -f ".env.minimal" ]; then
        cp ".env.minimal" ".env"
        echo "✅ Created .env from .env.minimal template"
        echo "⚠️  Please edit .env file with your actual values before continuing"
        echo "   Required: API keys, passwords, JWT secret"
        
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled. Please edit .env and run again."
            exit 0
        fi
    else
        echo "❌ Error: No .env file found and no .env.minimal template available"
        exit 1
    fi
fi

# Choose deployment strategy
if [ "$USE_PREBUILT" = true ]; then
    echo "🐳 Using pre-built images from GitHub Container Registry"
    COMPOSE_FILE="docker-compose.minimal.yml"
else
    if [ "$HAS_SOURCE_CODE" = true ]; then
        echo "🔨 Building images locally from source code"
        COMPOSE_FILE="docker-compose.minimal-local.yml"
    else
        echo "❌ Error: Cannot use pre-built images and no source code available"
        echo "   Either wait for images to become public or run from source directory"
        exit 1
    fi
fi

# Deploy
echo "🚀 Starting deployment..."
echo "   Using: $COMPOSE_FILE"

if [ "$USE_PREBUILT" = true ]; then
    docker-compose -f "$COMPOSE_FILE" up -d
else
    docker-compose -f "$COMPOSE_FILE" up -d --build
fi

echo "✅ Deployment successful!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/api/health"
echo ""
echo "📊 Monitor logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose -f $COMPOSE_FILE down"