# Health check script for News Map application (PowerShell)
# This script checks the health of all services

# Load environment variables
if (Test-Path ".env.production") {
    Get-Content .env.production | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Configuration
$httpPort = [Environment]::GetEnvironmentVariable("HTTP_PORT")
if (-not $httpPort) { $httpPort = "80" }

$backendPort = [Environment]::GetEnvironmentVariable("BACKEND_PORT")
if (-not $backendPort) { $backendPort = "3001" }

$frontendPort = [Environment]::GetEnvironmentVariable("FRONTEND_PORT")
if (-not $frontendPort) { $frontendPort = "3000" }

Write-Host "🏥 News Map Health Check" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Function to check HTTP endpoint
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Service,
        [int]$Timeout = 10
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Service`: Healthy" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Service`: Unhealthy (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Service`: Unhealthy (Error: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Function to check Docker container
function Test-Container {
    param(
        [string]$Container,
        [string]$Service
    )
    
    try {
        $containerInfo = docker ps --filter "name=$Container" --filter "status=running" --format "{{.Names}}"
        if ($containerInfo -eq $Container) {
            try {
                $health = docker inspect --format='{{.State.Health.Status}}' $Container 2>$null
                if (-not $health) { $health = "no-health-check" }
                
                if ($health -eq "healthy" -or $health -eq "no-health-check") {
                    Write-Host "✅ $Service Container: Running" -ForegroundColor Green
                    return $true
                } else {
                    Write-Host "❌ $Service Container: Unhealthy ($health)" -ForegroundColor Red
                    return $false
                }
            } catch {
                Write-Host "✅ $Service Container: Running (no health check)" -ForegroundColor Green
                return $true
            }
        } else {
            Write-Host "❌ $Service Container: Not running" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Service Container: Error checking status" -ForegroundColor Red
        return $false
    }
}

# Check Docker containers
Write-Host "🐳 Docker Containers:" -ForegroundColor Yellow
$postgresStatus = Test-Container "news-map-postgres" "PostgreSQL"
$redisStatus = Test-Container "news-map-redis" "Redis"
$backendStatus = Test-Container "news-map-backend" "Backend"
$frontendStatus = Test-Container "news-map-frontend" "Frontend"
$nginxStatus = Test-Container "news-map-nginx" "NGINX"

Write-Host ""

# Check HTTP endpoints
Write-Host "🌐 HTTP Endpoints:" -ForegroundColor Yellow
$nginxHttpStatus = Test-Endpoint "http://localhost:$httpPort/health" "NGINX Health"
$backendHttpStatus = Test-Endpoint "http://localhost:$httpPort/api/health" "Backend API"
$frontendHttpStatus = Test-Endpoint "http://localhost:$httpPort/" "Frontend"

Write-Host ""

# Check database connectivity
Write-Host "🗄️ Database Connectivity:" -ForegroundColor Yellow
try {
    $postgresUser = [Environment]::GetEnvironmentVariable("POSTGRES_USER")
    if (-not $postgresUser) { $postgresUser = "news_map_user" }
    
    $postgresDb = [Environment]::GetEnvironmentVariable("POSTGRES_DB")
    if (-not $postgresDb) { $postgresDb = "news_map_db" }
    
    $pgResult = docker exec news-map-postgres pg_isready -U $postgresUser -d $postgresDb 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL: Connected" -ForegroundColor Green
        $dbStatus = $true
    } else {
        Write-Host "❌ PostgreSQL: Connection failed" -ForegroundColor Red
        $dbStatus = $false
    }
} catch {
    Write-Host "❌ PostgreSQL: Connection failed" -ForegroundColor Red
    $dbStatus = $false
}

# Check Redis connectivity
try {
    $redisPassword = [Environment]::GetEnvironmentVariable("REDIS_PASSWORD")
    if ($redisPassword) {
        $redisResult = docker exec news-map-redis redis-cli --no-auth-warning -a $redisPassword ping 2>$null
    } else {
        $redisResult = docker exec news-map-redis redis-cli ping 2>$null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis: Connected" -ForegroundColor Green
        $redisConnStatus = $true
    } else {
        Write-Host "❌ Redis: Connection failed" -ForegroundColor Red
        $redisConnStatus = $false
    }
} catch {
    Write-Host "❌ Redis: Connection failed" -ForegroundColor Red
    $redisConnStatus = $false
}

Write-Host ""

# Overall status
Write-Host "📊 Overall Status:" -ForegroundColor Cyan
$totalChecks = 8
$failedChecks = 0

if (-not $postgresStatus) { $failedChecks++ }
if (-not $redisStatus) { $failedChecks++ }
if (-not $backendStatus) { $failedChecks++ }
if (-not $frontendStatus) { $failedChecks++ }
if (-not $nginxStatus) { $failedChecks++ }
if (-not $nginxHttpStatus) { $failedChecks++ }
if (-not $backendHttpStatus) { $failedChecks++ }
if (-not $frontendHttpStatus) { $failedChecks++ }

if ($failedChecks -eq 0) {
    Write-Host "🎉 All systems operational!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  $failedChecks out of $totalChecks checks failed" -ForegroundColor Yellow
    
    # Show container logs for failed services
    Write-Host ""
    Write-Host "📋 Recent logs for failed services:" -ForegroundColor Yellow
    
    if (-not $backendStatus -or -not $backendHttpStatus) {
        Write-Host "--- Backend logs ---" -ForegroundColor Cyan
        try {
            docker logs --tail 10 news-map-backend 2>$null
        } catch {
            Write-Host "Could not retrieve backend logs"
        }
    }
    
    if (-not $frontendStatus -or -not $frontendHttpStatus) {
        Write-Host "--- Frontend logs ---" -ForegroundColor Cyan
        try {
            docker logs --tail 10 news-map-frontend 2>$null
        } catch {
            Write-Host "Could not retrieve frontend logs"
        }
    }
    
    if (-not $nginxStatus -or -not $nginxHttpStatus) {
        Write-Host "--- NGINX logs ---" -ForegroundColor Cyan
        try {
            docker logs --tail 10 news-map-nginx 2>$null
        } catch {
            Write-Host "Could not retrieve nginx logs"
        }
    }
    
    exit 1
}