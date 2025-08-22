#!/bin/bash

# Ollama Model Setup Script
# This script helps set up Ollama models for the Interactive World News Map application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OLLAMA_CONTAINER="news-map-ollama"
DEFAULT_MODEL="llama2:7b"

echo -e "${BLUE}Interactive World News Map - Ollama Model Setup${NC}"
echo "=================================================="

# Check if Ollama container is running
if ! docker ps | grep -q $OLLAMA_CONTAINER; then
    echo -e "${RED}Error: Ollama container '$OLLAMA_CONTAINER' is not running${NC}"
    echo "Please start the Ollama service first:"
    echo "  docker-compose -f docker-compose.prod.yml --profile ollama up -d"
    exit 1
fi

echo -e "${GREEN}✓ Ollama container is running${NC}"

# Function to pull a model
pull_model() {
    local model=$1
    echo -e "${YELLOW}Pulling model: $model${NC}"
    
    if docker exec $OLLAMA_CONTAINER ollama pull $model; then
        echo -e "${GREEN}✓ Successfully pulled $model${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to pull $model${NC}"
        return 1
    fi
}

# Function to list available models
list_models() {
    echo -e "${BLUE}Available models in Ollama:${NC}"
    docker exec $OLLAMA_CONTAINER ollama list
}

# Function to test a model
test_model() {
    local model=$1
    echo -e "${YELLOW}Testing model: $model${NC}"
    
    local test_prompt="Analyze the bias in this statement: 'The government announced new policies today.'"
    
    if docker exec $OLLAMA_CONTAINER ollama run $model "$test_prompt" --timeout 30; then
        echo -e "${GREEN}✓ Model $model is working correctly${NC}"
        return 0
    else
        echo -e "${RED}✗ Model $model test failed${NC}"
        return 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1) Pull recommended models for development (llama2:7b, mistral:7b)"
    echo "2) Pull recommended models for production (llama2:13b, codellama:13b)"
    echo "3) Pull high-performance models (llama2:70b, mixtral:8x7b)"
    echo "4) Pull a specific model"
    echo "5) List currently installed models"
    echo "6) Test a model"
    echo "7) Remove a model"
    echo "8) Exit"
    echo ""
}

# Development models
setup_dev_models() {
    echo -e "${BLUE}Setting up development models...${NC}"
    pull_model "llama2:7b"
    pull_model "mistral:7b"
    echo -e "${GREEN}Development setup complete!${NC}"
    echo "Recommended environment configuration:"
    echo "  OLLAMA_MODEL=llama2:7b"
}

# Production models
setup_prod_models() {
    echo -e "${BLUE}Setting up production models...${NC}"
    pull_model "llama2:13b"
    pull_model "codellama:13b"
    echo -e "${GREEN}Production setup complete!${NC}"
    echo "Recommended environment configuration:"
    echo "  OLLAMA_MODEL=llama2:13b"
}

# High-performance models
setup_hp_models() {
    echo -e "${BLUE}Setting up high-performance models...${NC}"
    echo -e "${YELLOW}Warning: These models require significant RAM (40GB+ for llama2:70b)${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pull_model "llama2:70b"
        pull_model "mixtral:8x7b"
        echo -e "${GREEN}High-performance setup complete!${NC}"
        echo "Recommended environment configuration:"
        echo "  OLLAMA_MODEL=llama2:70b"
    fi
}

# Pull specific model
pull_specific_model() {
    echo "Popular models for bias analysis:"
    echo "  - llama2:7b (4GB RAM)"
    echo "  - llama2:13b (8GB RAM)"
    echo "  - llama2:70b (40GB RAM)"
    echo "  - mistral:7b (4GB RAM)"
    echo "  - codellama:13b (8GB RAM)"
    echo "  - mixtral:8x7b (26GB RAM)"
    echo ""
    read -p "Enter model name (e.g., llama2:7b): " model_name
    
    if [ -n "$model_name" ]; then
        pull_model "$model_name"
    else
        echo -e "${RED}No model name provided${NC}"
    fi
}

# Remove model
remove_model() {
    list_models
    echo ""
    read -p "Enter model name to remove: " model_name
    
    if [ -n "$model_name" ]; then
        echo -e "${YELLOW}Removing model: $model_name${NC}"
        if docker exec $OLLAMA_CONTAINER ollama rm $model_name; then
            echo -e "${GREEN}✓ Successfully removed $model_name${NC}"
        else
            echo -e "${RED}✗ Failed to remove $model_name${NC}"
        fi
    else
        echo -e "${RED}No model name provided${NC}"
    fi
}

# Test specific model
test_specific_model() {
    list_models
    echo ""
    read -p "Enter model name to test: " model_name
    
    if [ -n "$model_name" ]; then
        test_model "$model_name"
    else
        echo -e "${RED}No model name provided${NC}"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Choose an option (1-8): " choice
    
    case $choice in
        1)
            setup_dev_models
            ;;
        2)
            setup_prod_models
            ;;
        3)
            setup_hp_models
            ;;
        4)
            pull_specific_model
            ;;
        5)
            list_models
            ;;
        6)
            test_specific_model
            ;;
        7)
            remove_model
            ;;
        8)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please choose 1-8.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done