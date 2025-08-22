import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ArticleModel } from '../../models/Article.js'
import db from '../../database/connection.js'
import { TABLE_NAMES } from '../../types/models.js'

describe('News API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await db.raw('SELECT 1')
  })

  afterAll(async () => {
    await db.destroy()
  })

  describe('Article Model Integration', () => {
    it('should create and retrieve articles with filters', async () => {
      // Clean up any existing test data
      await db(TABLE_NAMES.ARTICLES).where('title', 'like', 'Integration Test%').del()

      // Create test articles
      const testArticles = [
        {
          title: 'Integration Test Article 1',
          content: 'Test content for integration testing',
          summary: 'Test summary',
          url: 'https://example.com/integration-test-1',
          source: 'Integration Test Source',
          published_at: new Date('2024-01-15T10:00:00Z'),
          latitude: 40.7128,
          longitude: -74.0060,
          location_name: 'New York',
          bias_score: 45
        },
        {
          title: 'Integration Test Article 2',
          content: 'Another test content for integration testing',
          summary: 'Another test summary',
          url: 'https://example.com/integration-test-2',
          source: 'Integration Test Source',
          published_at: new Date('2024-01-16T10:00:00Z'),
          latitude: 51.5074,
          longitude: -0.1278,
          location_name: 'London',
          bias_score: 65
        }
      ]

      // Create articles
      const createdArticles = await ArticleModel.createBatch(testArticles)
      expect(createdArticles).toHaveLength(2)

      // Test filtering by date range
      const dateFilteredArticles = await ArticleModel.findWithFilters({
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-15T23:59:59Z')
      })
      expect(dateFilteredArticles).toHaveLength(1)
      expect(dateFilteredArticles[0].title).toBe('Integration Test Article 1')

      // Test filtering by source
      const sourceFilteredArticles = await ArticleModel.findWithFilters({
        source: 'Integration Test Source'
      })
      expect(sourceFilteredArticles).toHaveLength(2)

      // Test filtering by bias score range
      const biasFilteredArticles = await ArticleModel.findWithFilters({
        biasScoreMin: 60,
        biasScoreMax: 70
      })
      expect(biasFilteredArticles).toHaveLength(1)
      expect(biasFilteredArticles[0].bias_score).toBe(65)

      // Test keyword search
      const keywordFilteredArticles = await ArticleModel.findWithFilters({
        keyword: 'Another'
      })
      expect(keywordFilteredArticles).toHaveLength(1)
      expect(keywordFilteredArticles[0].title).toBe('Integration Test Article 2')

      // Test geographic filtering (simplified bounding box)
      const geoFilteredArticles = await ArticleModel.findWithFilters({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 100 // 100km radius
      })
      expect(geoFilteredArticles).toHaveLength(1)
      expect(geoFilteredArticles[0].location_name).toBe('New York')

      // Test pagination
      const paginatedArticles = await ArticleModel.findWithFilters({}, 1, 0)
      expect(paginatedArticles).toHaveLength(1)

      // Test count with filters
      const totalCount = await ArticleModel.countWithFilters({
        source: 'Integration Test Source'
      })
      expect(totalCount).toBe(2)

      // Clean up test data
      await db(TABLE_NAMES.ARTICLES).where('title', 'like', 'Integration Test%').del()
    })

    it('should handle article retrieval by ID', async () => {
      // Create a test article
      const testArticle = await ArticleModel.create({
        title: 'ID Test Article',
        content: 'Test content',
        summary: 'Test summary',
        url: 'https://example.com/id-test',
        source: 'Test Source',
        published_at: new Date()
      })

      // Retrieve by ID
      const retrievedArticle = await ArticleModel.findById(testArticle.id)
      expect(retrievedArticle).toBeTruthy()
      expect(retrievedArticle?.title).toBe('ID Test Article')

      // Test non-existent ID
      const nonExistentArticle = await ArticleModel.findById(99999)
      expect(nonExistentArticle).toBeNull()

      // Clean up
      await ArticleModel.deleteById(testArticle.id)
    })

    it('should handle article statistics correctly', async () => {
      // Clean up any existing test data
      await db(TABLE_NAMES.ARTICLES).where('title', 'like', 'Stats Test%').del()

      // Create test articles with different properties
      await ArticleModel.createBatch([
        {
          title: 'Stats Test Article 1',
          url: 'https://example.com/stats-1',
          source: 'Stats Source 1',
          published_at: new Date('2024-01-01T10:00:00Z'),
          latitude: 40.7128,
          longitude: -74.0060,
          bias_score: 50
        },
        {
          title: 'Stats Test Article 2',
          url: 'https://example.com/stats-2',
          source: 'Stats Source 2',
          published_at: new Date('2024-01-02T10:00:00Z')
          // No location or bias score
        }
      ])

      const stats = await ArticleModel.getStatistics()
      
      expect(stats.totalArticles).toBeGreaterThanOrEqual(2)
      expect(stats.articlesWithLocation).toBeGreaterThanOrEqual(1)
      expect(stats.articlesWithBias).toBeGreaterThanOrEqual(1)
      expect(stats.uniqueSources).toBeGreaterThanOrEqual(2)
      expect(stats.dateRange.earliest).toBeTruthy()
      expect(stats.dateRange.latest).toBeTruthy()

      // Clean up
      await db(TABLE_NAMES.ARTICLES).where('title', 'like', 'Stats Test%').del()
    })

    it('should handle unique sources correctly', async () => {
      // Clean up any existing test data
      await db(TABLE_NAMES.ARTICLES).where('source', 'like', 'Unique Source%').del()

      // Create articles with different sources
      await ArticleModel.createBatch([
        {
          title: 'Source Test 1',
          url: 'https://example.com/source-1',
          source: 'Unique Source A',
          published_at: new Date()
        },
        {
          title: 'Source Test 2',
          url: 'https://example.com/source-2',
          source: 'Unique Source B',
          published_at: new Date()
        },
        {
          title: 'Source Test 3',
          url: 'https://example.com/source-3',
          source: 'Unique Source A', // Duplicate source
          published_at: new Date()
        }
      ])

      const sources = await ArticleModel.getUniqueSources()
      const uniqueTestSources = sources.filter(s => s.startsWith('Unique Source'))
      
      expect(uniqueTestSources).toHaveLength(2)
      expect(uniqueTestSources).toContain('Unique Source A')
      expect(uniqueTestSources).toContain('Unique Source B')

      // Clean up
      await db(TABLE_NAMES.ARTICLES).where('source', 'like', 'Unique Source%').del()
    })
  })
})