import db from '../database/connection.js';
import { Article, CreateArticleData, TABLE_NAMES } from '../types/models.js';
import { validateAndSanitizeArticle } from '../utils/articleValidation.js';
import { logger } from '../utils/logger.js';

export interface ArticleFilters {
  startDate?: Date;
  endDate?: Date;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  source?: string;
  biasScoreMin?: number;
  biasScoreMax?: number;
  keyword?: string;
}

export class ArticleModel {
  /**
   * Create a new article with validation and sanitization
   */
  static async create(articleData: Partial<CreateArticleData>): Promise<Article> {
    // Validate and sanitize the article data
    const validatedData = validateAndSanitizeArticle(articleData);
    
    logger.info('Creating new article', { 
      title: validatedData.title, 
      source: validatedData.source,
      url: validatedData.url 
    });

    const [article] = await db(TABLE_NAMES.ARTICLES)
      .insert({
        ...validatedData,
        updated_at: new Date(),
      })
      .returning('*');
    
    return article;
  }

  /**
   * Create multiple articles in batch with validation
   */
  static async createBatch(articlesData: Partial<CreateArticleData>[]): Promise<Article[]> {
    if (articlesData.length === 0) {
      return [];
    }

    // Validate and sanitize all articles
    const validatedArticles = articlesData.map(data => validateAndSanitizeArticle(data));
    
    logger.info('Creating batch of articles', { count: validatedArticles.length });

    const articles = await db(TABLE_NAMES.ARTICLES)
      .insert(validatedArticles.map(data => ({
        ...data,
        updated_at: new Date(),
      })))
      .returning('*');
    
    return articles;
  }

  /**
   * Find article by ID
   */
  static async findById(id: number): Promise<Article | null> {
    const article = await db(TABLE_NAMES.ARTICLES)
      .where({ id })
      .first();
    return article || null;
  }

  /**
   * Find article by URL
   */
  static async findByUrl(url: string): Promise<Article | null> {
    const article = await db(TABLE_NAMES.ARTICLES)
      .where({ url })
      .first();
    return article || null;
  }

