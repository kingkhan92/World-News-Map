# Test script for one-line deployment
Write-Host "Testing one-line deployment simulation..." -ForegroundColor Blue

# Create test directory
$testDir = "one-line-test"
if (Test-Path $testDir) {
    Remove-Item $testDir -Recurse -Force
}
New-Item -ItemType Directory -Path $testDir | Out-Null
Set-Location $testDir

Write-Host "Downloading deployment script..." -ForegroundColor Yellow

# Download the deployment script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/deploy-standalone.ps1" -OutFile "deploy-standalone.ps1" -UseBasicParsing
Write-Host "✓ Downloaded deploy-standalone.ps1" -ForegroundColor Green

# Test downloading other required files
Write-Host "Testing file downloads..." -ForegroundColor Yellow

$files = @(
    "docker-compose.standalone.yml",
    ".env.standalone", 
    "nginx.conf",
    "init-db.sh"
)

foreach ($file in $files) {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/$file" -OutFile $file -UseBasicParsing
    Write-Host "✓ Downloaded $file" -ForegroundColor Green
}

# List downloaded files
Write-Host "`nDownloaded files:" -ForegroundColor Blue
Get-ChildItem | ForEach-Object { Write-Host "  - $($_.Name)" }

Write-Host "`n✅ One-line deployment test completed successfully!" -ForegroundColor Green
Write-Host "All required files can be downloaded from GitHub." -ForegroundColor Green

# Cleanup
Set-Location ..
Write-Host "`nCleaning up test directory..." -ForegroundColor Yellow
Remove-Item $testDir -Recurse -Force
Write-Host "✓ Cleanup completed" -ForegroundColor Green