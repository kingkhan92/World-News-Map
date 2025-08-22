# Interactive World News Map - Simple Deployment Script (PowerShell)
# This script builds from source and is guaranteed to work

param(
    [switch]$SkipConfig = $false
)

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Red($text) { Write-ColorOutput Red $text }
function Write-Green($text) { Write-ColorOutput Green $text }
function Write-Yellow($text) { Write-ColorOutput Yellow $text }
function Write-Blue($text) { Write-ColorOutput Blue $text }

Write-Blue "========================================"
Write-Blue "Interactive World News Map"
Write-Blue "Simple Deployment (Build from Source)"
Write-Blue "========================================"
Write-Output ""

# Check prerequisites
Write-Yellow "Checking prerequisites..."

try {
    $dockerVersion = docker --version
    Write-Green "✓ Docker is installed: $dockerVersion"
} catch {
    Write-Red "Error: Docker is not installed"
    Write-Output "Please install Docker Desktop: https://docs.docker.com/desktop/windows/"
    exit 1
}

try {
    $composeVersion = docker-compose --version
    Write-Green "✓ Docker Compose is available: $composeVersion"
} catch {
    try {
        $composeVersion = docker compose version
        Write-Green "✓ Docker Compose is available: $composeVersion"
    } catch {
        Write-Red "Error: Docker Compose is not available"
        Write-Output "Please install Docker Compose or update Docker Desktop"
        exit 1
    }
}

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "packages")) {
    Write-Red "Error: This script must be run from the project root directory"
    Write-Output "Please clone the repository first:"
    Write-Output "git clone https://github.com/kingkhan92/interactive-world-news-map.git"
    Write-Output "cd interactive-world-news-map"
    exit 1
}

Write-Green "✓ Project structure found"

# Setup environment file
if (-not (Test-Path ".env")) {
    Write-Yellow "Creating environment file..."
    Copy-Item ".env.simple" ".env"
    Write-Green "✓ Created .env file from template"
} else {
    Write-Yellow "! .env file already exists"
}

if (-not $SkipConfig) {
    # Configuration prompt
    Write-Yellow "========================================"
    Write-Yellow "CONFIGURATION REQUIRED"
    Write-Yellow "========================================"
    Write-Output ""
    Write-Yellow "Before starting the application, you need to configure API keys."
    Write-Yellow "Edit the .env file and set the following required values:"
    Write-Output ""
    Write-Blue "Required API Keys:"
    Write-Output "  - NEWS_API_KEY (from https://newsapi.org/)"
    Write-Output "  - GUARDIAN_API_KEY (from https://open-platform.theguardian.com/)"
    Write-Output "  - GEOCODING_API_KEY (Google Maps, MapBox, etc.)"
    Write-Output "  - OPENAI_API_KEY (from https://platform.openai.com/)"
    Write-Output ""
    Write-Blue "Security Settings (CHANGE THESE!):"
    Write-Output "  - POSTGRES_PASSWORD"
    Write-Output "  - REDIS_PASSWORD"
    Write-Output "  - JWT_SECRET"
    Write-Output ""

    # Check if configuration is needed
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "your_.*_here|your-.*-here") {
        Write-Red "⚠ Configuration is required before deployment!"
        Read-Host "Press Enter to open the configuration file for editing"
        
        # Try to open editor
        try {
            if (Get-Command notepad -ErrorAction SilentlyContinue) {
                Start-Process notepad ".env" -Wait
            } elseif (Get-Command code -ErrorAction SilentlyContinue) {
                Start-Process code ".env" -Wait
            } else {
                Write-Yellow "No suitable text editor found. Please edit .env manually."
                Write-Output "File location: $(Get-Location)\.env"
                Read-Host "Press Enter when you've finished editing the configuration"
            }
        } catch {
            Write-Yellow "Could not open editor automatically. Please edit .env manually."
            Write-Output "File location: $(Get-Location)\.env"
            Read-Host "Press Enter when you've finished editing the configuration"
        }
        
        # Verify configuration
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "your_.*_here|your-.*-here") {
            Write-Red "Warning: Some configuration values still need to be set!"
            $continue = Read-Host "Continue anyway? (y/N)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                Write-Output "Deployment cancelled. Please configure the .env file first."
                exit 1
            }
        }
    } else {
        Write-Green "✓ Configuration appears to be set"
    }
}

Write-Output ""
Write-Yellow "Starting deployment..."

# Stop any existing containers
Write-Output "Stopping any existing containers..."
try {
    docker-compose -f docker-compose.simple.yml down 2>$null
} catch {
    # Ignore errors if no containers are running
}

# Build and start services
Write-Output "Building and starting services..."
docker-compose -f docker-compose.simple.yml up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Red "Failed to start services. Check the logs for details."
    docker-compose -f docker-compose.simple.yml logs
    exit 1
}

# Wait for services to be healthy
Write-Yellow "Waiting for services to start..."
Write-Output "This may take a few minutes for the first build..."

# Wait for database
Write-Output "Waiting for database..."
for ($i = 1; $i -le 30; $i++) {
    try {
        $result = docker-compose -f docker-compose.simple.yml exec -T postgres pg_isready -U news_map_user 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Green "✓ Database is ready"
            break
        }
    } catch {}
    Write-Output "  Attempt $i/30..."
    Start-Sleep -Seconds 2
}

# Wait for backend
Write-Output "Waiting for backend..."
for ($i = 1; $i -le 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Green "✓ Backend is healthy"
            break
        }
    } catch {}
    Write-Output "  Attempt $i/60..."
    Start-Sleep -Seconds 2
}

# Wait for frontend
Write-Output "Waiting for frontend..."
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Green "✓ Frontend is accessible"
            break
        }
    } catch {}
    Write-Output "  Attempt $i/30..."
    Start-Sleep -Seconds 2
}

# Check final status
Write-Yellow "Checking final service status..."
docker-compose -f docker-compose.simple.yml ps

Write-Output ""
Write-Green "========================================"
Write-Green "DEPLOYMENT COMPLETE!"
Write-Green "========================================"
Write-Output ""
Write-Blue "Access your application:"
Write-Output "  Frontend: http://localhost:3000"
Write-Output "  Backend API: http://localhost:3001"
Write-Output "  Health Check: http://localhost:3001/api/health"
Write-Output ""
Write-Blue "Management commands:"
Write-Output "  View status: docker-compose -f docker-compose.simple.yml ps"
Write-Output "  View logs: docker-compose -f docker-compose.simple.yml logs -f"
Write-Output "  Stop: docker-compose -f docker-compose.simple.yml down"
Write-Output "  Restart: docker-compose -f docker-compose.simple.yml restart"
Write-Output "  Rebuild: docker-compose -f docker-compose.simple.yml up -d --build"
Write-Output ""
Write-Yellow "Note: This deployment builds from source and includes all services."
Write-Yellow "For production, consider using a reverse proxy like nginx."
Write-Output ""

# Show recent logs
Write-Yellow "Recent logs (press Ctrl+C to exit):"
Start-Sleep -Seconds 2
docker-compose -f docker-compose.simple.yml logs --tail=10 -f