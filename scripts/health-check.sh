#!/bin/bash

# Health check script for News Map application
# This script checks the health of all services

# Load environment variables
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# Configuration
HTTP_PORT=${HTTP_PORT:-80}
BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "🏥 News Map Health Check"
echo "========================"

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local service=$2
    local timeout=${3:-10}
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        echo "✅ $service: Healthy"
        return 0
    else
        echo "❌ $service: Unhealthy"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container=$1
    local service=$2
    
    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")
        if [ "$health" = "healthy" ] || [ "$health" = "no-health-check" ]; then
            echo "✅ $service Container: Running"
            return 0
        else
            echo "❌ $service Container: Unhealthy ($health)"
            return 1
        fi
    else
        echo "❌ $service Container: Not running"
        return 1
    fi
}

# Check Docker containers
echo "🐳 Docker Containers:"
check_container "news-map-postgres" "PostgreSQL"
postgres_status=$?

check_container "news-map-redis" "Redis"
redis_status=$?

check_container "news-map-backend" "Backend"
backend_status=$?

check_container "news-map-frontend" "Frontend"
frontend_status=$?

check_container "news-map-nginx" "NGINX"
nginx_status=$?

echo ""

# Check HTTP endpoints
echo "🌐 HTTP Endpoints:"
check_endpoint "http://localhost:$HTTP_PORT/health" "NGINX Health"
nginx_http_status=$?

check_endpoint "http://localhost:$HTTP_PORT/api/health" "Backend API"
backend_http_status=$?

check_endpoint "http://localhost:$HTTP_PORT/" "Frontend"
frontend_http_status=$?

echo ""

# Check database connectivity
echo "🗄️ Database Connectivity:"
if docker exec news-map-postgres pg_isready -U "${POSTGRES_USER:-news_map_user}" -d "${POSTGRES_DB:-news_map_db}" > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Connected"
    db_status=0
else
    echo "❌ PostgreSQL: Connection failed"
    db_status=1
fi

# Check Redis connectivity
if docker exec news-map-redis redis-cli --no-auth-warning -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1; then
    echo "✅ Redis: Connected"
    redis_conn_status=0
else
    echo "❌ Redis: Connection failed"
    redis_conn_status=1
fi

echo ""

# Overall status
echo "📊 Overall Status:"
total_checks=8
failed_checks=$((postgres_status + redis_status + backend_status + frontend_status + nginx_status + nginx_http_status + backend_http_status + frontend_http_status))

if [ $failed_checks -eq 0 ]; then
    echo "🎉 All systems operational!"
    exit 0
else
    echo "⚠️  $failed_checks out of $total_checks checks failed"
    
    # Show container logs for failed services
    echo ""
    echo "📋 Recent logs for failed services:"
    
    if [ $backend_status -ne 0 ] || [ $backend_http_status -ne 0 ]; then
        echo "--- Backend logs ---"
        docker logs --tail 10 news-map-backend 2>/dev/null || echo "Could not retrieve backend logs"
    fi
    
    if [ $frontend_status -ne 0 ] || [ $frontend_http_status -ne 0 ]; then
        echo "--- Frontend logs ---"
        docker logs --tail 10 news-map-frontend 2>/dev/null || echo "Could not retrieve frontend logs"
    fi
    
    if [ $nginx_status -ne 0 ] || [ $nginx_http_status -ne 0 ]; then
        echo "--- NGINX logs ---"
        docker logs --tail 10 news-map-nginx 2>/dev/null || echo "Could not retrieve nginx logs"
    fi
    
    exit 1
fi