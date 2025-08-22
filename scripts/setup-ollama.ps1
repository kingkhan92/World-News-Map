# Setup script for Ollama local LLM provider (PowerShell version)
# This script helps users set up Ollama with a recommended model for bias analysis

param(
    [string]$Model = "llama2:7b",
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host "Usage: .\setup-ollama.ps1 [-Model <model-name>] [-Help]"
    Write-Host ""
    Write-Host "Setup Ollama with a model for News Map bias analysis"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Model        Model to pull and setup (default: llama2:7b)"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\setup-ollama.ps1                    # Setup with default model"
    Write-Host "  .\setup-ollama.ps1 -Model llama3:8b  # Setup with Llama 3 8B model"
    Write-Host "  .\setup-ollama.ps1 -Model mistral:7b # Setup with Mistral 7B model"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  - Docker and Docker Compose installed"
    Write-Host "  - PowerShell 5.1 or later"
    exit 0
}

Write-Host "🦙 Setting up Ollama for News Map Bias Analysis" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to check if Ollama is running
function Test-OllamaRunning {
    Write-Host "🔍 Checking if Ollama is running..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
        Write-Host "✅ Ollama is running" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Ollama is not running" -ForegroundColor Red
        return $false
    }
}

# Function to start Ollama with Docker Compose
function Start-OllamaDocker {
    Write-Host "🐳 Starting Ollama with Docker Compose..." -ForegroundColor Yellow
    
    try {
        & docker-compose --profile ollama up -d ollama
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Compose failed"
        }
    }
    catch {
        Write-Host "❌ Failed to start Ollama with Docker Compose: $_" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "⏳ Waiting for Ollama to start..." -ForegroundColor Yellow
    for ($i = 1; $i -le 30; $i++) {
        if (Test-OllamaRunning) {
            break
        }
        Write-Host "   Waiting... ($i/30)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    
    if (-not (Test-OllamaRunning)) {
        Write-Host "❌ Failed to start Ollama" -ForegroundColor Red
        exit 1
    }
}

# Function to pull the specified model
function Install-OllamaModel {
    param([string]$ModelName)
    
    Write-Host "📥 Pulling model: $ModelName" -ForegroundColor Yellow
    Write-Host "   This may take several minutes depending on model size..." -ForegroundColor Gray
    
    try {
        $body = @{ name = $ModelName } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/pull" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 600
        Write-Host "✅ Model $ModelName pulled successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to pull model $ModelName : $_" -ForegroundColor Red
        exit 1
    }
}

# Function to list available models
function Get-OllamaModels {
    Write-Host "📋 Available models:" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
        foreach ($model in $response.models) {
            Write-Host "   - $($model.name)" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   (Unable to list models: $_)" -ForegroundColor Gray
    }
}

# Function to test the model
function Test-OllamaModel {
    param([string]$ModelName)
    
    Write-Host "🧪 Testing model $ModelName..." -ForegroundColor Yellow
    
    try {
        $body = @{
            model = $ModelName
            messages = @(@{ role = "user"; content = "Hello" })
            stream = $false
        } | ConvertTo-Json -Depth 3
        
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
        
        if ($response.message.content) {
            Write-Host "✅ Model $ModelName is working correctly" -ForegroundColor Green
            Write-Host "   Response: $($response.message.content)" -ForegroundColor Gray
        }
        else {
            throw "No response content received"
        }
    }
    catch {
        Write-Host "❌ Model $ModelName test failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Main setup process
function Main {
    Write-Host "Model to setup: $Model" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if Ollama is already running
    if (-not (Test-OllamaRunning)) {
        Write-Host "🚀 Ollama is not running. Starting with Docker Compose..." -ForegroundColor Yellow
        Start-OllamaDocker
    }
    
    # Pull the model
    Install-OllamaModel -ModelName $Model
    
    # List available models
    Write-Host ""
    Get-OllamaModels
    
    # Test the model
    Write-Host ""
    Test-OllamaModel -ModelName $Model
    
    Write-Host ""
    Write-Host "🎉 Ollama setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Configuration for .env file:" -ForegroundColor Cyan
    Write-Host "   BIAS_ANALYSIS_PROVIDER=ollama" -ForegroundColor Gray
    Write-Host "   OLLAMA_BASE_URL=http://localhost:11434" -ForegroundColor Gray
    Write-Host "   OLLAMA_MODEL=$Model" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔧 To use Ollama as fallback provider:" -ForegroundColor Cyan
    Write-Host "   BIAS_ANALYSIS_PROVIDER=openai" -ForegroundColor Gray
    Write-Host "   BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📚 Recommended models for bias analysis:" -ForegroundColor Cyan
    Write-Host "   - llama2:7b (default, good balance of speed and quality)" -ForegroundColor Gray
    Write-Host "   - llama3:8b (better quality, slower)" -ForegroundColor Gray
    Write-Host "   - mistral:7b (fast and efficient)" -ForegroundColor Gray
    Write-Host "   - phi3:3.8b (very fast, smaller model)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔄 To pull a different model:" -ForegroundColor Cyan
    Write-Host "   .\setup-ollama.ps1 -Model <model-name>" -ForegroundColor Gray
}

# Run main setup
try {
    Main
}
catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}