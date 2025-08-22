import db from '../database/connection.js';
import { UserInteraction, CreateInteractionData, TABLE_NAMES } from '../types/models.js';

export class UserInteractionModel {
  /**
   * Create a new user interaction
   */
  static async create(interactionData: CreateInteractionData): Promise<UserInteraction> {
    const [interaction] = await db(TABLE_NAMES.USER_INTERACTIONS)
      .insert(interactionData)
      .returning('*');
    return interaction;
  }

  /**
   * Find interactions by user ID
   */
  static async findByUserId(
    userId: number, 
    interactionType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserInteraction[]> {
    let query = db(TABLE_NAMES.USER_INTERACTIONS)
      .where({ user_id: userId });

    if (interactionType) {
      query = query.andWhere({ interaction_type: interactionType });
    }

    return query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find interactions by article ID
   */
  static async findByArticleId(
    articleId: number,
    interactionType?: string
  ): Promise<UserInteraction[]> {
    let query = db(TABLE_NAMES.USER_INTERACTIONS)
      .where({ article_id: articleId });

    if (interactionType) {
      query = query.andWhere({ interaction_type: interactionType });
    }

    return query.orderBy('created_at', 'desc');
  }

  /**
   * Get user's bookmarked articles
   */
  static async getUserBookmarks(userId: number): Promise<UserInteraction[]> {
    return db(TABLE_NAMES.USER_INTERACTIONS)
      .where({ 
        user_id: userId, 
        interaction_type: 'bookmark' 
      })
      .orderBy('created_at', 'desc');
  }

  /**
   * Check if user has specific interaction with article
   */
  static async hasInteraction(
    userId: number, 
    articleId: number, 
    interactionType: string
  ): Promise<boolean> {
    const interaction = await db(TABLE_NAMES.USER_INTERACTIONS)
      .where({
        user_id: userId,
        article_id: articleId,
        interaction_type: interactionType,
      })
      .first();
    return !!interaction;
  }

  /**
   * Remove specific interaction
   */
  static async removeInteraction(
    userId: number, 
    articleId: number, 
    interactionType: string
  ): Promise<boolean> {
    const deletedCount = await db(TABLE_NAMES.USER_INTERACTIONS)
      .where({
        user_id: userId,
        article_id: articleId,
        interaction_type: interactionType,
      })
      .del();
    return deletedCount > 0;
  }

  /**
   * Get interaction statistics for an article
   */
  static async getArticleStats(articleId: number): Promise<{
    views: number;
    bookmarks: number;
    shares: number;
  }> {
    const stats = await db(TABLE_NAMES.USER_INTERACTIONS)
      .where({ article_id: articleId })
      .select('interaction_type')
      .count('* as count')
      .groupBy('interaction_type');

    const result = {
      views: 0,
      bookmarks: 0,
      shares: 0,
    };

    stats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      switch (stat.interaction_type) {
        case 'view':
          result.views = count;
          break;
        case 'bookmark':
          result.bookmarks = count;
          break;
        case 'share':
          result.shares = count;
          break;
      }
    });

    return result;
  }

  /**
   * Get user's interaction history with articles
   */
  static async getUserHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<UserInteraction & { article_title: string; article_url: string }>> {
    return db(TABLE_NAMES.USER_INTERACTIONS)
      .join(TABLE_NAMES.ARTICLES, 'user_interactions.article_id', 'articles.id')
      .where({ user_id: userId })
      .select(
        'user_interactions.*',
        'articles.title as article_title',
        'articles.url as article_url'
      )
      .orderBy('user_interactions.created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
}