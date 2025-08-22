import dotenv from 'dotenv';
import { initializeDatabase, resetDatabase, closeConnection } from '../src/database/init.js';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'init':
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('✅ Database initialized successfully');
        break;
        
      case 'reset':
        console.log('Resetting database...');
        await resetDatabase();
        console.log('✅ Database reset successfully');
        break;
        
      default:
        console.log('Usage: tsx scripts/setup-db.ts [init|reset]');
        console.log('  init  - Run migrations to set up database');
        console.log('  reset - Reset database (rollback all and re-run migrations)');
        break;
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

setupDatabase();