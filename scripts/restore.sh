#!/bin/bash
set -e

# Interactive World News Map - Comprehensive Restore Script
# This script restores database, Redis data, and configuration from backups

# Function to show usage
show_usage() {
    echo "Interactive World News Map - Restore Script"
    echo ""
    echo "Usage: $0 [OPTIONS] <backup_manifest.json>"
    echo ""
    echo "Options:"
    echo "  --db-only          Restore only the database"
    echo "  --redis-only       Restore only Redis data"
    echo "  --config-only      Restore only configuration files"
    echo "  --no-confirm       Skip confirmation prompts"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backups/backup_manifest_20241221_120000.json"
    echo "  $0 --db-only backups/backup_manifest_20241221_120000.json"
    echo ""
    echo "Available backup manifests:"
    ls -la ./backups/backup_manifest_*.json 2>/dev/null || echo "  No backup manifests found"
}

# Parse command line arguments
DB_ONLY=false
REDIS_ONLY=false
CONFIG_ONLY=false
NO_CONFIRM=false
MANIFEST_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --db-only)
            DB_ONLY=true
            shift
            ;;
        --redis-only)
            REDIS_ONLY=true
            shift
            ;;
        --config-only)
            CONFIG_ONLY=true
            shift
            ;;
        --no-confirm)
            NO_CONFIRM=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        -*)
            echo "❌ Error: Unknown option $1"
            show_usage
            exit 1
            ;;
        *)
            MANIFEST_FILE="$1"
            shift
            ;;
    esac
done

# Check if manifest file is provided
if [ -z "$MANIFEST_FILE" ]; then
    echo "❌ Error: No backup manifest file specified!"
    show_usage
    exit 1
fi

# Check if manifest file exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Error: Backup manifest file '$MANIFEST_FILE' not found!"
    exit 1
fi

# Load environment variables
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# Container names
POSTGRES_CONTAINER="news-map-postgres"
REDIS_CONTAINER="news-map-redis"
BACKEND_CONTAINER="news-map-backend"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed. Please install jq to continue."
    exit 1
fi

# Parse manifest file
BACKUP_DIR=$(dirname "$MANIFEST_FILE")
DB_FILE=$(jq -r '.files.database' "$MANIFEST_FILE")
REDIS_FILE=$(jq -r '.files.redis' "$MANIFEST_FILE")
LOGS_FILE=$(jq -r '.files.logs' "$MANIFEST_FILE")
CONFIG_FILE=$(jq -r '.files.configuration' "$MANIFEST_FILE")
BACKUP_TIMESTAMP=$(jq -r '.backup_timestamp' "$MANIFEST_FILE")

echo "=== Interactive World News Map - Restore Process Started ==="
echo "🕐 Restore timestamp: $(date)"
echo "📄 Manifest file: $MANIFEST_FILE"
echo "📁 Backup directory: $BACKUP_DIR"
echo "🗓️ Backup created: $BACKUP_TIMESTAMP"
echo ""

# Confirmation prompt
if [ "$NO_CONFIRM" = false ]; then
    echo "⚠️  WARNING: This will replace current data with backup data!"
    echo ""
    echo "Restore plan:"
    if [ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ]; then
        [ "$DB_FILE" != "null" ] && echo "  - Database: $DB_FILE"
        [ "$REDIS_FILE" != "null" ] && echo "  - Redis: $REDIS_FILE"
        [ "$CONFIG_FILE" != "null" ] && echo "  - Configuration: $CONFIG_FILE"
    else
        [ "$DB_ONLY" = true ] && [ "$DB_FILE" != "null" ] && echo "  - Database only: $DB_FILE"
        [ "$REDIS_ONLY" = true ] && [ "$REDIS_FILE" != "null" ] && echo "  - Redis only: $REDIS_FILE"
        [ "$CONFIG_ONLY" = true ] && [ "$CONFIG_FILE" != "null" ] && echo "  - Configuration only: $CONFIG_FILE"
    fi
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Restore cancelled by user"
        exit 1
    fi
    echo ""
