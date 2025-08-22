#!/usr/bin/env pwsh

# Automatic Minimal Deployment Script
# This script tries pre-built images first, falls back to local build if needed

param(
    [switch]$ForceLocal,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Interactive World News Map - Automatic Minimal Deployment

Usage: ./deploy-minimal-auto.ps1 [options]

Options:
  -ForceLocal    Force local build instead of trying pre-built images
  -Help          Show this help message

This script will:
1. Check if pre-built images are accessible
2. Use pre-built images if available, otherwise build locally
3. Deploy the application with minimal configuration

"@ -ForegroundColor Green
    exit 0
}

Write-Host "🚀 Interactive World News Map - Automatic Minimal Deployment" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Check if source code is available for local build
$hasSourceCode = (Test-Path "packages/backend/Dockerfile") -and (Test-Path "packages/frontend/Dockerfile")

if (-not $hasSourceCode -and $ForceLocal) {
    Write-Host "❌ Error: Source code not available for local build" -ForegroundColor Red
    Write-Host "   Make sure you're running this from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Test image accessibility
$backendImage = "ghcr.io/kingkhan92/interactive-world-news-map-backend:latest"
$frontendImage = "ghcr.io/kingkhan92/interactive-world-news-map-frontend:latest"
$usePreBuilt = $false

if (-not $ForceLocal) {
    Write-Host "🔍 Checking pre-built image accessibility..." -ForegroundColor Yellow
    
    try {
        # Test backend image
        $backendTest = docker manifest inspect $backendImage 2>$null
        $frontendTest = docker manifest inspect $frontendImage 2>$null
        
        if ($backendTest -and $frontendTest) {
            Write-Host "✅ Pre-built images are accessible" -ForegroundColor Green
            $usePreBuilt = $true
        } else {
            Write-Host "⚠️  Pre-built images not accessible, will build locally" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Cannot access pre-built images, will build locally" -ForegroundColor Yellow
    }
}

# Prepare environment
Write-Host "📋 Preparing environment..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.minimal") {
        Copy-Item ".env.minimal" ".env"
        Write-Host "✅ Created .env from .env.minimal template" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file with your actual values before continuing" -ForegroundColor Yellow
        Write-Host "   Required: API keys, passwords, JWT secret" -ForegroundColor Yellow
        
        $continue = Read-Host "Continue with deployment? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "Deployment cancelled. Please edit .env and run again." -ForegroundColor Yellow
            exit 0
        }
    } else {
        Write-Host "❌ Error: No .env file found and no .env.minimal template available" -ForegroundColor Red
        exit 1
    }
}

# Choose deployment strategy
if ($usePreBuilt) {
    Write-Host "🐳 Using pre-built images from GitHub Container Registry" -ForegroundColor Green
    $composeFile = "docker-compose.minimal.yml"
} else {
    if ($hasSourceCode) {
        Write-Host "🔨 Building images locally from source code" -ForegroundColor Green
        $composeFile = "docker-compose.minimal-local.yml"
    } else {
        Write-Host "❌ Error: Cannot use pre-built images and no source code available" -ForegroundColor Red
        Write-Host "   Either wait for images to become public or run from source directory" -ForegroundColor Yellow
        exit 1
    }
}

# Deploy
Write-Host "🚀 Starting deployment..." -ForegroundColor Green
Write-Host "   Using: $composeFile" -ForegroundColor Cyan

try {
    if ($usePreBuilt) {
        docker-compose -f $composeFile up -d
    } else {
        docker-compose -f $composeFile up -d --build
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
        Write-Host "   Health:   http://localhost:3001/api/health" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Monitor logs:" -ForegroundColor Cyan
        Write-Host "   docker-compose -f $composeFile logs -f" -ForegroundColor White
        Write-Host ""
        Write-Host "🛑 Stop services:" -ForegroundColor Cyan
        Write-Host "   docker-compose -f $composeFile down" -ForegroundColor White
    } else {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        Write-Host "📋 Check logs:" -ForegroundColor Yellow
        Write-Host "   docker-compose -f $composeFile logs" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
}