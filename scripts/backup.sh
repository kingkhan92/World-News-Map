#!/bin/bash
set -e

# Interactive World News Map - Comprehensive Backup Script
# This script creates backups of the PostgreSQL database, Redis data, and application logs

# Load environment variables
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${RETENTION_DAYS:-30}
POSTGRES_CONTAINER="news-map-postgres"
REDIS_CONTAINER="news-map-redis"
BACKEND_CONTAINER="news-map-backend"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "=== Interactive World News Map - Backup Process Started ==="
echo "🕐 Timestamp: $(date)"
echo "📁 Backup directory: $BACKUP_DIR"
echo "🗓️ Retention period: $RETENTION_DAYS days"
echo ""

# 1. Database Backup
echo "1. 🗄️ Starting PostgreSQL database backup..."
DB_BACKUP_FILE="newsmap_db_backup_${TIMESTAMP}.sql"

if docker ps | grep -q "$POSTGRES_CONTAINER"; then
    echo "   ✓ PostgreSQL container is running"
    
    # Create database backup
    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "${POSTGRES_USER:-news_map_user}" \
        -d "${POSTGRES_DB:-news_map_db}" \
        --no-password \
        --clean \
        --if-exists \
        --create > "$BACKUP_DIR/$DB_BACKUP_FILE"
    
    # Compress the database backup
    gzip "$BACKUP_DIR/$DB_BACKUP_FILE"
    DB_SIZE=$(du -h "$BACKUP_DIR/${DB_BACKUP_FILE}.gz" | cut -f1)
    echo "   ✅ Database backup completed: ${DB_BACKUP_FILE}.gz ($DB_SIZE)"
else
    echo "   ❌ Error: PostgreSQL container '$POSTGRES_CONTAINER' is not running!"
    exit 1
fi

# 2. Redis Backup
echo ""
echo "2. 🔴 Starting Redis backup..."
REDIS_BACKUP_FILE="newsmap_redis_backup_${TIMESTAMP}.rdb"

if docker ps | grep -q "$REDIS_CONTAINER"; then
    echo "   ✓ Redis container is running"
    
    # Trigger Redis background save
    docker exec "$REDIS_CONTAINER" redis-cli BGSAVE > /dev/null
    
    # Wait a moment for the save to complete
    sleep 2
    
    # Copy Redis dump file
    if docker exec "$REDIS_CONTAINER" test -f /data/dump.rdb; then
        docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$BACKUP_DIR/$REDIS_BACKUP_FILE"
        gzip "$BACKUP_DIR/$REDIS_BACKUP_FILE"
        REDIS_SIZE=$(du -h "$BACKUP_DIR/${REDIS_BACKUP_FILE}.gz" | cut -f1)
        echo "   ✅ Redis backup completed: ${REDIS_BACKUP_FILE}.gz ($REDIS_SIZE)"
    else
        echo "   ⚠️ Redis dump file not found, skipping Redis backup"
    fi
else
    echo "   ⚠️ Redis container not running, skipping Redis backup"
fi

# 3. Application Logs Backup
echo ""
echo "3. 📋 Starting application logs backup..."
LOGS_BACKUP_FILE="newsmap_logs_backup_${TIMESTAMP}.tar.gz"

if docker ps | grep -q "$BACKEND_CONTAINER"; then
    echo "   ✓ Backend container is running"
    
    # Check if logs directory exists in container
    if docker exec "$BACKEND_CONTAINER" test -d /app/logs; then
        # Create temporary directory for logs
        TEMP_LOGS_DIR="./temp_logs_$TIMESTAMP"
        mkdir -p "$TEMP_LOGS_DIR"
        
        # Copy logs from container
        docker cp "$BACKEND_CONTAINER:/app/logs/." "$TEMP_LOGS_DIR/"
        
        # Create compressed archive
        tar -czf "$BACKUP_DIR/$LOGS_BACKUP_FILE" -C "$TEMP_LOGS_DIR" .
        
        # Clean up temporary directory
        rm -rf "$TEMP_LOGS_DIR"
        
        LOGS_SIZE=$(du -h "$BACKUP_DIR/$LOGS_BACKUP_FILE" | cut -f1)
        echo "   ✅ Logs backup completed: $LOGS_BACKUP_FILE ($LOGS_SIZE)"
    else
        echo "   ⚠️ No logs directory found in container, skipping logs backup"
    fi
else
    echo "   ⚠️ Backend container not running, skipping logs backup"
fi