fi

# 1. Database Restore
if [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$DB_FILE" != "null" ]; then
    echo "1. 🗄️ Starting database restore..."
    
    if docker ps | grep -q "$POSTGRES_CONTAINER"; then
        echo "   ✓ PostgreSQL container is running"
        
        DB_BACKUP_PATH="$BACKUP_DIR/$DB_FILE"
        if [ -f "$DB_BACKUP_PATH" ]; then
            # Extract backup file if compressed
            TEMP_FILE=""
            if [[ "$DB_BACKUP_PATH" == *.gz ]]; then
                echo "   🗜️ Extracting compressed backup..."
                TEMP_FILE="temp_restore_$(date +%s).sql"
                gunzip -c "$DB_BACKUP_PATH" > "$TEMP_FILE"
                RESTORE_FILE="$TEMP_FILE"
            else
                RESTORE_FILE="$DB_BACKUP_PATH"
            fi
            
            echo "   🔄 Restoring database..."
            docker exec -i "$POSTGRES_CONTAINER" psql \
                -U "${POSTGRES_USER:-news_map_user}" \
                -d "${POSTGRES_DB:-news_map_db}" < "$RESTORE_FILE"
            
            # Clean up temporary file
            if [ -n "$TEMP_FILE" ]; then
                rm -f "$TEMP_FILE"
            fi
            
            echo "   ✅ Database restore completed"
        else
            echo "   ❌ Database backup file not found: $DB_BACKUP_PATH"
        fi
    else
        echo "   ❌ PostgreSQL container '$POSTGRES_CONTAINER' is not running!"
        echo "   Please start the containers first: docker-compose up -d"
    fi
fi

# 2. Redis Restore
if [ "$DB_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$REDIS_FILE" != "null" ]; then
    echo ""
    echo "2. 🔴 Starting Redis restore..."
    
    if docker ps | grep -q "$REDIS_CONTAINER"; then
        echo "   ✓ Redis container is running"
        
        REDIS_BACKUP_PATH="$BACKUP_DIR/$REDIS_FILE"
        if [ -f "$REDIS_BACKUP_PATH" ]; then
            # Stop Redis temporarily
            echo "   ⏸️ Stopping Redis temporarily..."
            docker exec "$REDIS_CONTAINER" redis-cli SHUTDOWN NOSAVE || true
            sleep 2
            
            # Extract and copy Redis dump file
            TEMP_REDIS_FILE=""
            if [[ "$REDIS_BACKUP_PATH" == *.gz ]]; then
                echo "   🗜️ Extracting compressed Redis backup..."
                TEMP_REDIS_FILE="temp_redis_restore_$(date +%s).rdb"
                gunzip -c "$REDIS_BACKUP_PATH" > "$TEMP_REDIS_FILE"
                REDIS_RESTORE_FILE="$TEMP_REDIS_FILE"
            else
                REDIS_RESTORE_FILE="$REDIS_BACKUP_PATH"
            fi
            
            # Copy Redis dump file to container
            docker cp "$REDIS_RESTORE_FILE" "$REDIS_CONTAINER:/data/dump.rdb"
            
            # Restart Redis container
            echo "   🔄 Restarting Redis container..."
            docker restart "$REDIS_CONTAINER"
            
            # Wait for Redis to start
            sleep 5
            
            # Clean up temporary file
            if [ -n "$TEMP_REDIS_FILE" ]; then
                rm -f "$TEMP_REDIS_FILE"
            fi
            
            echo "   ✅ Redis restore completed"
        else
            echo "   ❌ Redis backup file not found: $REDIS_BACKUP_PATH"
        fi
    else
        echo "   ⚠️ Redis container not running, skipping Redis restore"
    fi
fi

# 3. Configuration Restore
if [ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_FILE" != "null" ]; then
    echo ""
    echo "3. ⚙️ Starting configuration restore..."
    
    CONFIG_BACKUP_PATH="$BACKUP_DIR/$CONFIG_FILE"
    if [ -f "$CONFIG_BACKUP_PATH" ]; then
        # Create backup of current configuration
        CURRENT_CONFIG_BACKUP="current_config_backup_$(date +%s).tar.gz"
        echo "   💾 Backing up current configuration to: $CURRENT_CONFIG_BACKUP"
        
        CURRENT_CONFIG_FILES=()
        [ -f ".env" ] && CURRENT_CONFIG_FILES+=(".env")
        [ -f ".env.production" ] && CURRENT_CONFIG_FILES+=(".env.production")
        [ -f "docker-compose.yml" ] && CURRENT_CONFIG_FILES+=("docker-compose.yml")
        [ -f "docker-compose.prod.yml" ] && CURRENT_CONFIG_FILES+=("docker-compose.prod.yml")
        [ -f "nginx.conf" ] && CURRENT_CONFIG_FILES+=("nginx.conf")
        [ -f "nginx.prod.conf" ] && CURRENT_CONFIG_FILES+=("nginx.prod.conf")
        
        if [ ${#CURRENT_CONFIG_FILES[@]} -gt 0 ]; then
            tar -czf "$CURRENT_CONFIG_BACKUP" "${CURRENT_CONFIG_FILES[@]}" 2>/dev/null
        fi
        
        # Extract configuration backup
        echo "   📦 Extracting configuration backup..."
        tar -xzf "$CONFIG_BACKUP_PATH" -C .
        
        echo "   ✅ Configuration restore completed"
        echo "   ℹ️ Current configuration backed up to: $CURRENT_CONFIG_BACKUP"
    else
        echo "   ❌ Configuration backup file not found: $CONFIG_BACKUP_PATH"
    fi
fi

# 4. Post-restore actions
echo ""
echo "4. 🔄 Post-restore actions..."

# Restart containers if needed
if [ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ]; then
    echo "   🔄 Restarting all containers to apply changes..."
    docker-compose restart
elif [ "$CONFIG_ONLY" = true ]; then
    echo "   🔄 Configuration restored. You may need to restart containers manually."
fi

# Verify services
echo "   🔍 Verifying services..."
sleep 5

if docker ps | grep -q "$POSTGRES_CONTAINER"; then
    echo "   ✅ PostgreSQL container is running"
else
    echo "   ⚠️ PostgreSQL container is not running"
fi

if docker ps | grep -q "$REDIS_CONTAINER"; then
    echo "   ✅ Redis container is running"
else
    echo "   ⚠️ Redis container is not running"
fi

if docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "   ✅ Backend container is running"
else
    echo "   ⚠️ Backend container is not running"
fi

# 5. Restore Summary
echo ""
echo "=== 🎉 Restore Process Completed ==="
echo "📦 Restored components:"
[ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$DB_FILE" != "null" ] && echo "  - Database: $DB_FILE"
[ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$REDIS_FILE" != "null" ] && echo "  - Redis: $REDIS_FILE"
[ "$DB_ONLY" = false ] && [ "$REDIS_ONLY" = false ] && [ "$CONFIG_ONLY" = false ] && [ "$CONFIG_FILE" != "null" ] && echo "  - Configuration: $CONFIG_FILE"
[ "$DB_ONLY" = true ] && [ "$DB_FILE" != "null" ] && echo "  - Database only: $DB_FILE"
[ "$REDIS_ONLY" = true ] && [ "$REDIS_FILE" != "null" ] && echo "  - Redis only: $REDIS_FILE"
[ "$CONFIG_ONLY" = true ] && [ "$CONFIG_FILE" != "null" ] && echo "  - Configuration only: $CONFIG_FILE"

echo "🕐 Restore completed at: $(date)"
echo ""
echo "ℹ️ Next steps:"
echo "  1. Verify application functionality"
echo "  2. Check logs for any errors"
echo "  3. Test critical features"
echo ""