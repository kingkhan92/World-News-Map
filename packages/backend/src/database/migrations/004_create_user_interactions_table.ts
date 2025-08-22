import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_interactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('article_id').notNullable().references('id').inTable('articles').onDelete('CASCADE');
    table.string('interaction_type', 50).notNullable(); // 'view', 'bookmark', 'share'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['user_id']);
    table.index(['article_id']);
    table.index(['interaction_type']);
    table.index(['created_at']);
    
    // Composite index for user-article interactions
    table.index(['user_id', 'article_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_interactions');
}