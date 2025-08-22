#!/bin/bash

# Interactive World News Map - Minimal Deployment Script
# This script deploys the application without nginx and ollama services
# For users who have these services deployed separately

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="news-map-minimal"
GITHUB_RAW_URL="https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Interactive World News Map${NC}"
echo -e "${BLUE}Minimal Deployment (No nginx/ollama)${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ Docker Compose is available${NC}"

# Create deployment directory
echo -e "${YELLOW}Creating deployment directory...${NC}"
mkdir -p "$DEPLOYMENT_DIR"
cd "$DEPLOYMENT_DIR"

# Download deployment files
echo -e "${YELLOW}Downloading deployment files...${NC}"

files=(
    "docker-compose.minimal.yml"
    ".env.minimal"
    "init-db.sh"
)

for file in "${files[@]}"; do
    echo "Downloading $file..."
    if curl -fsSL "$GITHUB_RAW_URL/$file" -o "$file"; then
        echo -e "${GREEN}✓ Downloaded $file${NC}"
    else
        echo -e "${RED}✗ Failed to download $file${NC}"
        exit 1
    fi
done

# Copy environment file
cp .env.minimal .env

# Make init script executable
chmod +x init-db.sh

echo -e "${GREEN}✓ All files downloaded successfully${NC}"
echo

# Configuration prompt
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}CONFIGURATION REQUIRED${NC}"
echo -e "${YELLOW}========================================${NC}"
echo
echo -e "${YELLOW}Before starting the application, you need to configure API keys.${NC}"
echo -e "${YELLOW}Edit the .env file and set the following required values:${NC}"
echo
echo -e "${BLUE}Required API Keys:${NC}"
echo "  - NEWS_API_KEY (from https://newsapi.org/)"
echo "  - GUARDIAN_API_KEY (from https://open-platform.theguardian.com/)"
echo "  - GEOCODING_API_KEY (Google Maps, MapBox, etc.)"
echo "  - OPENAI_API_KEY (from https://platform.openai.com/)"
echo
echo -e "${BLUE}Security Settings (CHANGE THESE!):${NC}"
echo "  - POSTGRES_PASSWORD"
echo "  - REDIS_PASSWORD"
echo "  - JWT_SECRET"
echo
echo -e "${BLUE}Optional (if using external services):${NC}"
echo "  - GROK_API_KEY (if using Grok)"
echo "  - OLLAMA_BASE_URL (if using external Ollama)"
echo

read -p "Press Enter to open the configuration file for editing..."

# Try to open editor
if command -v nano &> /dev/null; then
    nano .env
elif command -v vim &> /dev/null; then
    vim .env
elif command -v vi &> /dev/null; then
    vi .env
else
    echo -e "${YELLOW}No text editor found. Please edit .env manually.${NC}"
    echo "File location: $(pwd)/.env"
    read -p "Press Enter when you've finished editing the configuration..."
fi

echo
echo -e "${YELLOW}Starting deployment...${NC}"

# Pull latest images
echo "Pulling latest Docker images..."
docker-compose -f docker-compose.minimal.yml pull

# Start services
echo "Starting services..."
docker-compose -f docker-compose.minimal.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "${YELLOW}Checking service status...${NC}"
docker-compose -f docker-compose.minimal.yml ps

# Health check
echo -e "${YELLOW}Performing health checks...${NC}"
sleep 5

# Check backend health
if curl -f http://localhost:3001/api/health &> /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Backend health check failed (may still be starting)${NC}"
fi

# Check frontend
if curl -f http://localhost:3000 &> /dev/null; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Frontend health check failed (may still be starting)${NC}"
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${BLUE}Access your application:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  Health Check: http://localhost:3001/api/health"
echo
echo -e "${BLUE}Management commands:${NC}"
echo "  View status: docker-compose -f docker-compose.minimal.yml ps"
echo "  View logs: docker-compose -f docker-compose.minimal.yml logs -f"
echo "  Stop: docker-compose -f docker-compose.minimal.yml down"
echo "  Update: docker-compose -f docker-compose.minimal.yml pull && docker-compose -f docker-compose.minimal.yml up -d"
echo
echo -e "${YELLOW}Note: This minimal deployment excludes nginx and ollama.${NC}"
echo -e "${YELLOW}Configure your external reverse proxy to point to:${NC}"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo
echo -e "${YELLOW}If using external Ollama, ensure it's accessible at the configured URL.${NC}"
echo

# Show logs for a few seconds
echo -e "${YELLOW}Showing recent logs (press Ctrl+C to exit):${NC}"
sleep 2
docker-compose -f docker-compose.minimal.yml logs --tail=20 -f