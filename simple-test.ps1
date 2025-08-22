Write-Host "Testing GitHub file downloads..." -ForegroundColor Blue

$files = @(
    "docker-compose.standalone.yml",
    ".env.standalone",
    "nginx.conf", 
    "init-db.sh",
    "deploy-standalone.ps1"
)

foreach ($file in $files) {
    Write-Host "Testing $file..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "https://raw.githubusercontent.com/kingkhan92/interactive-world-news-map/main/$file" -Method Head -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ $file is accessible" -ForegroundColor Green
        } else {
            Write-Host "✗ $file returned status $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $file failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nTest completed!" -ForegroundColor Blue