# Interactive World News Map

A progressive web application for visualizing global news through interactive geographic mapping with bias analysis and user session management.

## Project Structure

```
interactive-world-news-map/
├── packages/
│   ├── frontend/          # React PWA with Three.js and Leaflet
│   ├── backend/           # Node.js/Express API server
│   └── shared/            # Shared TypeScript types and utilities
├── docker-compose.yml     # Development environment setup
├── nginx.conf            # Reverse proxy configuration
└── README.md
```

## Quick Start

### 🚀 Simple Deployment (Recommended - Always Works)

The **Simple Deployment** builds from source and is **guaranteed to work** on any system with Docker.

#### Prerequisites
- Docker (20.10+) and Docker Compose (2.0+)
- Git
- 4GB RAM available
- Internet connection

#### Linux/Mac:
```bash
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map
chmod +x deploy-simple.sh
./deploy-simple.sh
```

#### Windows PowerShell:
```powershell
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map
.\deploy-simple.ps1
```

#### Manual Deployment:
```bash
git clone https://github.com/kingkhan92/interactive-world-news-map.git
cd interactive-world-news-map
cp .env.simple .env
# Edit .env with your API keys (see API Keys section below)
docker-compose -f docker-compose.simple.yml up -d --build
```

#### 🎯 Access Your Application:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health

#### 📋 Required API Keys:
The deployment script will prompt you to configure these (all have free tiers):

1. **NewsAPI** - Register at https://newsapi.org/
2. **Guardian API** - Register at https://open-platform.theguardian.com/
3. **Geocoding API** - Google Maps, MapBox, or similar service
4. **OpenAI API** - Register at https://platform.openai.com/

#### 🛠 Management Commands:
```bash
# View status
docker-compose -f docker-compose.simple.yml ps

# View logs
docker-compose -f docker-compose.simple.yml logs -f

# Stop application
docker-compose -f docker-compose.simple.yml down

# Restart application
docker-compose -f docker-compose.simple.yml restart
```

#### 🆘 Need Help?
- **Troubleshooting:** See [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
- **Issues:** The Simple Deployment is designed to work reliably - if you encounter problems, please report them on GitHub Issues

### Alternative: Standalone Deployment (Pre-built Images)

Deploy without cloning the repository using pre-built Docker images:

**Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.sh | bash
```

**Windows PowerShell:**
```powershell
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.ps1'))
```

**Manual Deployment:**
```bash
mkdir news-map-deployment && cd news-map-deployment
curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/docker-compose.standalone.yml
curl -O https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/.env.standalone
cp .env.standalone .env
# Edit .env with your API keys
docker-compose -f docker-compose.standalone.yml up -d
```

Access your application at: http://localhost

📖 **[Complete Standalone Deployment Guide](STANDALONE_DEPLOYMENT.md)**

### 🌟 Coolify Deployment (One-Click Cloud Deployment)

Deploy directly in Coolify using pre-built Docker images - **no repository cloning required!**

**In Coolify Dashboard:**
1. **New Resource** → **Docker Compose**
2. **Paste** the contents of `docker-compose.coolify.yml`
3. **Configure** environment variables (API keys)
4. **Deploy!**

📖 **[Complete Coolify Deployment Guide](COOLIFY_DEPLOYMENT.md)**

### Alternative: Development Setup

1. **Clone and setup**:
   ```bash
   git clone https://github.com/kingkhan92/interactive-world-news-map.git
   cd interactive-world-news-map
   ```

2. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start development environment**:
   ```bash
   npm run dev
   ```

This will start all services using Docker Compose:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- NGINX Proxy: http://localhost:80

## Development

### Install dependencies
```bash
npm run install:all
```

### Build all packages
```bash
npm run build
```

### Run tests
```bash
npm run test
```

## Services

- **Frontend**: React 18 + TypeScript + Vite + Material-UI
- **Backend**: Node.js + Express + TypeScript + Socket.io
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Proxy**: NGINX

## Requirements

- Node.js 18+
- Docker & Docker Compose
- npm 9+

## 📚 Additional Resources

- **[Deployment Troubleshooting Guide](DEPLOYMENT_TROUBLESHOOTING.md)** - Solutions for common issues
- **[Deployment Summary](DEPLOYMENT_SUMMARY.md)** - Complete overview of all deployment options
- **[LLM Provider Configuration](LLM_PROVIDER_CONFIGURATION_GUIDE.md)** - Advanced AI configuration

## 🔑 API Configuration

The application requires several API keys for full functionality. The Simple Deployment script will guide you through setting these up:

| Service | Purpose | Free Tier | Get API Key |
|---------|---------|-----------|-------------|
| **NewsAPI** | News articles | ✅ 1000 requests/day | https://newsapi.org/ |
| **Guardian API** | News articles | ✅ 12,000 requests/day | https://open-platform.theguardian.com/ |
| **Geocoding** | Location data | ✅ Varies by provider | Google Maps, MapBox, etc. |
| **OpenAI** | AI bias analysis | ✅ $5 free credit | https://platform.openai.com/ |

## 🚨 Troubleshooting

**If the Simple Deployment doesn't work:**

1. **Check Prerequisites:** Ensure Docker and Docker Compose are installed and running
2. **Check Logs:** Run `docker-compose -f docker-compose.simple.yml logs -f`
3. **Try Manual Steps:** Follow the manual deployment instructions above
4. **Get Help:** Check [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) or open a GitHub issue

**The Simple Deployment is designed to be bulletproof - if it fails, it's likely a system configuration issue that we can help you resolve.**