# 4. Configuration Backup
echo ""
echo "4. ⚙️ Starting configuration backup..."
CONFIG_BACKUP_FILE="newsmap_config_backup_${TIMESTAMP}.tar.gz"
CONFIG_FILES=()

# Add configuration files if they exist
[ -f ".env" ] && CONFIG_FILES+=(".env")
[ -f ".env.production" ] && CONFIG_FILES+=(".env.production")
[ -f "docker-compose.yml" ] && CONFIG_FILES+=("docker-compose.yml")
[ -f "docker-compose.prod.yml" ] && CONFIG_FILES+=("docker-compose.prod.yml")
[ -f "nginx.conf" ] && CONFIG_FILES+=("nginx.conf")
[ -f "nginx.prod.conf" ] && CONFIG_FILES+=("nginx.prod.conf")

if [ ${#CONFIG_FILES[@]} -gt 0 ]; then
    tar -czf "$BACKUP_DIR/$CONFIG_BACKUP_FILE" "${CONFIG_FILES[@]}" 2>/dev/null
    CONFIG_SIZE=$(du -h "$BACKUP_DIR/$CONFIG_BACKUP_FILE" | cut -f1)
    echo "   ✅ Configuration backup completed: $CONFIG_BACKUP_FILE ($CONFIG_SIZE)"
else
    echo "   ⚠️ No configuration files found, skipping configuration backup"
fi

# 5. Cleanup old backups
echo ""
echo "5. 🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
OLD_BACKUPS_COUNT=$(find "$BACKUP_DIR" -name "newsmap_*_backup_*.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
if [ "$OLD_BACKUPS_COUNT" -gt 0 ]; then
    find "$BACKUP_DIR" -name "newsmap_*_backup_*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    echo "   ✅ Removed $OLD_BACKUPS_COUNT old backup files"
else
    echo "   ✅ No old backup files to remove"
fi

# 6. Create backup manifest
echo ""
echo "6. 📄 Creating backup manifest..."
MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$TIMESTAMP.json"
cat > "$MANIFEST_FILE" << EOF
{
  "backup_timestamp": "$(date -Iseconds)",
  "backup_version": "1.0",
  "application": "Interactive World News Map",
  "files": {
    "database": "${DB_BACKUP_FILE}.gz",
    "redis": "$([ -f "$BACKUP_DIR/${REDIS_BACKUP_FILE}.gz" ] && echo "${REDIS_BACKUP_FILE}.gz" || echo "null")",
    "logs": "$([ -f "$BACKUP_DIR/$LOGS_BACKUP_FILE" ] && echo "$LOGS_BACKUP_FILE" || echo "null")",
    "configuration": "$([ -f "$BACKUP_DIR/$CONFIG_BACKUP_FILE" ] && echo "$CONFIG_BACKUP_FILE" || echo "null")"
  },
  "database_info": {
    "name": "${POSTGRES_DB:-news_map_db}",
    "user": "${POSTGRES_USER:-news_map_user}",
    "container": "$POSTGRES_CONTAINER"
  },
  "retention_days": $RETENTION_DAYS
}
EOF

echo "   ✅ Backup manifest created: $MANIFEST_FILE"

# 7. Backup Summary
echo ""
echo "=== 🎉 Backup Process Completed Successfully ==="
echo "📦 Backup files created:"
[ -f "$BACKUP_DIR/${DB_BACKUP_FILE}.gz" ] && echo "  - Database: ${DB_BACKUP_FILE}.gz"
[ -f "$BACKUP_DIR/${REDIS_BACKUP_FILE}.gz" ] && echo "  - Redis: ${REDIS_BACKUP_FILE}.gz"
[ -f "$BACKUP_DIR/$LOGS_BACKUP_FILE" ] && echo "  - Logs: $LOGS_BACKUP_FILE"
[ -f "$BACKUP_DIR/$CONFIG_BACKUP_FILE" ] && echo "  - Configuration: $CONFIG_BACKUP_FILE"
echo "  - Manifest: backup_manifest_$TIMESTAMP.json"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "📊 Total backup directory size: $TOTAL_SIZE"
echo "🕐 Backup completed at: $(date)"

# Optional: Upload to cloud storage
if [ -n "$BACKUP_CLOUD_ENABLED" ] && [ "$BACKUP_CLOUD_ENABLED" = "true" ]; then
    echo ""
    echo "☁️ Uploading to cloud storage..."
    # Add your cloud storage upload commands here
    # Example for AWS S3:
    # aws s3 sync "$BACKUP_DIR" "s3://your-backup-bucket/news-map/$(date +%Y/%m/%d)/"
    echo "   ⚠️ Cloud storage upload not configured"
fi

echo ""