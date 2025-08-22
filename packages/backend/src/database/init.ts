import db, { testConnection, closeConnection } from './connection.js';

/**
 * Initialize the database by running migrations
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    console.log('Running database migrations...');
    await db.migrate.latest();
    console.log('Database migrations completed successfully');

  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

/**
 * Rollback the last migration
 */
export const rollbackDatabase = async (): Promise<void> => {
  try {
    console.log('Rolling back database migration...');
    await db.migrate.rollback();
    console.log('Database rollback completed successfully');
  } catch (error) {
    console.error('Database rollback failed:', error);
    throw error;
  }
};

/**
 * Reset the database (rollback all migrations and re-run them)
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('Resetting database...');
    await db.migrate.rollback(undefined, true); // Rollback all
    await db.migrate.latest(); // Re-run all migrations
    console.log('Database reset completed successfully');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
};

/**
 * Check database status
 */
export const getDatabaseStatus = async (): Promise<{
  connected: boolean;
  migrations: any[];
}> => {
  try {
    const connected = await testConnection();
    let migrations: any[] = [];
    
    if (connected) {
      migrations = await db.migrate.list();
    }
    
    return {
      connected,
      migrations,
    };
  } catch (error) {
    console.error('Failed to get database status:', error);
    return {
      connected: false,
      migrations: [],
    };
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Shutting down database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database connection...');
  await closeConnection();
  process.exit(0);
});