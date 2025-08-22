import { api } from './api';
import { Article, ApiResponse } from '../types/api';
import { MapPin, MapBounds } from '../types/map';

export interface NewsQueryParams {
  date?: string; // YYYY-MM-DD format for single date
  startDate?: string; // YYYY-MM-DD format for range start
  endDate?: string; // YYYY-MM-DD format for range end
  lat?: number;
  lng?: number;
  radius?: number; // in kilometers
  bounds?: MapBounds;
  sources?: string[];
  keywords?: string;
  biasRange?: [number, number];
  limit?: number;
  offset?: number;
}

export class NewsService {
  /**
   * Fetch news articles with optional filtering
   */
  static async getArticles(params: NewsQueryParams = {}): Promise<Article[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.date) queryParams.append('date', params.date);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.lat !== undefined) queryParams.append('lat', params.lat.toString());
      if (params.lng !== undefined) queryParams.append('lng', params.lng.toString());
      if (params.radius) queryParams.append('radius', params.radius.toString());
      if (params.bounds) {
        queryParams.append('north', params.bounds.north.toString());
        queryParams.append('south', params.bounds.south.toString());
        queryParams.append('east', params.bounds.east.toString());
        queryParams.append('west', params.bounds.west.toString());
      }
      if (params.sources?.length) {
        params.sources.forEach(source => queryParams.append('sources', source));
      }
      if (params.keywords) queryParams.append('keywords', params.keywords);
      if (params.biasRange) {
        queryParams.append('biasMin', params.biasRange[0].toString());
        queryParams.append('biasMax', params.biasRange[1].toString());
      }
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await api.get<ApiResponse<Article[]>>(`/news/articles?${queryParams}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  }

  /**
   * Get a single article by ID
   */
  static async getArticle(id: number): Promise<Article> {
    try {
      const response = await api.get<ApiResponse<Article>>(`/news/article/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching article:', error);
      throw error;
    }
  }

  /**
   * Trigger news refresh
   */
  static async refreshNews(): Promise<void> {
    try {
      await api.post('/news/refresh');
    } catch (error) {
      console.error('Error refreshing news:', error);
      throw error;
    }
  }

  /**
   * Get available news sources
   */
  static async getSources(): Promise<string[]> {
    try {
      const response = await api.get<ApiResponse<string[]>>('/news/sources');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching sources:', error);
      throw error;
    }
  }

  /**
   * Convert articles to map pins
   */
  static articlesToMapPins(articles: Article[]): MapPin[] {
    return articles
      .filter(article => article.latitude && article.longitude)
      .map(article => ({
        id: article.id,
        latitude: article.latitude,
        longitude: article.longitude,
        article: {
          id: article.id,
          title: article.title,
          summary: article.summary,
          source: article.source,
          biasScore: article.biasScore,
          url: article.url,
          locationName: article.locationName,
          publishedAt: article.publishedAt,
        },
      }));
  }
}

export default NewsService;