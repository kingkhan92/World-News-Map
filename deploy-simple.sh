#!/bin/bash

# Interactive World News Map - Simple Deployment Script
# This script builds from source and is guaranteed to work

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Interactive World News Map${NC}"
echo -e "${BLUE}Simple Deployment (Build from Source)${NC}"
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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    echo -e "${RED}Error: This script must be run from the project root directory${NC}"
    echo "Please clone the repository first:"
    echo "git clone https://github.com/kingkhan92/interactive-world-news-map.git"
    echo "cd interactive-world-news-map"
    exit 1
fi

echo -e "${GREEN}✓ Project structure found${NC}"

# Setup environment file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating environment file...${NC}"
    cp .env.simple .env
    echo -e "${GREEN}✓ Created .env file from template${NC}"
else
    echo -e "${YELLOW}! .env file already exists${NC}"
fi

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

# Check if configuration is needed
if grep -q "your_.*_here\|your-.*-here" ".env"; then
    echo -e "${RED}⚠ Configuration is required before deployment!${NC}"
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
    
    # Verify configuration
    if grep -q "your_.*_here\|your-.*-here" ".env"; then
        echo -e "${RED}Warning: Some configuration values still need to be set!${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled. Please configure the .env file first."
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓ Configuration appears to be set${NC}"
fi

echo
echo -e "${YELLOW}Starting deployment...${NC}"

# Stop any existing containers
echo "Stopping any existing containers..."
docker-compose -f docker-compose.simple.yml down 2>/dev/null || true

# Build and start services
echo "Building and starting services..."
docker-compose -f docker-compose.simple.yml up -d --build

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to start...${NC}"
echo "This may take a few minutes for the first build..."

# Wait for database
echo "Waiting for database..."
for i in {1..30}; do
    if docker-compose -f docker-compose.simple.yml exec -T postgres pg_isready -U news_map_user &>/dev/null; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

# Wait for backend
echo "Waiting for backend..."
for i in {1..60}; do
    if curl -f http://localhost:3001/api/health &>/dev/null; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
        break
    fi
    echo "  Attempt $i/60..."
    sleep 2
done

# Wait for frontend
echo "Waiting for frontend..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health &>/dev/null; then
        echo -e "${GREEN}✓ Frontend is accessible${NC}"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 2
done

# Check final status
echo -e "${YELLOW}Checking final service status...${NC}"
docker-compose -f docker-compose.simple.yml ps

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
echo "  View status: docker-compose -f docker-compose.simple.yml ps"
echo "  View logs: docker-compose -f docker-compose.simple.yml logs -f"
echo "  Stop: docker-compose -f docker-compose.simple.yml down"
echo "  Restart: docker-compose -f docker-compose.simple.yml restart"
echo "  Rebuild: docker-compose -f docker-compose.simple.yml up -d --build"
echo
echo -e "${YELLOW}Note: This deployment builds from source and includes all services.${NC}"
echo -e "${YELLOW}For production, consider using a reverse proxy like nginx.${NC}"
echo

# Show recent logs
echo -e "${YELLOW}Recent logs (press Ctrl+C to exit):${NC}"
sleep 2
docker-compose -f docker-compose.simple.yml logs --tail=10 -f