# Multi-stage Dockerfile for Backend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies using workspace
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build the application
WORKDIR /app/packages/backend
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Install runtime dependencies
RUN apk add --no-cache curl bash

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/package*.json ./
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy configuration files
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/seeds ./seeds

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Copy startup script
COPY --chown=nodejs:nodejs scripts/backend-startup.sh ./startup.sh
RUN chmod +x ./startup.sh

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["./startup.sh"]