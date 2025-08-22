# Security Hardening and Production Readiness Guide

## Overview

This document outlines the security measures, monitoring systems, and backup procedures implemented for the Interactive World News Map application to ensure production readiness and security compliance.

## Security Measures Implemented

### 1. Rate Limiting and API Security

#### Rate Limiting Configuration
- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Strict endpoints**: 3 requests per hour per IP (for sensitive operations)
- **API endpoints**: 60 requests per minute per IP

#### Security Middleware
- **IP Filtering**: Blacklist/whitelist functionality for IP addresses
- **Suspicious Activity Detection**: Monitors for common attack patterns
- **Request Size Limiting**: Maximum 10MB payload size
- **SQL Injection Prevention**: Pattern-based detection and blocking
- **Path Traversal Protection**: Prevents directory traversal attacks

### 2. HTTPS Configuration and Security Headers

#### NGINX Security Configuration
- **HTTPS/TLS**: TLS 1.2 and 1.3 support with modern cipher suites
- **HSTS**: Strict Transport Security with preload
- **OCSP Stapling**: Enabled for certificate validation
- **Security Headers**:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`: Restricts dangerous browser features
  - `Content-Security-Policy`: Comprehensive CSP policy

#### Application Security Headers
- **Helmet.js**: Comprehensive security header management
- **CORS**: Properly configured cross-origin resource sharing
- **Server Information Hiding**: Removes server version information

### 3. Input Validation and Sanitization

#### Enhanced Input Sanitization
- **XSS Prevention**: Removes script tags, event handlers, and dangerous protocols
- **SQL Injection Protection**: Pattern-based detection and blocking
- **Path Traversal Prevention**: Blocks directory traversal attempts
- **Data Validation**: Comprehensive validation using express-validator

#### Validation Rules
- Email validation with normalization
- Strong password requirements (8+ chars, mixed case, numbers)
- Geographic coordinate validation
- Date format validation (ISO 8601)
- File size and type restrictions

### 4. Error Logging and Monitoring

#### Logging System
- **Winston Logger**: Structured logging with multiple transports
- **Log Levels**: Error, warn, info, debug with appropriate routing
- **Log Files**:
  - `error.log`: Error-level events only
  - `combined.log`: All application logs
  - `security.log`: Security-related events
  - `performance.log`: Performance monitoring data

#### Monitoring Service
- **Health Checks**: Database, Redis, and system health monitoring
- **System Metrics**: Memory, CPU, and uptime tracking
- **Alert System**: Automated alerts for critical issues
- **Performance Monitoring**: Request timing and slow query detection

#### Monitoring Endpoints
- `GET /api/health`: Basic health check
- `GET /api/health/status`: Detailed system status
- `GET /api/health/metrics`: System metrics and history

## Backup and Recovery Procedures

### 1. Database Backup

#### Automated Backup Script
```bash
#!/bin/bash
# Location: scripts/backup.sh

# Configuration
DB_NAME=${DB_NAME:-newsmap}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/newsmap_backup_$TIMESTAMP.sql"

# Create database backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove old backups (older than retention period)
find $BACKUP_DIR -name "newsmap_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### Backup Schedule
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days for daily backups
- **Storage**: Local filesystem with optional cloud storage sync
- **Compression**: Gzip compression to reduce storage space

### 2. Application Data Backup

#### Redis Data Backup
```bash
# Redis backup (if using persistence)
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backups/redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

#### Log Files Backup
```bash
# Archive log files
tar -czf /backups/logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz /app/logs/
```

### 3. Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# Location: scripts/restore.sh

BACKUP_FILE=$1
DB_NAME=${DB_NAME:-newsmap}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Extract backup if compressed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE > temp_restore.sql
    RESTORE_FILE=temp_restore.sql
else
    RESTORE_FILE=$BACKUP_FILE
fi

# Drop existing database (WARNING: This will delete all data)
dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Create new database
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Restore from backup
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $RESTORE_FILE

# Clean up temporary file
if [ "$RESTORE_FILE" = "temp_restore.sql" ]; then
    rm temp_restore.sql
fi

echo "Database restored from $BACKUP_FILE"
```

