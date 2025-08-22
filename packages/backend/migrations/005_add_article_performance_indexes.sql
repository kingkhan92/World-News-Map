-- Migration: Add performance indexes for articles
-- Created: 2024-01-01

-- Composite index for geographic and date queries
CREATE INDEX IF NOT EXISTS idx_articles_date_location ON articles(published_at, latitude, longitude);

-- Index for bias score and source combination
CREATE INDEX IF NOT EXISTS idx_articles_bias_source ON articles(bias_score, source);

-- Full-text search indexes for content search
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_summary ON articles(summary);

-- Index for location name searches
CREATE INDEX IF NOT EXISTS idx_articles_location_name ON articles(location_name);

-- Composite index for date range queries with source
CREATE INDEX IF NOT EXISTS idx_articles_source_date ON articles(source, published_at);

-- GIN index for JSONB bias_analysis column for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_articles_bias_analysis_gin ON articles USING GIN (bias_analysis);