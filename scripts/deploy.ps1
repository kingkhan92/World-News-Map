# News Map Deployment Script (PowerShell)
# This script handles the deployment of the Interactive World News Map application

Write-Host "🚀 Starting News Map deployment..." -ForegroundColor Green

# Check if required files exist
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ Error: .env.production file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.production.example to .env.production and configure it."
    exit 1
}

if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Host "❌ Error: docker-compose.prod.yml file not found!" -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content .env.production | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

# Validate required environment variables
$requiredVars = @("POSTGRES_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET", "NEWS_API_KEY")
foreach ($var in $requiredVars) {
    if (-not [Environment]::GetEnvironmentVariable($var)) {
        Write-Host "❌ Error: Required environment variable $var is not set!" -ForegroundColor Red
        exit 1
    }
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "ssl" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path "backups" | Out-Null

# Pull latest images
Write-Host "📦 Pulling latest Docker images..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml pull

# Build application images
Write-Host "🔨 Building application images..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
$timeout = 300
$counter = 0

do {
    $healthyServices = docker-compose -f docker-compose.prod.yml ps | Select-String "healthy"
    if ($healthyServices) {
        Write-Host "✅ Services are healthy!" -ForegroundColor Green
        break
    }
    
    if ($counter -ge $timeout) {
        Write-Host "❌ Timeout waiting for services to be healthy!" -ForegroundColor Red
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    }
    
    Start-Sleep -Seconds 5
    $counter += 5
    Write-Host "Waiting... ($counter/$timeout seconds)"
} while ($counter -lt $timeout)

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate

# Display service status
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

# Display access information
Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Information:" -ForegroundColor Cyan
$httpPort = [Environment]::GetEnvironmentVariable("HTTP_PORT")
if (-not $httpPort) { $httpPort = "80" }
Write-Host "   Web Application: http://localhost:$httpPort"
Write-Host "   API Health Check: http://localhost:$httpPort/api/health"
Write-Host "   System Health: http://localhost:$httpPort/health"
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "   Stop services: docker-compose -f docker-compose.prod.yml down"
Write-Host "   Restart services: docker-compose -f docker-compose.prod.yml restart"
Write-Host "   Backup database: .\scripts\backup.ps1"
Write-Host ""
Write-Host "⚠️  Important: Make sure to:" -ForegroundColor Yellow
Write-Host "   1. Configure your API keys in .env.production"
Write-Host "   2. Set up SSL certificates for production use"
Write-Host "   3. Configure proper firewall rules"
Write-Host "   4. Set up regular database backups"