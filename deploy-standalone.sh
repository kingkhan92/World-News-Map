#!/bin/bash

# Interactive World News Map - Standalone Deployment Script
# This script downloads and deploys the application without requiring repository cloning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"
DEPLOYMENT_DIR="news-map-deployment"

echo -e "${BLUE}Interactive World News Map - Standalone Deployment${NC}"
echo "=================================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Create deployment directory
if [ -d "$DEPLOYMENT_DIR" ]; then
    echo -e "${YELLOW}Warning: Deployment directory already exists${NC}"
    read -p "Do you want to continue and overwrite existing files? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

mkdir -p "$DEPLOYMENT_DIR"
cd "$DEPLOYMENT_DIR"

echo -e "${BLUE}Downloading deployment files...${NC}"

# Download required files
files=(
    "docker-compose.standalone.yml"
    ".env.standalone"
    "nginx.conf"
    "init-db.sh"
)

for file in "${files[@]}"; do
    echo "Downloading $file..."
    if curl -fsSL "$REPO_URL/$file" -o "$file"; then
        echo -e "${GREEN}✓ Downloaded $file${NC}"
    else
        echo -e "${RED}✗ Failed to download $file${NC}"
        exit 1
    fi
done

# Copy environment template
if [ ! -f ".env" ]; then
    cp ".env.standalone" ".env"
    echo -e "${GREEN}✓ Created .env file from template${NC}"
else
    echo -e "${YELLOW}! .env file already exists, skipping template copy${NC}"
fi

echo -e "${BLUE}Configuration Setup${NC}"
echo "==================="

# Check if .env file needs configuration
if grep -q "your-.*-api-key\|change_this" ".env"; then
    echo -e "${YELLOW}⚠ Configuration required!${NC}"
    echo ""
    echo "Please edit the .env file and configure the following:"
    echo "1. Database passwords (POSTGRES_PASSWORD, REDIS_PASSWORD)"
    echo "2. JWT secret (JWT_SECRET)"
    echo "3. API keys (NEWS_API_KEY, GUARDIAN_API_KEY, GEOCODING_API_KEY)"
    echo "4. LLM provider configuration (OPENAI_API_KEY, etc.)"
    echo ""
    echo "Required API keys:"
    echo "- NewsAPI.org: https://newsapi.org/"
    echo "- Guardian API: https://open-platform.theguardian.com/"
    echo "- Geocoding API: Google Maps, MapBox, or similar"
    echo "- OpenAI API: https://platform.openai.com/ (for bias analysis)"
    echo ""
    read -p "Press Enter after configuring the .env file..."
fi

echo -e "${BLUE}Starting deployment...${NC}"

# Pull images first
echo "Pulling Docker images..."
docker-compose -f docker-compose.standalone.yml pull

# Start services
echo "Starting services..."
docker-compose -f docker-compose.standalone.yml up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check service health
echo -e "${BLUE}Checking service health...${NC}"

services=("postgres" "redis" "backend" "frontend")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.standalone.yml ps "$service" | grep -q "Up (healthy)"; then
        echo -e "${GREEN}✓ $service is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ $service is starting...${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo "Access your application:"
echo "- Web Application: http://localhost"
echo "- API Health Check: http://localhost/api/health"
echo "- Backend API: http://localhost:3001"
echo "- Frontend: http://localhost:3000"
echo ""
echo "Optional Ollama deployment:"
echo "docker-compose -f docker-compose.standalone.yml --profile ollama up -d"
echo ""
echo "To stop the application:"
echo "docker-compose -f docker-compose.standalone.yml down"
echo ""
echo "To view logs:"
echo "docker-compose -f docker-compose.standalone.yml logs -f"