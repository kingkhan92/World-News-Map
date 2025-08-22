# Interactive World News Map - Standalone Deployment Script for Windows
# This script downloads and deploys the application without requiring repository cloning

param(
    [switch]$SkipChecks = $false
)

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Configuration
$REPO_URL = "https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main"
$DEPLOYMENT_DIR = "news-map-deployment"

Write-Host "Interactive World News Map - Standalone Deployment" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

if (-not $SkipChecks) {
    # Check if Docker is installed
    try {
        $dockerVersion = docker --version
        Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "Error: Docker is not installed" -ForegroundColor Red
        Write-Host "Please install Docker Desktop first: https://docs.docker.com/desktop/windows/"
        exit 1
    }

    # Check if Docker Compose is available
    try {
        $composeVersion = docker-compose --version
        Write-Host "✓ Docker Compose is available: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "Error: Docker Compose is not available" -ForegroundColor Red
        Write-Host "Please ensure Docker Desktop is running"
        exit 1
    }
}

# Create deployment directory
if (Test-Path $DEPLOYMENT_DIR) {
    Write-Host "Warning: Deployment directory already exists" -ForegroundColor Yellow
    $continue = Read-Host "Do you want to continue and overwrite existing files? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Deployment cancelled"
        exit 1
    }
}

New-Item -ItemType Directory -Path $DEPLOYMENT_DIR -Force | Out-Null
Set-Location $DEPLOYMENT_DIR

Write-Host "Downloading deployment files..." -ForegroundColor Blue

# Download required files
$files = @(
    "docker-compose.standalone.yml",
    ".env.standalone",
    "nginx.conf",
    "init-db.sh"
)

foreach ($file in $files) {
    Write-Host "Downloading $file..."
    try {
        Invoke-WebRequest -Uri "$REPO_URL/$file" -OutFile $file -UseBasicParsing
        Write-Host "✓ Downloaded $file" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to download $file" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)"
        exit 1
    }
}

# Copy environment template
if (-not (Test-Path ".env")) {
    Copy-Item ".env.standalone" ".env"
    Write-Host "✓ Created .env file from template" -ForegroundColor Green
} else {
    Write-Host "! .env file already exists, skipping template copy" -ForegroundColor Yellow
}

Write-Host "Configuration Setup" -ForegroundColor Blue
Write-Host "==================="

# Check if .env file needs configuration
$envContent = Get-Content ".env" -Raw
if ($envContent -match "your-.*-api-key|change_this") {
    Write-Host "⚠ Configuration required!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please edit the .env file and configure the following:"
    Write-Host "1. Database passwords (POSTGRES_PASSWORD, REDIS_PASSWORD)"
    Write-Host "2. JWT secret (JWT_SECRET)"
    Write-Host "3. API keys (NEWS_API_KEY, GUARDIAN_API_KEY, GEOCODING_API_KEY)"
    Write-Host "4. LLM provider configuration (OPENAI_API_KEY, etc.)"
    Write-Host ""
    Write-Host "Required API keys:"
    Write-Host "- NewsAPI.org: https://newsapi.org/"
    Write-Host "- Guardian API: https://open-platform.theguardian.com/"
    Write-Host "- Geocoding API: Google Maps, MapBox, or similar"
    Write-Host "- OpenAI API: https://platform.openai.com/ (for bias analysis)"
    Write-Host ""
    
    # Open .env file in default editor
    try {
        Start-Process notepad.exe ".env"
        Write-Host "Opening .env file in Notepad for editing..."
    } catch {
        Write-Host "Please manually edit the .env file"
    }
    
    Read-Host "Press Enter after configuring the .env file"
}

Write-Host "Starting deployment..." -ForegroundColor Blue

# Pull images first
Write-Host "Pulling Docker images..."
docker-compose -f docker-compose.standalone.yml pull

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to pull Docker images" -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "Starting services..."
docker-compose -f docker-compose.standalone.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait for services to start
Write-Host "Waiting for services to start..."
Start-Sleep -Seconds 10

# Check service health
Write-Host "Checking service health..." -ForegroundColor Blue

$services = @("postgres", "redis", "backend", "frontend")
foreach ($service in $services) {
    $status = docker-compose -f docker-compose.standalone.yml ps $service
    if ($status -match "Up.*healthy") {
        Write-Host "✓ $service is healthy" -ForegroundColor Green
    } else {
        Write-Host "⚠ $service is starting..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:"
Write-Host "- Web Application: http://localhost"
Write-Host "- API Health Check: http://localhost/api/health"
Write-Host "- Backend API: http://localhost:3001"
Write-Host "- Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Optional Ollama deployment:"
Write-Host "docker-compose -f docker-compose.standalone.yml --profile ollama up -d"
Write-Host ""
Write-Host "To stop the application:"
Write-Host "docker-compose -f docker-compose.standalone.yml down"
Write-Host ""
Write-Host "To view logs:"
Write-Host "docker-compose -f docker-compose.standalone.yml logs -f"