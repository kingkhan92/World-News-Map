import { describe, it, expect } from 'vitest';
import { ArticleValidator, ArticleSanitizer, validateAndSanitizeArticle } from '../articleValidation.js';
import { CreateArticleData, BiasAnalysis } from '../../types/models.js';
import { ValidationError } from '../../middleware/errorHandler.js';

describe('ArticleValidator', () => {
  const validArticleData: CreateArticleData = {
    title: 'Test Article',
    content: 'This is test content',
    summary: 'Test summary',
    url: 'https://example.com/article',
    source: 'Test Source',
    published_at: new Date('2024-01-01'),
    latitude: 40.7128,
    longitude: -74.0060,
    location_name: 'New York',
    bias_score: 50,
    bias_analysis: {
      politicalLean: 'center',
      factualAccuracy: 85,
      emotionalTone: 0,
      confidence: 90,
    },
  };

  describe('validateCreateData', () => {
    it('should validate correct article data', () => {
      expect(() => ArticleValidator.validateCreateData(validArticleData)).not.toThrow();
    });

    it('should throw error for missing title', () => {
      const invalidData = { ...validArticleData };
      delete (invalidData as any).title;
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow(ValidationError);
    });

    it('should throw error for title too long', () => {
      const invalidData = { ...validArticleData, title: 'a'.repeat(501) };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Title must be 500 characters or less');
    });

    it('should throw error for invalid URL', () => {
      const invalidData = { ...validArticleData, url: 'not-a-url' };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('URL must be a valid HTTP/HTTPS URL');
    });

    it('should throw error for missing source', () => {
      const invalidData = { ...validArticleData };
      delete (invalidData as any).source;
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Source is required');
    });

    it('should throw error for future published date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const invalidData = { ...validArticleData, published_at: futureDate };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Published date cannot be in the future');
    });

    it('should throw error for invalid latitude', () => {
      const invalidData = { ...validArticleData, latitude: 91 };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Latitude must be a number between -90 and 90');
    });

    it('should throw error for invalid longitude', () => {
      const invalidData = { ...validArticleData, longitude: 181 };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Longitude must be a number between -180 and 180');
    });

    it('should throw error for invalid bias score', () => {
      const invalidData = { ...validArticleData, bias_score: 101 };
      
      expect(() => ArticleValidator.validateCreateData(invalidData))
        .toThrow('Bias score must be a number between 0 and 100');
    });

    it('should accept null values for optional fields', () => {
      const dataWithNulls = {
        ...validArticleData,
        latitude: null,
        longitude: null,
        location_name: null,
        bias_score: null,
        bias_analysis: null,
      };
      
      expect(() => ArticleValidator.validateCreateData(dataWithNulls)).not.toThrow();
    });
  });

  describe('validateBiasAnalysis', () => {
    const validBiasAnalysis: BiasAnalysis = {
      politicalLean: 'center',
      factualAccuracy: 85,
      emotionalTone: 0,
      confidence: 90,
    };

    it('should validate correct bias analysis', () => {
      const errors = ArticleValidator.validateBiasAnalysis(validBiasAnalysis);
      expect(errors).toHaveLength(0);
    });

    it('should return error for invalid political lean', () => {
      const invalidAnalysis = { ...validBiasAnalysis, politicalLean: 'invalid' };
      const errors = ArticleValidator.validateBiasAnalysis(invalidAnalysis);
      
      expect(errors).toContain('Political lean must be one of: left, center, right');
    });

    it('should return error for invalid factual accuracy', () => {
      const invalidAnalysis = { ...validBiasAnalysis, factualAccuracy: 101 };
      const errors = ArticleValidator.validateBiasAnalysis(invalidAnalysis);
      
      expect(errors).toContain('Factual accuracy must be a number between 0 and 100');
    });

    it('should return error for invalid emotional tone', () => {
      const invalidAnalysis = { ...validBiasAnalysis, emotionalTone: 101 };
      const errors = ArticleValidator.validateBiasAnalysis(invalidAnalysis);
      
      expect(errors).toContain('Emotional tone must be a number between -100 and 100');
    });

    it('should return error for invalid confidence', () => {
      const invalidAnalysis = { ...validBiasAnalysis, confidence: -1 };
      const errors = ArticleValidator.validateBiasAnalysis(invalidAnalysis);
      
      expect(errors).toContain('Confidence must be a number between 0 and 100');
    });
  });
});

describe('ArticleSanitizer', () => {
  const articleWithXSS: CreateArticleData = {
    title: 'Test <script>alert("xss")</script> Article',
    content: 'Content with <script>malicious()</script> and <p>good content</p>',
    summary: 'Summary with javascript:alert("xss") link',
    url: 'https://example.com/article?param=<script>alert("xss")</script>',
    source: 'Source with <img onerror="alert(1)" src="x">',
    published_at: new Date('2024-01-01'),
    location_name: 'Location <script>alert("location")</script>',
    bias_analysis: {
      politicalLean: 'center',
      factualAccuracy: 85,
      emotionalTone: 0,
      confidence: 90,
    },
  };

  describe('sanitizeCreateData', () => {
    it('should remove script tags from title', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.title).toBe('Test  Article');
    });

    it('should remove malicious content but keep safe HTML', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.content).toBe('Content with  and <p>good content</p>');
    });

    it('should remove javascript protocols from summary', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.summary).toBe('Summary with alert("xss") link');
    });

    it('should sanitize URL', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.url).not.toContain('<script>');
    });

    it('should remove event handlers from source', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.source).not.toContain('onerror');
    });

    it('should sanitize location name', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.location_name).toBe('Location');
    });

    it('should preserve bias analysis unchanged', () => {
      const sanitized = ArticleSanitizer.sanitizeCreateData(articleWithXSS);
      expect(sanitized.bias_analysis).toEqual(articleWithXSS.bias_analysis);
    });
  });
});

describe('validateAndSanitizeArticle', () => {
  it('should validate and sanitize article data', () => {
    const inputData = {
      title: 'Test <script>alert("xss")</script> Article',
      content: 'Safe content',
      summary: 'Safe summary',
      url: 'https://example.com/article',
      source: 'Test Source',
      published_at: new Date('2024-01-01'),
    };

    const result = validateAndSanitizeArticle(inputData);
    
    expect(result.title).toBe('Test  Article');
    expect(result.content).toBe('Safe content');
    expect(result.url).toBe('https://example.com/article');
  });

  it('should throw validation error for invalid data', () => {
    const invalidData = {
      title: '', // Invalid: empty title
      url: 'https://example.com/article',
      source: 'Test Source',
      published_at: new Date('2024-01-01'),
    };

    expect(() => validateAndSanitizeArticle(invalidData))
      .toThrow(ValidationError);
  });
});