#### Application Recovery Steps
1. **Stop Services**: `docker-compose down`
2. **Restore Database**: Run restore script with backup file
3. **Restore Configuration**: Copy environment files and certificates
4. **Start Services**: `docker-compose up -d`
5. **Verify Health**: Check `/api/health/status` endpoint

### 4. Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Database Recovery**: < 30 minutes
- **Full Application Recovery**: < 1 hour
- **Data Loss Tolerance (RPO)**: < 24 hours

#### Recovery Steps
1. **Assess Damage**: Determine scope of failure
2. **Restore Infrastructure**: Deploy containers/services
3. **Restore Data**: Apply latest database backup
4. **Verify Integrity**: Run health checks and data validation
5. **Resume Operations**: Redirect traffic to restored system

## Security Monitoring and Alerting

### 1. Security Event Monitoring

#### Monitored Events
- Failed authentication attempts
- Rate limit violations
- Suspicious request patterns
- SQL injection attempts
- Path traversal attempts
- Unusual user agent strings

#### Alert Thresholds
- **Critical**: Immediate notification
  - Multiple failed auth attempts from same IP
  - SQL injection attempts
  - System resource exhaustion (>90% memory)
- **Warning**: Hourly digest
  - High memory usage (>80%)
  - Slow database queries (>5s)
  - Service degradation

### 2. Performance Monitoring

#### Metrics Tracked
- Request response times
- Database query performance
- Memory and CPU usage
- Error rates and types
- Active user sessions

#### Performance Thresholds
- **Response Time**: < 2s for 95% of requests
- **Database Queries**: < 1s for 95% of queries
- **Memory Usage**: < 80% of available memory
- **CPU Usage**: < 70% average load

## Environment Configuration

### 1. Production Environment Variables

```bash
# Security
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=5242880
LOG_FILE_MAX_FILES=10

# Security Headers
HSTS_MAX_AGE=31536000
CSP_POLICY=default-src 'self'; script-src 'self' 'unsafe-eval'

# Monitoring
HEALTH_CHECK_INTERVAL=120000
METRICS_RETENTION_COUNT=100
ALERT_MEMORY_THRESHOLD=80
```

### 2. SSL/TLS Configuration

#### Certificate Management
- **Certificate Authority**: Let's Encrypt or commercial CA
- **Certificate Renewal**: Automated with certbot
- **Key Storage**: Secure file permissions (600)
- **Cipher Suites**: Modern, secure configurations only

#### SSL Configuration Files
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
```

## Compliance and Best Practices

### 1. Security Standards
- **OWASP Top 10**: Protection against common vulnerabilities
- **NIST Cybersecurity Framework**: Risk management approach
- **ISO 27001**: Information security management principles

### 2. Data Protection
- **Encryption**: Data encrypted in transit (TLS) and at rest
- **Access Control**: Role-based access with principle of least privilege
- **Data Retention**: Automated cleanup of old logs and temporary data
- **Privacy**: No collection of personally identifiable information without consent

### 3. Incident Response
- **Detection**: Automated monitoring and alerting
- **Response**: Documented procedures for security incidents
- **Recovery**: Tested backup and recovery procedures
- **Learning**: Post-incident analysis and improvement

## Maintenance and Updates

### 1. Regular Security Tasks
- **Weekly**: Review security logs and alerts
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Security audit and penetration testing
- **Annually**: Full security assessment and policy review

### 2. Backup Verification
- **Weekly**: Verify backup completion and integrity
- **Monthly**: Test restore procedures with sample data
- **Quarterly**: Full disaster recovery drill

This security hardening implementation ensures the Interactive World News Map application meets production security standards and provides comprehensive monitoring, backup, and recovery capabilities.