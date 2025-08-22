# Interactive World News Map - Makefile
# Cross-platform commands for common operations

.PHONY: help dev prod build deploy health backup restore clean logs

# Default target
help:
	@echo "Interactive World News Map - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-stop     - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make deploy       - Full production deployment"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-stop    - Stop production environment"
	@echo ""
	@echo "Management:"
	@echo "  make health       - Run health checks"
	@echo "  make backup       - Backup database"
	@echo "  make restore      - Restore database (requires BACKUP_FILE=path)"
	@echo "  make build        - Build all Docker images"
	@echo "  make clean        - Clean up Docker resources"
	@echo ""
	@echo "Utilities:"
	@echo "  make logs         - View all service logs"
	@echo "  make shell-backend - Open backend container shell"
	@echo "  make shell-db     - Open database shell"

# Development commands
dev:
	docker-compose up -d
	@echo "Development environment started!"
	@echo "Access: http://localhost"

dev-logs:
	docker-compose logs -f

dev-stop:
	docker-compose down

# Production commands
prod:
	docker-compose -f docker-compose.prod.yml up -d
	@echo "Production environment started!"
	@echo "Access: http://localhost"

deploy:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1
else
	chmod +x scripts/deploy.sh && ./scripts/deploy.sh
endif

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-stop:
	docker-compose -f docker-compose.prod.yml down

# Build commands
build:
	docker-compose -f docker-compose.prod.yml build --no-cache

build-dev:
	docker-compose build --no-cache

# Management commands
health:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/health-check.ps1
else
	chmod +x scripts/health-check.sh && ./scripts/health-check.sh
endif

backup:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
else
	chmod +x scripts/backup.sh && ./scripts/backup.sh
endif

restore:
ifndef BACKUP_FILE
	@echo "Error: Please specify BACKUP_FILE=path/to/backup.sql.gz"
	@exit 1
endif
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/restore.ps1 -BackupFile "$(BACKUP_FILE)"
else
	chmod +x scripts/restore.sh && ./scripts/restore.sh "$(BACKUP_FILE)"
endif

# Utility commands
logs:
	docker-compose logs -f

shell-backend:
	docker exec -it news-map-backend /bin/sh

shell-db:
	docker exec -it news-map-postgres psql -U news_map_user -d news_map_db

# Cleanup commands
clean:
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
	docker volume prune -f

clean-all:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	docker system prune -af
	docker volume prune -f

# Database commands
migrate:
	docker-compose exec backend npm run migrate

migrate-prod:
	docker-compose -f docker-compose.prod.yml exec backend npm run migrate

seed:
	docker-compose exec backend npm run seed

# Testing commands
test:
	docker-compose exec backend npm test

test-frontend:
	docker-compose exec frontend npm test

# Status commands
status:
	docker-compose ps

status-prod:
	docker-compose -f docker-compose.prod.yml ps