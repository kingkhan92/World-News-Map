import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('user_interactions').del();
  await knex('user_sessions').del();
  await knex('articles').del();
  await knex('users').del();

  // Insert sample users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await knex('users').insert([
    {
      id: 1,
      email: 'admin@example.com',
      password_hash: hashedPassword,
      preferences: {
        defaultView: 'map',
        preferredSources: ['BBC', 'Reuters'],
        biasThreshold: 50,
        autoRefresh: true,
      },
    },
    {
      id: 2,
      email: 'user@example.com',
      password_hash: hashedPassword,
      preferences: {
        defaultView: 'globe',
        preferredSources: ['CNN', 'Guardian'],
        biasThreshold: 30,
        autoRefresh: false,
      },
    },
  ]);

  // Insert sample articles
  await knex('articles').insert([
    {
      id: 1,
      title: 'Breaking: Major Economic Summit in London',
      content: 'World leaders gather in London for crucial economic discussions...',
      summary: 'Economic summit brings together world leaders to discuss global financial stability.',
      url: 'https://example.com/news/economic-summit-london',
      source: 'BBC',
      published_at: new Date('2024-01-15T10:00:00Z'),
      latitude: 51.5074,
      longitude: -0.1278,
      location_name: 'London, UK',
      bias_score: 25,
      bias_analysis: {
        politicalLean: 'center',
        factualAccuracy: 85,
        emotionalTone: 15,
        confidence: 90,
      },
    },
    {
      id: 2,
      title: 'Climate Change Conference Opens in Paris',
      content: 'Environmental ministers from around the world convene in Paris...',
      summary: 'International climate conference begins with focus on renewable energy.',
      url: 'https://example.com/news/climate-conference-paris',
      source: 'Reuters',
      published_at: new Date('2024-01-15T14:30:00Z'),
      latitude: 48.8566,
      longitude: 2.3522,
      location_name: 'Paris, France',
      bias_score: 20,
      bias_analysis: {
        politicalLean: 'center',
        factualAccuracy: 90,
        emotionalTone: 10,
        confidence: 95,
      },
    },
    {
      id: 3,
      title: 'Tech Innovation Hub Opens in Tokyo',
      content: 'Japan launches new technology innovation center in Tokyo...',
      summary: 'New tech hub aims to foster innovation in AI and robotics.',
      url: 'https://example.com/news/tech-hub-tokyo',
      source: 'Guardian',
      published_at: new Date('2024-01-16T08:00:00Z'),
      latitude: 35.6762,
      longitude: 139.6503,
      location_name: 'Tokyo, Japan',
      bias_score: 30,
      bias_analysis: {
        politicalLean: 'center',
        factualAccuracy: 80,
        emotionalTone: 20,
        confidence: 85,
      },
    },
  ]);

  // Insert sample user interactions
  await knex('user_interactions').insert([
    {
      user_id: 1,
      article_id: 1,
      interaction_type: 'view',
    },
    {
      user_id: 1,
      article_id: 1,
      interaction_type: 'bookmark',
    },
    {
      user_id: 1,
      article_id: 2,
      interaction_type: 'view',
    },
    {
      user_id: 2,
      article_id: 2,
      interaction_type: 'view',
    },
    {
      user_id: 2,
      article_id: 3,
      interaction_type: 'bookmark',
    },
  ]);
}