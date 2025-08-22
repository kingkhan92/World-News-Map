import knex, { Knex } from 'knex';
import config from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

if (!knexConfig) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

// Create the database connection
const db: Knex = knex(knexConfig);

// Test the connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await db.raw('SELECT 1');
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeConnection = async (): Promise<void> => {
  try {
    await db.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

export default db;