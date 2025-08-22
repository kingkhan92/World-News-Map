import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('articles', (table) => {
    table.increments('id').primary();
    table.string('title', 500).notNullable();
    table.text('content');
    table.text('summary');
    table.string('url', 1000).notNullable().unique();
    table.string('source', 100).notNullable();
    table.timestamp('published_at').notNullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.string('location_name', 200).nullable();
    table.integer('bias_score').nullable();
    table.jsonb('bias_analysis').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes for performance as specified in design
    table.index(['latitude', 'longitude'], 'idx_articles_location');
    table.index(['published_at'], 'idx_articles_published_at');
    table.index(['bias_score'], 'idx_articles_bias_score');
    table.index(['source']);
    table.index(['url']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('articles');
}