-- Seed data for development and testing
-- Note: This file should only be run in development/testing environments

-- Clear existing data (in dependency order)
DELETE FROM user_interactions;
DELETE FROM user_sessions;
DELETE FROM articles;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE articles_id_seq RESTART WITH 1;
ALTER SEQUENCE user_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE user_interactions_id_seq RESTART WITH 1;

-- Insert sample users
-- Note: Password is 'password123' hashed with bcrypt (cost 10)
INSERT INTO users (id, email, password_hash, preferences) VALUES
(1, 'admin@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', '{"defaultView": "map", "preferredSources": ["BBC", "Reuters"], "biasThreshold": 50, "autoRefresh": true}'),
(2, 'user@example.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', '{"defaultView": "globe", "preferredSources": ["CNN", "Guardian"], "biasThreshold": 30, "autoRefresh": false}');

-- Insert sample articles
INSERT INTO articles (id, title, content, summary, url, source, published_at, latitude, longitude, location_name, bias_score, bias_analysis) VALUES
(1, 'Breaking: Major Economic Summit in London', 'World leaders gather in London for crucial economic discussions...', 'Economic summit brings together world leaders to discuss global financial stability.', 'https://example.com/news/economic-summit-london', 'BBC', '2024-01-15 10:00:00+00', 51.5074, -0.1278, 'London, UK', 25, '{"politicalLean": "center", "factualAccuracy": 85, "emotionalTone": 15, "confidence": 90}'),
(2, 'Climate Change Conference Opens in Paris', 'Environmental ministers from around the world convene in Paris...', 'International climate conference begins with focus on renewable energy.', 'https://example.com/news/climate-conference-paris', 'Reuters', '2024-01-15 14:30:00+00', 48.8566, 2.3522, 'Paris, France', 20, '{"politicalLean": "center", "factualAccuracy": 90, "emotionalTone": 10, "confidence": 95}'),
(3, 'Tech Innovation Hub Opens in Tokyo', 'Japan launches new technology innovation center in Tokyo...', 'New tech hub aims to foster innovation in AI and robotics.', 'https://example.com/news/tech-hub-tokyo', 'Guardian', '2024-01-16 08:00:00+00', 35.6762, 139.6503, 'Tokyo, Japan', 30, '{"politicalLean": "center", "factualAccuracy": 80, "emotionalTone": 20, "confidence": 85}');

-- Insert sample user interactions
INSERT INTO user_interactions (user_id, article_id, interaction_type) VALUES
(1, 1, 'view'),
(1, 1, 'bookmark'),
(1, 2, 'view'),
(2, 2, 'view'),
(2, 3, 'bookmark');