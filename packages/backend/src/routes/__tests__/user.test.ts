import request from 'supertest';
import { app } from '../../index';
import { UserModel } from '../../models/User';
import { UserInteractionModel } from '../../models/UserInteraction';
import { generateToken } from '../../utils/auth';

// Mock the models
jest.mock('../../models/User');
jest.mock('../../models/UserInteraction');

const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const MockedUserInteractionModel = UserInteractionModel as jest.Mocked<typeof UserInteractionModel>;

describe('User Routes', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password_hash: 'hashedpassword',
    created_at: new Date(),
    preferences: {
      defaultView: 'map' as const,
      preferredSources: ['BBC News'],
      biasThreshold: 50,
      autoRefresh: true
    }
  };

  const authToken = generateToken(mockUser.id);
  const authHeader = `Bearer ${authToken}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/preferences', () => {
    it('should return user preferences', async () => {
      MockedUserModel.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.preferences).toEqual(mockUser.preferences);
      expect(MockedUserModel.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 404 if user not found', async () => {
      MockedUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/user/preferences')
        .set('Authorization', authHeader);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/user/preferences');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/user/preferences', () => {
    const updatedPreferences = {
      defaultView: 'globe' as const,
      preferredSources: ['BBC News', 'CNN'],
      biasThreshold: 75,
      autoRefresh: false
    };

    it('should update user preferences', async () => {
      const updatedUser = { ...mockUser, preferences: updatedPreferences };
      MockedUserModel.updatePreferences.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', authHeader)
        .send(updatedPreferences);

      expect(response.status).toBe(200);
      expect(response.body.data.preferences).toEqual(updatedPreferences);
      expect(MockedUserModel.updatePreferences).toHaveBeenCalledWith(mockUser.id, updatedPreferences);
    });

    it('should validate preference values', async () => {
      const invalidPreferences = {
        defaultView: 'invalid',
        biasThreshold: 150
      };

      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', authHeader)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
    });

    it('should return 404 if user not found', async () => {
      MockedUserModel.updatePreferences.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/user/preferences')
        .set('Authorization', authHeader)
        .send(updatedPreferences);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/user/interaction', () => {
    const interactionData = {
      articleId: 123,
      interactionType: 'bookmark' as const
    };

    it('should record user interaction', async () => {
      const mockInteraction = {
        id: 1,
        user_id: mockUser.id,
        article_id: interactionData.articleId,
        interaction_type: interactionData.interactionType,
        created_at: new Date()
      };

      MockedUserInteractionModel.hasInteraction.mockResolvedValue(false);
      MockedUserInteractionModel.create.mockResolvedValue(mockInteraction);

      const response = await request(app)
        .post('/api/user/interaction')
        .set('Authorization', authHeader)
        .send(interactionData);

      expect(response.status).toBe(200);
      expect(response.body.data.interaction.articleId).toBe(interactionData.articleId);
      expect(MockedUserInteractionModel.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        article_id: interactionData.articleId,
        interaction_type: interactionData.interactionType
      });
    });

    it('should toggle bookmark if already exists', async () => {
      MockedUserInteractionModel.hasInteraction.mockResolvedValue(true);
      MockedUserInteractionModel.removeInteraction.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/user/interaction')
        .set('Authorization', authHeader)
        .send(interactionData);

      expect(response.status).toBe(200);
      expect(response.body.data.interaction.interactionType).toBe('unbookmark');
      expect(MockedUserInteractionModel.removeInteraction).toHaveBeenCalledWith(
        mockUser.id,
        interactionData.articleId,
        'bookmark'
      );
    });

    it('should validate interaction data', async () => {
      const invalidData = {
        articleId: 'invalid',
        interactionType: 'invalid'
      };

      const response = await request(app)
        .post('/api/user/interaction')
        .set('Authorization', authHeader)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/user/history', () => {
    it('should return user interaction history', async () => {
      const mockHistory = [
        {
          id: 1,
          user_id: mockUser.id,
          article_id: 123,
          interaction_type: 'view' as const,
          created_at: new Date(),
          article_title: 'Test Article',
          article_url: 'https://example.com/article'
        }
      ];

      MockedUserInteractionModel.getUserHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/user/history')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(response.body.data.pagination).toBeDefined();
      expect(MockedUserInteractionModel.getUserHistory).toHaveBeenCalledWith(mockUser.id, 20, 0);
    });

    it('should support pagination', async () => {
      MockedUserInteractionModel.getUserHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/user/history?page=2&limit=10')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(MockedUserInteractionModel.getUserHistory).toHaveBeenCalledWith(mockUser.id, 10, 10);
    });
  });

  describe('GET /api/user/bookmarks/:articleId', () => {
    it('should check bookmark status', async () => {
      const articleId = 123;
      MockedUserInteractionModel.hasInteraction.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/user/bookmarks/${articleId}`)
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.data.isBookmarked).toBe(true);
      expect(response.body.data.articleId).toBe(articleId);
      expect(MockedUserInteractionModel.hasInteraction).toHaveBeenCalledWith(
        mockUser.id,
        articleId,
        'bookmark'
      );
    });

    it('should validate article ID', async () => {
      const response = await request(app)
        .get('/api/user/bookmarks/invalid')
        .set('Authorization', authHeader);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ARTICLE_ID');
    });
  });
});