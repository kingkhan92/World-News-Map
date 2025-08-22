# Test script for minimal deployment
# This script tests the minimal deployment configuration

Write-Host "Testing minimal deployment configuration..." -ForegroundColor Yellow

# Check if required files exist
$requiredFiles = @(
    "docker-compose.minimal.yml",
    ".env.minimal",
    "MINIMAL_DEPLOYMENT.md",
    "deploy-minimal.sh",
    "deploy-minimal.ps1"
)

Write-Host "Checking required files..." -ForegroundColor Blue
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
    }
}

# Validate docker-compose.minimal.yml
Write-Host "`nValidating docker-compose.minimal.yml..." -ForegroundColor Blue
try {
    docker-compose -f docker-compose.minimal.yml config > $null
    Write-Host "✓ docker-compose.minimal.yml is valid" -ForegroundColor Green
} catch {
    Write-Host "✗ docker-compose.minimal.yml has errors" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Check what services are defined
Write-Host "`nServices in minimal deployment:" -ForegroundColor Blue
$services = docker-compose -f docker-compose.minimal.yml config --services
foreach ($service in $services) {
    Write-Host "  - $service" -ForegroundColor Cyan
}

# Verify nginx and ollama are NOT included
if ($services -contains "nginx") {
    Write-Host "✗ nginx service found (should be excluded)" -ForegroundColor Red
} else {
    Write-Host "✓ nginx service excluded" -ForegroundColor Green
}

if ($services -contains "ollama") {
    Write-Host "✗ ollama service found (should be excluded)" -ForegroundColor Red
} else {
    Write-Host "✓ ollama service excluded" -ForegroundColor Green
}

# Check environment file
Write-Host "`nChecking environment configuration..." -ForegroundColor Blue
if (Test-Path ".env.minimal") {
    $envContent = Get-Content ".env.minimal" -Raw
    
    # Check for external Ollama configuration
    if ($envContent -match "OLLAMA_BASE_URL.*host\.docker\.internal") {
        Write-Host "✓ External Ollama configuration found" -ForegroundColor Green
    } else {
        Write-Host "⚠ External Ollama configuration not found" -ForegroundColor Yellow
    }
    
    # Check for CORS configuration
    if ($envContent -match "CORS_ORIGIN=\*") {
        Write-Host "✓ CORS configured for external proxy" -ForegroundColor Green
    } else {
        Write-Host "⚠ CORS configuration may need adjustment" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ .env.minimal file not found" -ForegroundColor Red
}

Write-Host "`nMinimal deployment test completed!" -ForegroundColor Yellow