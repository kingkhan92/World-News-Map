#!/bin/bash

# Script to manually build and publish Docker images to GitHub Container Registry
# This ensures the images are available for docker-compose.minimal.yml

set -e

echo "🚀 Building and publishing Docker images..."

# Get repository info
REPO_OWNER=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\).*/\1/')
REPO_NAME=$(git config --get remote.origin.url | sed 's/.*\/\([^.]*\).*/\1/')
REPO_FULL="${REPO_OWNER}/${REPO_NAME}"

echo "Repository: ${REPO_FULL}"

# Build and tag images
echo "📦 Building backend image..."
docker build -t ghcr.io/${REPO_FULL}-backend:latest -f packages/backend/Dockerfile .

echo "📦 Building frontend image..."
docker build -t ghcr.io/${REPO_FULL}-frontend:latest -f packages/frontend/Dockerfile .

# Login to GitHub Container Registry
echo "🔐 Logging in to GitHub Container Registry..."
echo "Please ensure you have a GitHub Personal Access Token with 'write:packages' permission"
echo "You can create one at: https://github.com/settings/tokens"
echo

# Check if already logged in
if docker info | grep -q "ghcr.io"; then
    echo "✅ Already logged in to GHCR"
else
    echo "Please login to GitHub Container Registry:"
    docker login ghcr.io
fi

# Push images
echo "📤 Pushing backend image..."
docker push ghcr.io/${REPO_FULL}-backend:latest

echo "📤 Pushing frontend image..."
docker push ghcr.io/${REPO_FULL}-frontend:latest

echo "✅ Images published successfully!"
echo
echo "Images are now available at:"
echo "  - ghcr.io/${REPO_FULL}-backend:latest"
echo "  - ghcr.io/${REPO_FULL}-frontend:latest"
echo
echo "🔧 To make images public (if needed):"
echo "1. Go to https://github.com/${REPO_OWNER}?tab=packages"
echo "2. Click on each package"
echo "3. Go to 'Package settings'"
echo "4. Change visibility to 'Public'"
echo
echo "🎉 You can now use docker-compose.minimal.yml successfully!"