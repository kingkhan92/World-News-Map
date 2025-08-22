# Multi-stage Dockerfile for Frontend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies using workspace
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY packages/frontend ./packages/frontend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build the application
WORKDIR /app/packages/frontend
RUN npm run build

# Production image with nginx
FROM nginx:alpine AS production

# Create non-root user
RUN addgroup --system --gid 1001 nginx-user
RUN adduser --system --uid 1001 nginx-user

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

# Create nginx directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run \
    && chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /var/run

# Add health check endpoint
RUN echo '<!DOCTYPE html><html><head><title>Health Check</title></head><body><h1>OK</h1></body></html>' > /usr/share/nginx/html/health

USER nginx-user

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["nginx", "-g", "daemon off;"]