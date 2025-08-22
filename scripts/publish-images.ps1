# Script to manually build and publish Docker images to GitHub Container Registry
# This ensures the images are available for docker-compose.minimal.yml

Write-Host "🚀 Building and publishing Docker images..." -ForegroundColor Blue

# Get repository info
$remoteUrl = git config --get remote.origin.url
$repoOwner = ($remoteUrl -replace '.*github.com[:/]([^/]*)/.*', '$1')
$repoName = ($remoteUrl -replace '.*[:/]([^/]*)/([^.]*)(\.git)?$', '$2')
$repoFull = "${repoOwner}/${repoName}"

Write-Host "Repository: $repoFull" -ForegroundColor Green

# Build and tag images
Write-Host "📦 Building backend image..." -ForegroundColor Yellow
docker build -t "ghcr.io/${repoFull}-backend:latest" -f packages/backend/Dockerfile .

Write-Host "📦 Building frontend image..." -ForegroundColor Yellow
docker build -t "ghcr.io/${repoFull}-frontend:latest" -f packages/frontend/Dockerfile .

# Login to GitHub Container Registry
Write-Host "🔐 Logging in to GitHub Container Registry..." -ForegroundColor Cyan
Write-Host "Please ensure you have a GitHub Personal Access Token with 'write:packages' permission" -ForegroundColor Yellow
Write-Host "You can create one at: https://github.com/settings/tokens" -ForegroundColor Yellow
Write-Host ""

# Check if already logged in
$dockerInfo = docker info 2>$null
if ($dockerInfo -match "ghcr.io") {
    Write-Host "✅ Already logged in to GHCR" -ForegroundColor Green
} else {
    Write-Host "Please login to GitHub Container Registry:" -ForegroundColor Yellow
    docker login ghcr.io
}

# Push images
Write-Host "📤 Pushing backend image..." -ForegroundColor Magenta
docker push "ghcr.io/${repoFull}-backend:latest"

Write-Host "📤 Pushing frontend image..." -ForegroundColor Magenta
docker push "ghcr.io/${repoFull}-frontend:latest"

Write-Host "✅ Images published successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Images are now available at:" -ForegroundColor Blue
Write-Host "  - ghcr.io/${repoFull}-backend:latest" -ForegroundColor Cyan
Write-Host "  - ghcr.io/${repoFull}-frontend:latest" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔧 To make images public (if needed):" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/${repoOwner}?tab=packages" -ForegroundColor White
Write-Host "2. Click on each package" -ForegroundColor White
Write-Host "3. Go to 'Package settings'" -ForegroundColor White
Write-Host "4. Change visibility to 'Public'" -ForegroundColor White
Write-Host ""
Write-Host "🎉 You can now use docker-compose.minimal.yml successfully!" -ForegroundColor Green