import { CreateArticleData, BiasAnalysis } from '../types/models.js';
import { ValidationError } from '../middleware/errorHandler.js';

/**
 * Validates article data before creation or update
 */
export class ArticleValidator {
  /**
   * Validate article creation data
   */
  static validateCreateData(data: Partial<CreateArticleData>): CreateArticleData {
    const errors: string[] = [];

    // Required fields validation
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else if (data.title.length > 500) {
      errors.push('Title must be 500 characters or less');
    }

    if (!data.url || typeof data.url !== 'string') {
      errors.push('URL is required and must be a string');
    } else if (data.url.length > 1000) {
      errors.push('URL must be 1000 characters or less');
    } else if (!this.isValidUrl(data.url)) {
      errors.push('URL must be a valid HTTP/HTTPS URL');
    }

    if (!data.source || typeof data.source !== 'string') {
      errors.push('Source is required and must be a string');
    } else if (data.source.length > 100) {
      errors.push('Source must be 100 characters or less');
    }

    if (!data.published_at || !(data.published_at instanceof Date)) {
      errors.push('Published date is required and must be a valid Date');
    } else if (data.published_at > new Date()) {
      errors.push('Published date cannot be in the future');
    }

    // Optional fields validation
    if (data.content !== undefined && typeof data.content !== 'string') {
      errors.push('Content must be a string');
    }

    if (data.summary !== undefined && typeof data.summary !== 'string') {
      errors.push('Summary must be a string');
    }

    if (data.location_name !== undefined && data.location_name !== null) {
      if (typeof data.location_name !== 'string') {
        errors.push('Location name must be a string');
      } else if (data.location_name.length > 200) {
        errors.push('Location name must be 200 characters or less');
      }
    }

    // Geographic coordinates validation
    if (data.latitude !== undefined && data.latitude !== null) {
      if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
        errors.push('Latitude must be a number between -90 and 90');
      }
    }

    if (data.longitude !== undefined && data.longitude !== null) {
      if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
        errors.push('Longitude must be a number between -180 and 180');
      }
    }

    // Bias score validation
    if (data.bias_score !== undefined && data.bias_score !== null) {
      if (typeof data.bias_score !== 'number' || data.bias_score < 0 || data.bias_score > 100) {
        errors.push('Bias score must be a number between 0 and 100');
      }
    }

    // Bias analysis validation
    if (data.bias_analysis !== undefined && data.bias_analysis !== null) {
      const biasErrors = this.validateBiasAnalysis(data.bias_analysis);
      errors.push(...biasErrors);
    }

    if (errors.length > 0) {
      throw new ValidationError(`Article validation failed: ${errors.join(', ')}`);
    }

    return data as CreateArticleData;
  }

  /**
   * Validate bias analysis object
   */
  static validateBiasAnalysis(biasAnalysis: any): string[] {
    const errors: string[] = [];

    if (typeof biasAnalysis !== 'object' || biasAnalysis === null) {
      return ['Bias analysis must be an object'];
    }

    // Political lean validation
    if (biasAnalysis.politicalLean !== undefined) {
      const validLeans = ['left', 'center', 'right'];
      if (!validLeans.includes(biasAnalysis.politicalLean)) {
        errors.push('Political lean must be one of: left, center, right');
      }
    }

    // Factual accuracy validation
    if (biasAnalysis.factualAccuracy !== undefined) {
      if (typeof biasAnalysis.factualAccuracy !== 'number' || 
          biasAnalysis.factualAccuracy < 0 || 
          biasAnalysis.factualAccuracy > 100) {
        errors.push('Factual accuracy must be a number between 0 and 100');
      }
    }

    // Emotional tone validation
    if (biasAnalysis.emotionalTone !== undefined) {
      if (typeof biasAnalysis.emotionalTone !== 'number' || 
          biasAnalysis.emotionalTone < -100 || 
          biasAnalysis.emotionalTone > 100) {
        errors.push('Emotional tone must be a number between -100 and 100');
      }
    }

    // Confidence validation
    if (biasAnalysis.confidence !== undefined) {
      if (typeof biasAnalysis.confidence !== 'number' || 
          biasAnalysis.confidence < 0 || 
          biasAnalysis.confidence > 100) {
        errors.push('Confidence must be a number between 0 and 100');
      }
    }

    return errors;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Sanitizes article data to prevent XSS and other security issues
 */
export class ArticleSanitizer {
  /**
   * Sanitize article data for safe storage
   */
  static sanitizeCreateData(data: CreateArticleData): CreateArticleData {
    return {
      ...data,
      title: this.sanitizeString(data.title),
      content: data.content ? this.sanitizeString(data.content) : data.content,
      summary: data.summary ? this.sanitizeString(data.summary) : data.summary,
      url: this.sanitizeUrl(data.url),
      source: this.sanitizeString(data.source),
      location_name: data.location_name ? this.sanitizeString(data.location_name) : data.location_name,
      // Geographic coordinates and dates don't need sanitization
      latitude: data.latitude,
      longitude: data.longitude,
      published_at: data.published_at,
      bias_score: data.bias_score,
      bias_analysis: data.bias_analysis ? this.sanitizeBiasAnalysis(data.bias_analysis) : data.bias_analysis,
    };
  }

  /**
   * Sanitize string content
   */
  private static sanitizeString(str: string): string {
    return str
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocols
      .replace(/javascript:/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove potentially dangerous HTML tags but keep basic formatting
      .replace(/<(?!\/?(p|br|strong|em|u|i|b|h[1-6]|ul|ol|li|blockquote)\b)[^>]*>/gi, '')
      // Trim whitespace
      .trim();
  }

  /**
   * Sanitize URL
   */
  private static sanitizeUrl(url: string): string {
    // Remove any potential XSS attempts from URL
    return url
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .trim();
  }

  /**
   * Sanitize bias analysis object
   */
  private static sanitizeBiasAnalysis(biasAnalysis: BiasAnalysis): BiasAnalysis {
    return {
      politicalLean: biasAnalysis.politicalLean,
      factualAccuracy: biasAnalysis.factualAccuracy,
      emotionalTone: biasAnalysis.emotionalTone,
      confidence: biasAnalysis.confidence,
    };
  }
}

/**
 * Combined validation and sanitization for articles
 */
export const validateAndSanitizeArticle = (data: Partial<CreateArticleData>): CreateArticleData => {
  // First validate the data structure
  const validatedData = ArticleValidator.validateCreateData(data);
  
  // Then sanitize the content
  return ArticleSanitizer.sanitizeCreateData(validatedData);
};