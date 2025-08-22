import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add additional indexes for enhanced article queries
  await knex.schema.alterTable('articles', (table) => {
    // Composite index for geographic and date queries
    table.index(['published_at', 'latitude', 'longitude'], 'idx_articles_date_location');
    
    // Index for bias score and source combination
    table.index(['bias_score', 'source'], 'idx_articles_bias_source');
    
    // Full-text search indexes for content search
    table.index(['title'], 'idx_articles_title');
    table.index(['summary'], 'idx_articles_summary');
    
    // Index for location name searches
    table.index(['location_name'], 'idx_articles_location_name');
    
    // Composite index for date range queries with source
    table.index(['source', 'published_at'], 'idx_articles_source_date');
  });

  // Add GIN index for JSONB bias_analysis column for PostgreSQL
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_articles_bias_analysis_gin ON articles USING GIN (bias_analysis)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('articles', (table) => {
    table.dropIndex(['published_at', 'latitude', 'longitude'], 'idx_articles_date_location');
    table.dropIndex(['bias_score', 'source'], 'idx_articles_bias_source');
    table.dropIndex(['title'], 'idx_articles_title');
    table.dropIndex(['summary'], 'idx_articles_summary');
    table.dropIndex(['location_name'], 'idx_articles_location_name');
    table.dropIndex(['source', 'published_at'], 'idx_articles_source_date');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_articles_bias_analysis_gin');
}