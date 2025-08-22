#!/usr/bin/env pwsh

# Test script to check Docker image accessibility
Write-Host "Testing Docker image accessibility..." -ForegroundColor Green

$backendImage = "ghcr.io/kingkhan92/interactive-world-news-map-backend:latest"
$frontendImage = "ghcr.io/kingkhan92/interactive-world-news-map-frontend:latest"

Write-Host "Testing backend image: $backendImage" -ForegroundColor Yellow
try {
    docker pull $backendImage
    Write-Host "✅ Backend image accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend image not accessible: $_" -ForegroundColor Red
}

Write-Host "Testing frontend image: $frontendImage" -ForegroundColor Yellow
try {
    docker pull $frontendImage
    Write-Host "✅ Frontend image accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend image not accessible: $_" -ForegroundColor Red
}

Write-Host "Checking GitHub Container Registry..." -ForegroundColor Yellow
Write-Host "Backend: https://github.com/kingkhan92/interactive-world-news-map/pkgs/container/interactive-world-news-map-backend"
Write-Host "Frontend: https://github.com/kingkhan92/interactive-world-news-map/pkgs/container/interactive-world-news-map-frontend"