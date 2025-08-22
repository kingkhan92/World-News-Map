import { Router } from 'express'
import { body } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { handleValidationErrors, paginationValidation } from '../middleware/validation.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const router = Router()

// User preferences validation
const preferencesValidation = [
  body('defaultView')
    .optional()
    .isIn(['map', 'globe'])
    .withMessage('Default view must be either "map" or "globe"'),
  body('preferredSources')
    .optional()
    .isArray()
    .withMessage('Preferred sources must be an array'),
  body('preferredSources.*')
    .optional()
    .isString()
    .withMessage('Each preferred source must be a string'),
  body('biasThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Bias threshold must be between 0 and 100'),
  body('autoRefresh')
    .optional()
    .isBoolean()
    .withMessage('Auto refresh must be a boolean')
]

// GET /api/user/preferences - Get user preferences
router.get('/preferences',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id
    
    logger.info('User preferences requested:', { userId })

    try {
      const { UserModel } = await import('../models/User.js')
      const user = await UserModel.findById(userId)
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        })
      }

      // Provide default preferences if none exist
      const defaultPreferences = {
        defaultView: 'map' as const,
        preferredSources: [],
        biasThreshold: 50,
        autoRefresh: true
      }

      const preferences = user.preferences || defaultPreferences

      res.json({
        data: {
          preferences
        }
      })
    } catch (error) {
      logger.error('Error retrieving user preferences:', error)
      res.status(500).json({
        error: {
          code: 'PREFERENCES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve user preferences',
          timestamp: new Date().toISOString()
        }
      })
    }
  })
)

// PUT /api/user/preferences - Update user preferences
router.put('/preferences',
  authenticateToken,
  preferencesValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id
    const preferences = req.body
    
    logger.info('User preferences update requested:', { 
      userId, 
      preferences 
    })

    try {
      const { UserModel } = await import('../models/User.js')
      const updatedUser = await UserModel.updatePreferences(userId, preferences)
      
      if (!updatedUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        })
      }

      res.json({
        data: {
          preferences: updatedUser.preferences,
          message: 'User preferences updated successfully'
        }
      })
    } catch (error) {
      logger.error('Error updating user preferences:', error)
      res.status(500).json({
        error: {
          code: 'PREFERENCES_UPDATE_ERROR',
          message: 'Failed to update user preferences',
          timestamp: new Date().toISOString()
        }
      })
    }
  })
)

// GET /api/user/history - Get user interaction history
router.get('/history',
  authenticateToken,
  paginationValidation,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const interactionType = req.query.type as string
    const offset = (page - 1) * limit
    
    logger.info('User history requested:', { 
      userId, 
      page, 
      limit,
      interactionType 
    })

    try {
      const { UserInteractionModel } = await import('../models/UserInteraction.js')
      
      // Get user history with article details
      const history = await UserInteractionModel.getUserHistory(userId, limit, offset)
      
      // Get total count for pagination
      const totalQuery = await import('../database/connection.js')
      const db = totalQuery.default
      let countQuery = db('user_interactions').where({ user_id: userId })
      
      if (interactionType) {
        countQuery = countQuery.andWhere({ interaction_type: interactionType })
      }
      
      const [{ count }] = await countQuery.count('* as count')
      const total = parseInt(count as string)
      const totalPages = Math.ceil(total / limit)

      res.json({
        data: {
          history,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      })
    } catch (error) {
      logger.error('Error retrieving user history:', error)
      res.status(500).json({
        error: {
          code: 'HISTORY_RETRIEVAL_ERROR',
          message: 'Failed to retrieve user history',
          timestamp: new Date().toISOString()
        }
      })
    }
  })
)

// POST /api/user/interaction - Record user interaction
router.post('/interaction',
  authenticateToken,
  [
    body('articleId')
      .isInt({ min: 1 })
      .withMessage('Valid article ID is required'),
    body('interactionType')
      .isIn(['view', 'bookmark', 'share'])
      .withMessage('Interaction type must be view, bookmark, or share')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id
    const { articleId, interactionType } = req.body
    
    logger.info('User interaction recorded:', { 
      userId, 
      articleId, 
      interactionType 
    })

    try {
      const { UserInteractionModel } = await import('../models/UserInteraction.js')
      
      // For bookmarks, check if it already exists and toggle
      if (interactionType === 'bookmark') {
        const hasBookmark = await UserInteractionModel.hasInteraction(userId, articleId, 'bookmark')
        
        if (hasBookmark) {
          // Remove bookmark
          await UserInteractionModel.removeInteraction(userId, articleId, 'bookmark')
          res.json({
            data: {
              message: 'Bookmark removed successfully',
              interaction: {
                userId,
                articleId,
                interactionType: 'unbookmark',
                timestamp: new Date().toISOString()
              }
            }
          })
          return
        }
      }
      
      // Create new interaction
      const interaction = await UserInteractionModel.create({
        user_id: userId,
        article_id: articleId,
        interaction_type: interactionType
      })

      res.json({
        data: {
          message: 'Interaction recorded successfully',
          interaction: {
            id: interaction.id,
            userId: interaction.user_id,
            articleId: interaction.article_id,
            interactionType: interaction.interaction_type,
            timestamp: interaction.created_at.toISOString()
          }
        }
      })
    } catch (error) {
      logger.error('Error recording user interaction:', error)
      res.status(500).json({
        error: {
          code: 'INTERACTION_RECORDING_ERROR',
          message: 'Failed to record user interaction',
          timestamp: new Date().toISOString()
        }
      })
    }
  })
)

// GET /api/user/bookmarks/:articleId - Check if article is bookmarked
router.get('/bookmarks/:articleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id
    const articleId = parseInt(req.params.articleId)
    
    if (!articleId || articleId < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ARTICLE_ID',
          message: 'Valid article ID is required',
          timestamp: new Date().toISOString()
        }
      })
    }
    
    logger.info('Bookmark status check requested:', { userId, articleId })

    try {
      const { UserInteractionModel } = await import('../models/UserInteraction.js')
      const isBookmarked = await UserInteractionModel.hasInteraction(userId, articleId, 'bookmark')

      res.json({
        data: {
          isBookmarked,
          articleId
        }
      })
    } catch (error) {
      logger.error('Error checking bookmark status:', error)
      res.status(500).json({
        error: {
          code: 'BOOKMARK_CHECK_ERROR',
          message: 'Failed to check bookmark status',
          timestamp: new Date().toISOString()
        }
      })
    }
  })
)

export default router