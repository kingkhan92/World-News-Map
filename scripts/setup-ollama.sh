#!/bin/bash

# Setup script for Ollama local LLM provider
# This script helps users set up Ollama with a recommended model for bias analysis

set -e

echo "🦙 Setting up Ollama for News Map Bias Analysis"
echo "================================================"

# Default model for bias analysis
DEFAULT_MODEL="llama2:7b"
MODEL=${1:-$DEFAULT_MODEL}

# Check if Ollama is running
check_ollama() {
    echo "🔍 Checking if Ollama is running..."
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is running"
        return 0
    else
        echo "❌ Ollama is not running"
        return 1
    fi
}

# Start Ollama service if using Docker Compose
start_ollama_docker() {
    echo "🐳 Starting Ollama with Docker Compose..."
    docker-compose --profile ollama up -d ollama
    
    echo "⏳ Waiting for Ollama to start..."
    for i in {1..30}; do
        if check_ollama; then
            break
        fi
        echo "   Waiting... ($i/30)"
        sleep 2
    done
    
    if ! check_ollama; then
        echo "❌ Failed to start Ollama"
        exit 1
    fi
}

# Pull the specified model
pull_model() {
    echo "📥 Pulling model: $MODEL"
    echo "   This may take several minutes depending on model size..."
    
    if curl -X POST http://localhost:11434/api/pull \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$MODEL\"}" \
        --progress-bar; then
        echo "✅ Model $MODEL pulled successfully"
    else
        echo "❌ Failed to pull model $MODEL"
        exit 1
    fi
}

# List available models
list_models() {
    echo "📋 Available models:"
    curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "   (Unable to list models - jq not installed)"
}

# Test the model with a simple request
test_model() {
    echo "🧪 Testing model $MODEL..."
    
    response=$(curl -s -X POST http://localhost:11434/api/chat \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"$MODEL\",
            \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}],
            \"stream\": false
        }")
    
    if echo "$response" | jq -e '.message.content' > /dev/null 2>&1; then
        echo "✅ Model $MODEL is working correctly"
        echo "   Response: $(echo "$response" | jq -r '.message.content')"
    else
        echo "❌ Model $MODEL test failed"
        echo "   Response: $response"
        exit 1
    fi
}

# Main setup process
main() {
    echo "Model to setup: $MODEL"
    echo ""
    
    # Check if Ollama is already running
    if ! check_ollama; then
        echo "🚀 Ollama is not running. Starting with Docker Compose..."
        start_ollama_docker
    fi
    
    # Pull the model
    pull_model
    
    # List available models
    echo ""
    list_models
    
    # Test the model
    echo ""
    test_model
    
    echo ""
    echo "🎉 Ollama setup complete!"
    echo ""
    echo "📝 Configuration for .env file:"
    echo "   BIAS_ANALYSIS_PROVIDER=ollama"
    echo "   OLLAMA_BASE_URL=http://localhost:11434"
    echo "   OLLAMA_MODEL=$MODEL"
    echo ""
    echo "🔧 To use Ollama as fallback provider:"
    echo "   BIAS_ANALYSIS_PROVIDER=openai"
    echo "   BIAS_ANALYSIS_FALLBACK_PROVIDERS=openai,ollama"
    echo ""
    echo "📚 Recommended models for bias analysis:"
    echo "   - llama2:7b (default, good balance of speed and quality)"
    echo "   - llama3:8b (better quality, slower)"
    echo "   - mistral:7b (fast and efficient)"
    echo "   - phi3:3.8b (very fast, smaller model)"
    echo ""
    echo "🔄 To pull a different model:"
    echo "   ./scripts/setup-ollama.sh <model-name>"
}

# Show usage if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Usage: $0 [model-name]"
    echo ""
    echo "Setup Ollama with a model for News Map bias analysis"
    echo ""
    echo "Arguments:"
    echo "  model-name    Model to pull and setup (default: $DEFAULT_MODEL)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Setup with default model ($DEFAULT_MODEL)"
    echo "  $0 llama3:8b         # Setup with Llama 3 8B model"
    echo "  $0 mistral:7b        # Setup with Mistral 7B model"
    echo ""
    echo "Prerequisites:"
    echo "  - Docker and Docker Compose installed"
    echo "  - curl installed"
    echo "  - jq installed (optional, for better output formatting)"
    exit 0
fi

# Run main setup
main