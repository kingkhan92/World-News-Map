# Interactive World News Map - Minimal Deployment Script (PowerShell)
# This script deploys the application without nginx and ollama services
# For users who have these services deployed separately

param(
    [switch]$SkipConfig = $false
)

# Configuration
$DeploymentDir = "news-map-minimal"
$GitHubRawUrl = "https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"

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
Write-Blue "Minimal Deployment (No nginx/ollama)"
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

# Create deployment directory
Write-Yellow "Creating deployment directory..."
if (Test-Path $DeploymentDir) {
    Write-Yellow "Directory $DeploymentDir already exists. Updating files..."
} else {
    New-Item -ItemType Directory -Path $DeploymentDir | Out-Null
}
Set-Location $DeploymentDir

# Download deployment files
Write-Yellow "Downloading deployment files..."

$files = @(
    "docker-compose.minimal.yml",
    ".env.minimal",
    "init-db.sh"
)

foreach ($file in $files) {
    Write-Output "Downloading $file..."
    try {
        Invoke-WebRequest -Uri "$GitHubRawUrl/$file" -OutFile $file -UseBasicParsing
        Write-Green "✓ Downloaded $file"
    } catch {
        Write-Red "✗ Failed to download $file"
        Write-Red $_.Exception.Message
        exit 1
    }
}

# Copy environment file
Copy-Item ".env.minimal" ".env"

Write-Green "✓ All files downloaded successfully"
Write-Output ""

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
    Write-Blue "Optional (if using external services):"
    Write-Output "  - GROK_API_KEY (if using Grok)"
    Write-Output "  - OLLAMA_BASE_URL (if using external Ollama)"
    Write-Output ""

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
}

Write-Output ""
Write-Yellow "Starting deployment..."

# Pull latest images
Write-Output "Pulling latest Docker images..."
try {
    docker-compose -f docker-compose.minimal.yml pull
} catch {
    Write-Red "Failed to pull images. Continuing with local images..."
}

# Start services
Write-Output "Starting services..."
docker-compose -f docker-compose.minimal.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Red "Failed to start services. Check the logs for details."
    docker-compose -f docker-compose.minimal.yml logs
    exit 1
}

# Wait for services to be healthy
Write-Yellow "Waiting for services to start..."
Start-Sleep -Seconds 10

# Check service status
Write-Yellow "Checking service status..."
docker-compose -f docker-compose.minimal.yml ps

# Health check
Write-Yellow "Performing health checks..."
Start-Sleep -Seconds 5

# Check backend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Green "✓ Backend is healthy"
    } else {
        Write-Yellow "⚠ Backend returned status code: $($response.StatusCode)"
    }
} catch {
    Write-Yellow "⚠ Backend health check failed (may still be starting)"
}

# Check frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Green "✓ Frontend is accessible"
    } else {
        Write-Yellow "⚠ Frontend returned status code: $($response.StatusCode)"
    }
} catch {
    Write-Yellow "⚠ Frontend health check failed (may still be starting)"
}

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
Write-Output "  View status: docker-compose -f docker-compose.minimal.yml ps"
Write-Output "  View logs: docker-compose -f docker-compose.minimal.yml logs -f"
Write-Output "  Stop: docker-compose -f docker-compose.minimal.yml down"
Write-Output "  Update: docker-compose -f docker-compose.minimal.yml pull; docker-compose -f docker-compose.minimal.yml up -d"
Write-Output ""
Write-Yellow "Note: This minimal deployment excludes nginx and ollama."
Write-Yellow "Configure your external reverse proxy to point to:"
Write-Output "  - Frontend: http://localhost:3000"
Write-Output "  - Backend API: http://localhost:3001"
Write-Output ""
Write-Yellow "If using external Ollama, ensure it's accessible at the configured URL."
Write-Output ""

# Show logs for a few seconds
Write-Yellow "Showing recent logs (press Ctrl+C to exit):"
Start-Sleep -Seconds 2
docker-compose -f docker-compose.minimal.yml logs --tail=20 -f