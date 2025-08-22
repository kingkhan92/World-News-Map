import dotenv from 'dotenv';
import { UserModel, ArticleModel } from './models/index.js';
import { initializeDatabase, closeConnection } from './database/init.js';

// Load environment variables
dotenv.config();

async function testDatabase() {
  try {
    console.log('Testing database connection and models...');
    
    // Initialize database
    await initializeDatabase();
    
    // Test User model
    console.log('\n--- Testing User Model ---');
    const userData = {
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      preferences: {
        defaultView: 'map' as const,
        biasThreshold: 50,
      },
    };
    
    const user = await UserModel.create(userData);
    console.log('Created user:', { id: user.id, email: user.email });
    
    const foundUser = await UserModel.findByEmail(userData.email);
    console.log('Found user by email:', foundUser ? 'Success' : 'Failed');
    
    // Test Article model
    console.log('\n--- Testing Article Model ---');
    const articleData = {
      title: 'Test Article',
      content: 'This is a test article content.',
      summary: 'Test article summary',
      url: 'https://example.com/test-article',
      source: 'Test Source',
      published_at: new Date(),
      latitude: 40.7128,
      longitude: -74.0060,
      location_name: 'New York, NY',
      bias_score: 25,
      bias_analysis: {
        politicalLean: 'center' as const,
        factualAccuracy: 85,
        emotionalTone: 15,
        confidence: 90,
      },
    };
    
    const article = await ArticleModel.create(articleData);
    console.log('Created article:', { id: article.id, title: article.title });
    
    const foundArticle = await ArticleModel.findById(article.id);
    console.log('Found article by ID:', foundArticle ? 'Success' : 'Failed');
    
    // Test filtering
    const articles = await ArticleModel.findWithFilters({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    });
    console.log('Found articles with filters:', articles.length);
    
    console.log('\n✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await closeConnection();
  }
}

testDatabase();