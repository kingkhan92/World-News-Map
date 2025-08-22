# Ollama Model Setup Script for Windows PowerShell
# This script helps set up Ollama models for the Interactive World News Map application

param(
    [string]$Action = "menu",
    [string]$Model = ""
)

# Configuration
$OLLAMA_CONTAINER = "news-map-ollama"
$DEFAULT_MODEL = "llama2:7b"

# Colors for output
$RED = "Red"
$GREEN = "Green"
$YELLOW = "Yellow"
$BLUE = "Blue"

Write-Host "Interactive World News Map - Ollama Model Setup" -ForegroundColor $BLUE
Write-Host "==================================================" -ForegroundColor $BLUE

# Check if Ollama container is running
$containerRunning = docker ps --format "table {{.Names}}" | Select-String $OLLAMA_CONTAINER
if (-not $containerRunning) {
    Write-Host "Error: Ollama container '$OLLAMA_CONTAINER' is not running" -ForegroundColor $RED
    Write-Host "Please start the Ollama service first:"
    Write-Host "  docker-compose -f docker-compose.prod.yml --profile ollama up -d"
    exit 1
}

Write-Host "✓ Ollama container is running" -ForegroundColor $GREEN

# Function to pull a model
function Pull-Model {
    param([string]$ModelName)
    
    Write-Host "Pulling model: $ModelName" -ForegroundColor $YELLOW
    
    $result = docker exec $OLLAMA_CONTAINER ollama pull $ModelName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully pulled $ModelName" -ForegroundColor $GREEN
        return $true
    } else {
        Write-Host "✗ Failed to pull $ModelName" -ForegroundColor $RED
        return $false
    }
}

# Function to list available models
function List-Models {
    Write-Host "Available models in Ollama:" -ForegroundColor $BLUE
    docker exec $OLLAMA_CONTAINER ollama list
}

# Function to test a model
function Test-Model {
    param([string]$ModelName)
    
    Write-Host "Testing model: $ModelName" -ForegroundColor $YELLOW
    
    $testPrompt = "Analyze the bias in this statement: 'The government announced new policies today.'"
    
    $result = docker exec $OLLAMA_CONTAINER ollama run $ModelName $testPrompt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Model $ModelName is working correctly" -ForegroundColor $GREEN
        return $true
    } else {
        Write-Host "✗ Model $ModelName test failed" -ForegroundColor $RED
        return $false
    }
}

# Function to show menu
function Show-Menu {
    Write-Host ""
    Write-Host "What would you like to do?"
    Write-Host "1) Pull recommended models for development (llama2:7b, mistral:7b)"
    Write-Host "2) Pull recommended models for production (llama2:13b, codellama:13b)"
    Write-Host "3) Pull high-performance models (llama2:70b, mixtral:8x7b)"
    Write-Host "4) Pull a specific model"
    Write-Host "5) List currently installed models"
    Write-Host "6) Test a model"
    Write-Host "7) Remove a model"
    Write-Host "8) Exit"
    Write-Host ""
}

# Development models setup
function Setup-DevModels {
    Write-Host "Setting up development models..." -ForegroundColor $BLUE
    Pull-Model "llama2:7b"
    Pull-Model "mistral:7b"
    Write-Host "Development setup complete!" -ForegroundColor $GREEN
    Write-Host "Recommended environment configuration:"
    Write-Host "  OLLAMA_MODEL=llama2:7b"
}

# Production models setup
function Setup-ProdModels {
    Write-Host "Setting up production models..." -ForegroundColor $BLUE
    Pull-Model "llama2:13b"
    Pull-Model "codellama:13b"
    Write-Host "Production setup complete!" -ForegroundColor $GREEN
    Write-Host "Recommended environment configuration:"
    Write-Host "  OLLAMA_MODEL=llama2:13b"
}

# High-performance models setup
function Setup-HPModels {
    Write-Host "Setting up high-performance models..." -ForegroundColor $BLUE
    Write-Host "Warning: These models require significant RAM (40GB+ for llama2:70b)" -ForegroundColor $YELLOW
    $continue = Read-Host "Continue? (y/N)"
    
    if ($continue -match "^[Yy]$") {
        Pull-Model "llama2:70b"
        Pull-Model "mixtral:8x7b"
        Write-Host "High-performance setup complete!" -ForegroundColor $GREEN
        Write-Host "Recommended environment configuration:"
        Write-Host "  OLLAMA_MODEL=llama2:70b"
    }
}

# Pull specific model
function Pull-SpecificModel {
    Write-Host "Popular models for bias analysis:"
    Write-Host "  - llama2:7b (4GB RAM)"
    Write-Host "  - llama2:13b (8GB RAM)"
    Write-Host "  - llama2:70b (40GB RAM)"
    Write-Host "  - mistral:7b (4GB RAM)"
    Write-Host "  - codellama:13b (8GB RAM)"
    Write-Host "  - mixtral:8x7b (26GB RAM)"
    Write-Host ""
    
    $modelName = Read-Host "Enter model name (e.g., llama2:7b)"
    
    if ($modelName) {
        Pull-Model $modelName
    } else {
        Write-Host "No model name provided" -ForegroundColor $RED
    }
}

# Remove model
function Remove-Model {
    List-Models
    Write-Host ""
    $modelName = Read-Host "Enter model name to remove"
    
    if ($modelName) {
        Write-Host "Removing model: $modelName" -ForegroundColor $YELLOW
        $result = docker exec $OLLAMA_CONTAINER ollama rm $modelName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Successfully removed $modelName" -ForegroundColor $GREEN
        } else {
            Write-Host "✗ Failed to remove $modelName" -ForegroundColor $RED
        }
    } else {
        Write-Host "No model name provided" -ForegroundColor $RED
    }
}

# Test specific model
function Test-SpecificModel {
    List-Models
    Write-Host ""
    $modelName = Read-Host "Enter model name to test"
    
    if ($modelName) {
        Test-Model $modelName
    } else {
        Write-Host "No model name provided" -ForegroundColor $RED
    }
}

# Handle command line parameters
switch ($Action) {
    "dev" { Setup-DevModels; exit }
    "prod" { Setup-ProdModels; exit }
    "hp" { Setup-HPModels; exit }
    "pull" { 
        if ($Model) { Pull-Model $Model } 
        else { Write-Host "Please specify a model with -Model parameter" -ForegroundColor $RED }
        exit 
    }
    "list" { List-Models; exit }
    "test" { 
        if ($Model) { Test-Model $Model } 
        else { Test-SpecificModel }
        exit 
    }
}

# Main interactive loop
while ($true) {
    Show-Menu
    $choice = Read-Host "Choose an option (1-8)"
    
    switch ($choice) {
        "1" { Setup-DevModels }
        "2" { Setup-ProdModels }
        "3" { Setup-HPModels }
        "4" { Pull-SpecificModel }
        "5" { List-Models }
        "6" { Test-SpecificModel }
        "7" { Remove-Model }
        "8" { 
            Write-Host "Goodbye!" -ForegroundColor $GREEN
            exit 0 
        }
        default { 
            Write-Host "Invalid option. Please choose 1-8." -ForegroundColor $RED 
        }
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue..."
}