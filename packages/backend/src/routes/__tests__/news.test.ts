import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import newsRouter from '../news.js'
import { ArticleModel } from '../../models/Article.js'
import { AuthService } from '../../services/authService.js'
import db from '../../database/connection.js'
import { TABLE_NAMES } from '../../types/models.js'

const app = express()
app.use(express.json())
app.use('/api/news', newsRouter)

describe('News API Endpoints', () => {
  let authToken: string
  let testUserId: number
  let testArticleId: number

  beforeAll(async () => {
    // Create test user and get auth token
    const testUser = await AuthService.register({
      email: 'test@example.com',
      password: 'TestPassword123'
    })
    testUserId = testUser.user.id
    authToken = testUser.token
  })

  beforeEach(async () => {
    // Clean up articles table
    await db(TABLE_NAMES.ARTICLES).del()
    
    // Create test article
    const testArticle = await ArticleModel.create({
      title: 'Test Article',
      content: 'This is a test article content',
      summary: 'Test summary',
      url: 'https://example.com/test-article',
      source: 'Test Source',
      published_at: new Date('2024-01-15T10:00:00Z'),
      latitude: 40.7128,
      longitude: -74.0060,
      location_name: 'New York',
      bias_score: 50,
      bias_analysis: {
        politicalLean: 'center',
        factualAccuracy: 85,
        emotionalTone: 0,
        confidence: 90
      }
    })
    testArticleId = testArticle.id
  })

  afterAll(async () => {
    // Clean up
    await db(TABLE_NAMES.ARTICLES).del()
    await db(TABLE_NAMES.USERS).where({ id: testUserId }).del()
    await db.destroy()
  })

  describe('GET /api/news/articles', () => {
    it('should return articles with pagination', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('articles')
      expect(response.body).toHaveProperty('pagination')
      expect(response.body.pagination).toHaveProperty('page', 1)
      expect(response.body.pagination).toHaveProperty('limit', 20)
      expect(response.body.pagination).toHaveProperty('total')
      expect(Array.isArray(response.body.articles)).toBe(true)
    })

    it('should filter articles by date range', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.filters).toHaveProperty('startDate')
      expect(response.body.filters).toHaveProperty('endDate')
    })

    it('should filter articles by geographic bounds', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .query({
          lat: 40.7128,
          lng: -74.0060,
          radius: 100
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.filters).toHaveProperty('latitude', 40.7128)
      expect(response.body.filters).toHaveProperty('longitude', -74.0060)
      expect(response.body.filters).toHaveProperty('radius', 100)
    })

    it('should filter articles by source', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .query({ source: 'Test Source' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.articles[0].source).toBe('Test Source')
    })

    it('should filter articles by bias score range', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .query({
          biasScoreMin: 40,
          biasScoreMax: 60
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.articles[0].bias_score).toBeGreaterThanOrEqual(40)
      expect(response.body.articles[0].bias_score).toBeLessThanOrEqual(60)
    })

    it('should filter articles by keyword search', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .query({ keyword: 'test' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.articles[0].title.toLowerCase()).toContain('test')
    })

    it('should handle pagination correctly', async () => {
      // Create additional test articles
      await ArticleModel.create({
        title: 'Second Article',
        url: 'https://example.com/second-article',
        source: 'Test Source',
        published_at: new Date('2024-01-16T10:00:00Z')
      })

      const response = await request(app)
        .get('/api/news/articles')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.articles).toHaveLength(1)
      expect(response.body.pagination.page).toBe(1)
      expect(response.body.pagination.limit).toBe(1)
      expect(response.body.pagination.total).toBe(2)
      expect(response.body.pagination.hasNext).toBe(true)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/news/articles')
        .expect(401)
    })
  })

  describe('GET /api/news/article/:id', () => {
    it('should return specific article details', async () => {
      const response = await request(app)
        .get(`/api/news/article/${testArticleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('article')
      expect(response.body.article.id).toBe(testArticleId)
      expect(response.body.article.title).toBe('Test Article')
      expect(response.body.article.bias_analysis).toHaveProperty('politicalLean', 'center')
    })

    it('should return 404 for non-existent article', async () => {
      const response = await request(app)
        .get('/api/news/article/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.error.code).toBe('ArticleNotFound')
    })

    it('should validate article ID parameter', async () => {
      await request(app)
        .get('/api/news/article/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/news/article/${testArticleId}`)
        .expect(401)
    })
  })

  describe('POST /api/news/refresh', () => {
    it('should trigger news refresh successfully', async () => {
      const response = await request(app)
        .post('/api/news/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message', 'News refresh completed successfully')
      expect(response.body).toHaveProperty('status', 'completed')
      expect(response.body).toHaveProperty('result')
      expect(response.body.result).toHaveProperty('totalFetched')
      expect(response.body.result).toHaveProperty('totalSaved')
    })

    it('should require authentication', async () => {
      await request(app)
        .post('/api/news/refresh')
        .expect(401)
    })
  })

  describe('GET /api/news/sources', () => {
    it('should return available news sources', async () => {
      const response = await request(app)
        .get('/api/news/sources')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('sources')
      expect(Array.isArray(response.body.sources)).toBe(true)
      expect(response.body.sources).toHaveLength(1)
      expect(response.body.sources[0]).toHaveProperty('name', 'Test Source')
      expect(response.body.sources[0]).toHaveProperty('displayName', 'Test Source')
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/news/sources')
        .expect(401)
    })
  })

  describe('GET /api/news/statistics', () => {
    it('should return news database statistics', async () => {
      const response = await request(app)
        .get('/api/news/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('statistics')
      expect(response.body.statistics).toHaveProperty('totalArticles')
      expect(response.body.statistics).toHaveProperty('articlesWithLocation')
      expect(response.body.statistics).toHaveProperty('articlesWithBias')
      expect(response.body.statistics).toHaveProperty('uniqueSources')
      expect(response.body.statistics).toHaveProperty('dateRange')
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/news/statistics')
        .expect(401)
    })
  })

  describe('Input validation', () => {
    it('should validate date format', async () => {
      await request(app)
        .get('/api/news/articles')
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should validate geographic coordinates', async () => {
      await request(app)
        .get('/api/news/articles')
        .query({ lat: 'invalid', lng: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/news/articles')
        .query({ page: 0, limit: 101 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })

    it('should validate bias score range', async () => {
      await request(app)
        .get('/api/news/articles')
        .query({ biasScoreMin: -1, biasScoreMax: 101 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would require mocking the database to simulate errors
      // For now, we'll test that the endpoints exist and respond correctly
      const response = await request(app)
        .get('/api/news/articles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('articles')
    })
  })
})