  /**
   * Get articles with filters and pagination
   */
  static async findWithFilters(
    filters: ArticleFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<Article[]> {
    let query = db(TABLE_NAMES.ARTICLES);

    // Date range filter
    if (filters.startDate) {
      query = query.where('published_at', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('published_at', '<=', filters.endDate);
    }

    // Geographic filter (simplified - for exact implementation would use PostGIS)
    if (filters.latitude && filters.longitude && filters.radius) {
      // Simple bounding box approximation
      const latDelta = filters.radius / 111; // roughly 111 km per degree
      const lngDelta = filters.radius / (111 * Math.cos(filters.latitude * Math.PI / 180));
      
      query = query
        .whereBetween('latitude', [filters.latitude - latDelta, filters.latitude + latDelta])
        .whereBetween('longitude', [filters.longitude - lngDelta, filters.longitude + lngDelta]);
    }

    // Source filter
    if (filters.source) {
      query = query.where('source', filters.source);
    }

    // Bias score filter
    if (filters.biasScoreMin !== undefined) {
      query = query.where('bias_score', '>=', filters.biasScoreMin);
    }
    if (filters.biasScoreMax !== undefined) {
      query = query.where('bias_score', '<=', filters.biasScoreMax);
    }

    // Keyword search
    if (filters.keyword) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${filters.keyword}%`)
          .orWhere('summary', 'ilike', `%${filters.keyword}%`)
          .orWhere('content', 'ilike', `%${filters.keyword}%`);
      });
    }

    return query
      .orderBy('published_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get articles by date
   */
  static async findByDate(date: Date): Promise<Article[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db(TABLE_NAMES.ARTICLES)
      .whereBetween('published_at', [startOfDay, endOfDay])
      .orderBy('published_at', 'desc');
  }

  /**
   * Update article bias analysis
   */
  static async updateBiasAnalysis(
    id: number, 
    biasScore: number, 
    biasAnalysis: any
  ): Promise<Article | null> {
    const [article] = await db(TABLE_NAMES.ARTICLES)
      .where({ id })
      .update({
        bias_score: biasScore,
        bias_analysis: biasAnalysis,
        updated_at: new Date(),
      })
      .returning('*');
    
    // Broadcast the update via Socket.io if article was updated
    if (article) {
      try {
        const { broadcastNewsUpdate } = await import('../services/socketService.js');
        broadcastNewsUpdate(article, 'updated');
      } catch (error) {
        // Don't fail the update if broadcasting fails
        console.warn('Failed to broadcast bias analysis update:', error);
      }
    }
    
    return article || null;
  }

  /**
   * Get articles count with filters
   */
  static async countWithFilters(filters: ArticleFilters = {}): Promise<number> {
    let query = db(TABLE_NAMES.ARTICLES);

    // Apply same filters as findWithFilters
    if (filters.startDate) {
      query = query.where('published_at', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('published_at', '<=', filters.endDate);
    }
    if (filters.source) {
      query = query.where('source', filters.source);
    }
    if (filters.biasScoreMin !== undefined) {
      query = query.where('bias_score', '>=', filters.biasScoreMin);
    }
    if (filters.biasScoreMax !== undefined) {
      query = query.where('bias_score', '<=', filters.biasScoreMax);
    }
    if (filters.keyword) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${filters.keyword}%`)
          .orWhere('summary', 'ilike', `%${filters.keyword}%`)
          .orWhere('content', 'ilike', `%${filters.keyword}%`);
      });
    }

    const result = await query.count('id as count').first();
    return parseInt(result?.count as string) || 0;
  }

  /**
   * Update article with validation
   */
  static async update(id: number, updateData: Partial<CreateArticleData>): Promise<Article | null> {
    // Validate and sanitize update data
    const validatedData = validateAndSanitizeArticle({
      title: 'temp', // Required for validation, will be overridden
      url: 'https://temp.com', // Required for validation, will be overridden
      source: 'temp', // Required for validation, will be overridden
      published_at: new Date(), // Required for validation, will be overridden
      ...updateData
    });

    // Remove the temporary fields if they weren't in the original update data
    const finalUpdateData: any = { ...validatedData, updated_at: new Date() };
    if (!updateData.title) delete finalUpdateData.title;
    if (!updateData.url) delete finalUpdateData.url;
    if (!updateData.source) delete finalUpdateData.source;
    if (!updateData.published_at) delete finalUpdateData.published_at;

    const [article] = await db(TABLE_NAMES.ARTICLES)
      .where({ id })
      .update(finalUpdateData)
      .returning('*');
    
    return article || null;
  }

  /**
   * Get articles within a geographic bounding box
   */
  static async findInBoundingBox(
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number },
    limit: number = 50
  ): Promise<Article[]> {
    return db(TABLE_NAMES.ARTICLES)
      .whereBetween('latitude', [southWest.lat, northEast.lat])
      .whereBetween('longitude', [southWest.lng, northEast.lng])
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .orderBy('published_at', 'desc')
      .limit(limit);
  }

  /**
   * Get articles by source with date range
   */
  static async findBySourceAndDateRange(
    source: string,
    startDate: Date,
    endDate: Date,
    limit: number = 50
  ): Promise<Article[]> {
    return db(TABLE_NAMES.ARTICLES)
      .where({ source })
      .whereBetween('published_at', [startDate, endDate])
      .orderBy('published_at', 'desc')
      .limit(limit);
  }

  /**
   * Get articles with bias scores in range
   */
  static async findByBiasRange(
    minScore: number,
    maxScore: number,
    limit: number = 50
  ): Promise<Article[]> {
    return db(TABLE_NAMES.ARTICLES)
      .whereBetween('bias_score', [minScore, maxScore])
      .whereNotNull('bias_score')
      .orderBy('published_at', 'desc')
      .limit(limit);
  }

  /**
   * Get recent articles (last 24 hours)
   */
  static async findRecent(limit: number = 50): Promise<Article[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return db(TABLE_NAMES.ARTICLES)
      .where('published_at', '>=', yesterday)
      .orderBy('published_at', 'desc')
      .limit(limit);
  }

  /**
   * Get articles by location name (fuzzy search)
   */
  static async findByLocation(locationName: string, limit: number = 50): Promise<Article[]> {
    return db(TABLE_NAMES.ARTICLES)
      .where('location_name', 'ilike', `%${locationName}%`)
      .whereNotNull('location_name')
      .orderBy('published_at', 'desc')
      .limit(limit);
  }

  /**
   * Get unique sources from articles
   */
  static async getUniqueSources(): Promise<string[]> {
    const result = await db(TABLE_NAMES.ARTICLES)
      .distinct('source')
      .orderBy('source');
    
    return result.map(row => row.source);
  }

  /**
   * Get articles statistics
   */
  static async getStatistics(): Promise<{
    totalArticles: number;
    articlesWithLocation: number;
    articlesWithBias: number;
    uniqueSources: number;
    dateRange: { earliest: Date | null; latest: Date | null };
  }> {
    const [stats] = await db(TABLE_NAMES.ARTICLES)
      .select([
        db.raw('COUNT(*) as total_articles'),
        db.raw('COUNT(latitude) as articles_with_location'),
        db.raw('COUNT(bias_score) as articles_with_bias'),
        db.raw('COUNT(DISTINCT source) as unique_sources'),
        db.raw('MIN(published_at) as earliest_date'),
        db.raw('MAX(published_at) as latest_date'),
      ]);

    return {
      totalArticles: parseInt(stats.total_articles),
      articlesWithLocation: parseInt(stats.articles_with_location),
      articlesWithBias: parseInt(stats.articles_with_bias),
      uniqueSources: parseInt(stats.unique_sources),
      dateRange: {
        earliest: stats.earliest_date,
        latest: stats.latest_date,
      },
    };
  }

  /**
   * Delete article by ID
   */
  static async deleteById(id: number): Promise<boolean> {
    const deletedCount = await db(TABLE_NAMES.ARTICLES)
      .where({ id })
      .del();
    return deletedCount > 0;
  }

  /**
   * Delete articles older than specified date
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const deletedCount = await db(TABLE_NAMES.ARTICLES)
      .where('published_at', '<', date)
      .del();
    
    logger.info('Deleted old articles', { count: deletedCount, beforeDate: date });
    return deletedCount;
  }
}