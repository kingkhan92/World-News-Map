import axios, { AxiosResponse } from 'axios';
import { logger } from '../utils/logger.js';
import { ArticleModel } from '../models/Article.js';
import { CreateArticleData } from '../types/models.js';
import { BiasAnalysisService } from './biasAnalysisService.js';
import { broadcastNewsUpdate } from './socketService.js';

// News API interfaces
interface NewsAPIArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  source: { name: string };
  publishedAt: string;
  urlToImage?: string;
}

interface GuardianArticle {
  webTitle: string;
  webUrl: string;
  fields?: {
    bodyText?: string;
    trailText?: string;
  };
  webPublicationDate: string;
  sectionName: string;
}

interface ReutersArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content?: string;
}

// Location extraction interface
interface LocationData {
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
}

export class NewsAggregationService {
  private readonly newsApiKey: string;
  private readonly guardianApiKey: string;
  private readonly geocodingApiKey: string;
  
  // Rate limiting
  private lastNewsAPICall = 0;
  private lastGuardianCall = 0;
  private lastGeocodingCall = 0;
  
  private readonly NEWS_API_DELAY = 1000; // 1 second between calls
  private readonly GUARDIAN_API_DELAY = 200; // 200ms between calls
  private readonly GEOCODING_DELAY = 100; // 100ms between calls

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY || '';
    this.guardianApiKey = process.env.GUARDIAN_API_KEY || '';
    this.geocodingApiKey = process.env.OPENCAGE_API_KEY || '';
    
    if (!this.newsApiKey) {
      logger.warn('NEWS_API_KEY not configured - NewsAPI integration disabled');
    }
    if (!this.guardianApiKey) {
      logger.warn('GUARDIAN_API_KEY not configured - Guardian integration disabled');
    }
    if (!this.geocodingApiKey) {
      logger.warn('OPENCAGE_API_KEY not configured - Geocoding disabled');
    }
  }

  /**
   * Fetch news from all configured sources
   */
  async fetchAllNews(): Promise<CreateArticleData[]> {
    logger.info('Starting news aggregation from all sources');
    
    const allArticles: CreateArticleData[] = [];
    
    try {
      // Fetch from NewsAPI
      if (this.newsApiKey) {
        const newsApiArticles = await this.fetchFromNewsAPI();
        allArticles.push(...newsApiArticles);
        logger.info(`Fetched ${newsApiArticles.length} articles from NewsAPI`);
      }
      
      // Fetch from Guardian
      if (this.guardianApiKey) {
        const guardianArticles = await this.fetchFromGuardian();
        allArticles.push(...guardianArticles);
        logger.info(`Fetched ${guardianArticles.length} articles from Guardian`);
      }
      
      // Fetch from Reuters (using NewsAPI as proxy)
      const reutersArticles = await this.fetchFromReuters();
      allArticles.push(...reutersArticles);
      logger.info(`Fetched ${reutersArticles.length} articles from Reuters`);
      
      // Process location data for all articles
      const articlesWithLocation = await this.processLocationData(allArticles);
      
      logger.info(`Total articles aggregated: ${articlesWithLocation.length}`);
      return articlesWithLocation;
      
    } catch (error) {
      logger.error('Error in news aggregation', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Fetch news from NewsAPI
   */
  private async fetchFromNewsAPI(): Promise<CreateArticleData[]> {
    await this.rateLimitDelay('newsapi');
    
    try {
      const response: AxiosResponse = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          apiKey: this.newsApiKey,
          language: 'en',
          pageSize: 50,
          category: 'general'
        },
        timeout: 10000
      });
      
      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.message}`);
      }
      
      return response.data.articles
        .filter((article: NewsAPIArticle) => 
          article.title && 
          article.url && 
          article.source?.name &&
          article.title !== '[Removed]'
        )
        .map((article: NewsAPIArticle) => ({
          title: article.title,
          content: article.content || article.description || '',
          summary: article.description || article.title,
          url: article.url,
          source: article.source.name,
          published_at: new Date(article.publishedAt)
        }));
        
    } catch (error) {
      logger.error('Error fetching from NewsAPI', { 
        error: error instanceof Error ? error.message : error 
      });
      return [];
    }
  }

  /**
   * Fetch news from Guardian API
   */
  private async fetchFromGuardian(): Promise<CreateArticleData[]> {
    await this.rateLimitDelay('guardian');
    
    try {
      const response: AxiosResponse = await axios.get('https://content.guardianapis.com/search', {
        params: {
          'api-key': this.guardianApiKey,
          'show-fields': 'bodyText,trailText',
          'page-size': 50,
          'order-by': 'newest'
        },
        timeout: 10000
      });
      
      if (response.data.response.status !== 'ok') {
        throw new Error(`Guardian API error: ${response.data.response.message}`);
      }
      
      return response.data.response.results
        .filter((article: GuardianArticle) => 
          article.webTitle && 
          article.webUrl
        )
        .map((article: GuardianArticle) => ({
          title: article.webTitle,
          content: article.fields?.bodyText || article.fields?.trailText || '',
          summary: article.fields?.trailText || article.webTitle,
          url: article.webUrl,
          source: 'The Guardian',
          published_at: new Date(article.webPublicationDate)
        }));
        
    } catch (error) {
      logger.error('Error fetching from Guardian', { 
        error: error instanceof Error ? error.message : error 
      });
      return [];
    }
  }

  /**
   * Fetch news from Reuters (using NewsAPI as proxy)
   */
  private async fetchFromReuters(): Promise<CreateArticleData[]> {
    if (!this.newsApiKey) {
      return [];
    }
    
    await this.rateLimitDelay('newsapi');
    
    try {
      const response: AxiosResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          apiKey: this.newsApiKey,
          sources: 'reuters',
          language: 'en',
          pageSize: 30,
          sortBy: 'publishedAt'
        },
        timeout: 10000
      });
      
      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI (Reuters) error: ${response.data.message}`);
      }
      
      return response.data.articles
        .filter((article: NewsAPIArticle) => 
          article.title && 
          article.url &&
          article.title !== '[Removed]'
        )
        .map((article: NewsAPIArticle) => ({
          title: article.title,
          content: article.content || article.description || '',
          summary: article.description || article.title,
          url: article.url,
          source: 'Reuters',
          published_at: new Date(article.publishedAt)
        }));
        
    } catch (error) {
      logger.error('Error fetching from Reuters', { 
        error: error instanceof Error ? error.message : error 
      });
      return [];
    }
  }

  /**
   * Process location data for articles
   */
  private async processLocationData(articles: CreateArticleData[]): Promise<CreateArticleData[]> {
    logger.info(`Processing location data for ${articles.length} articles`);
    
    const processedArticles: CreateArticleData[] = [];
    
    for (const article of articles) {
      try {
        const locationData = await this.extractLocationFromArticle(article);
        processedArticles.push({
          ...article,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          location_name: locationData.locationName
        });
        
        // Small delay to avoid overwhelming the geocoding service
        if (locationData.locationName) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        logger.warn('Error processing location for article', { 
          title: article.title,
          error: error instanceof Error ? error.message : error 
        });
        
        // Add article without location data
        processedArticles.push({
          ...article,
          latitude: null,
          longitude: null,
          location_name: null
        });
      }
    }
    
    const articlesWithLocation = processedArticles.filter(a => a.latitude && a.longitude);
    logger.info(`Successfully geocoded ${articlesWithLocation.length} out of ${articles.length} articles`);
    
    return processedArticles;
  }

  /**
   * Extract location information from article content
   */
  private async extractLocationFromArticle(article: CreateArticleData): Promise<LocationData> {
    // Extract potential location names from title and content
    const locationNames = this.extractLocationNames(article.title + ' ' + article.content);
    
    if (locationNames.length === 0) {
      return { latitude: null, longitude: null, locationName: null };
    }
    
    // Try to geocode the most likely location
    for (const locationName of locationNames) {
      const coordinates = await this.geocodeLocation(locationName);
      if (coordinates.latitude && coordinates.longitude) {
        return {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          locationName: locationName
        };
      }
    }
    
    return { latitude: null, longitude: null, locationName: locationNames[0] || null };
  }

  /**
   * Extract potential location names from text using simple patterns
   */
  private extractLocationNames(text: string): string[] {
    const locations: string[] = [];
    
    // Common location patterns
    const patterns = [
      // Countries and major cities
      /\b(United States|USA|America|China|Russia|India|Japan|Germany|France|Italy|Spain|Brazil|Canada|Australia|Mexico|South Korea|Indonesia|Turkey|Saudi Arabia|Argentina|South Africa|Egypt|Thailand|Israel|Nigeria|Kenya|Morocco|Ghana|Ethiopia|Tanzania|Uganda|Rwanda|Botswana|Namibia|Zambia|Zimbabwe|Malawi|Mozambique|Madagascar|Mauritius|Seychelles|Comoros|Mayotte|Reunion)\b/gi,
      /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Long Beach|Mesa|Atlanta|Colorado Springs|Virginia Beach|Raleigh|Omaha|Miami|Oakland|Minneapolis|Tulsa|Wichita|New Orleans|Arlington|Cleveland|Tampa|Bakersfield|Aurora|Honolulu|Anaheim|Santa Ana|Corpus Christi|Riverside|Lexington|Stockton|Toledo|St. Paul|Newark|Greensboro|Plano|Henderson|Lincoln|Buffalo|Jersey City|Chula Vista|Fort Wayne|Orlando|St. Petersburg|Chandler|Laredo|Norfolk|Durham|Madison|Lubbock|Irvine|Winston-Salem|Glendale|Garland|Hialeah|Reno|Chesapeake|Gilbert|Baton Rouge|Irving|Scottsdale|North Las Vegas|Fremont|Boise|Richmond|San Bernardino|Birmingham|Spokane|Rochester|Des Moines|Modesto|Fayetteville|Tacoma|Oxnard|Fontana|Columbus|Montgomery|Moreno Valley|Shreveport|Aurora|Yonkers|Akron|Huntington Beach|Little Rock|Augusta|Amarillo|Glendale|Mobile|Grand Rapids|Salt Lake City|Tallahassee|Huntsville|Grand Prairie|Knoxville|Worcester|Newport News|Brownsville|Overland Park|Santa Clarita|Providence|Garden Grove|Chattanooga|Oceanside|Jackson|Fort Lauderdale|Santa Rosa|Rancho Cucamonga|Port St. Lucie|Tempe|Ontario|Vancouver|Sioux Falls|Peoria|Pembroke Pines|Salem|Cape Coral|Springfield|Peoria|Springfield|Lancaster|Salinas|Elk Grove|Corona|Palmdale|Eugene|Hayward|Pomona|Escondido|Sunnyvale|Kansas City|Hollywood|Rockford|Torrance|Joliet|Naperville|Bridgeport|Waterbury|Stamford|Norwalk|Danbury|New Britain|West Hartford|Bristol|Meriden|Milford|Stratford|East Hartford|Manchester|West Haven|Middletown|Enfield|Norwalk|Hamden|Watertown|Naugatuck|New London|Groton|Norwich|Willimantic|Torrington|Winsted|Putnam|Danielson|Jewett City|Moosup|Baltic|Taftville|Gales Ferry|Mystic|Stonington|Westerly|Watch Hill|Misquamicut|Charlestown|Narragansett|Wakefield|Peace Dale|Kingston|West Kingston|Exeter|Richmond|Hope Valley|Wyoming|Rockville|Coventry|West Warwick|East Greenwich|North Kingstown|Warwick|Cranston|Providence|Pawtucket|Central Falls|Woonsocket|Cumberland|Lincoln|Smithfield|North Smithfield|Burrillville|Glocester|Foster|Scituate|Johnston|North Providence|East Providence|Barrington|Warren|Bristol|Tiverton|Little Compton|Middletown|Portsmouth|Jamestown|South Kingstown|Narragansett|New Shoreham)\b/gi,
      /\b(London|Paris|Berlin|Madrid|Rome|Amsterdam|Vienna|Brussels|Prague|Budapest|Warsaw|Stockholm|Copenhagen|Oslo|Helsinki|Dublin|Lisbon|Athens|Zurich|Geneva|Barcelona|Milan|Naples|Florence|Venice|Munich|Hamburg|Frankfurt|Cologne|Stuttgart|Dusseldorf|Leipzig|Dresden|Nuremberg|Hanover|Bremen|Dortmund|Essen|Duisburg|Bochum|Wuppertal|Bielefeld|Bonn|Munster|Karlsruhe|Mannheim|Augsburg|Wiesbaden|Gelsenkirchen|Monchengladbach|Braunschweig|Chemnitz|Kiel|Aachen|Halle|Magdeburg|Freiburg|Krefeld|Lubeck|Oberhausen|Erfurt|Mainz|Rostock|Kassel|Hagen|Potsdam|Saarbrucken|Hamm|Mulheim|Ludwigshafen|Oldenburg|Leverkusen|Osnabrück|Solingen|Heidelberg|Herne|Neuss|Darmstadt|Paderborn|Regensburg|Ingolstadt|Wurzburg|Fürth|Wolfsburg|Offenbach|Ulm|Heilbronn|Pforzheim|Göttingen|Bottrop|Trier|Recklinghausen|Reutlingen|Bremerhaven|Koblenz|Bergisch Gladbach|Jena|Remscheid|Erlangen|Moers|Siegen|Hildesheim|Salzgitter)\b/gi,
      /\b(Tokyo|Osaka|Kyoto|Yokohama|Kobe|Nagoya|Sapporo|Fukuoka|Kawasaki|Hiroshima|Sendai|Kitakyushu|Chiba|Sakai|Niigata|Hamamatsu|Okayama|Kumamoto|Shizuoka|Kagoshima|Hachioji|Funabashi|Kawaguchi|Himeji|Suita|Matsuyama|Higashiosaka|Nishinomiya|Kurashiki|Ichikawa|Fukuyama|Amagasaki|Kanazawa|Nagasaki|Koshigaya|Kasukabe|Yokosuka|Machida|Gifu|Fujisawa|Kashiwa|Toyonaka|Toyota|Takamatsu|Chofu|Shimonoseki|Ichihara|Oita|Nara|Toyohashi|Nagano|Iwaki|Asahikawa|Takatsuki|Koriyama|Tokorozawa|Kawagoe|Akita|Otsu|Kochi|Miyazaki|Naha|Kasugai|Mito|Tsu|Numazu|Isesaki|Ota|Yamagata|Sasebo|Hirakata|Fujimi|Kashihara|Itami|Anjo|Atsugi|Yamato|Ageo|Kumagaya|Matsudo|Komaki|Hiratsuka|Aomori|Akashi|Kurume|Hofu|Kishiwada|Matsubara|Saga|Maebashi|Joso|Neyagawa|Tomakomai|Ebina|Fuchu|Urayasu|Tachikawa|Narashino|Kokubunji|Zama|Marugame|Fujieda|Koganei|Kodaira|Higashimurayama|Kunitachi|Musashino|Mitaka|Chofu|Komae|Higashikurume|Nishitokyo|Kiyose|Higashiyamato|Musashimurayama|Tama|Inagi|Hamura|Akiruno|Hinode|Mizuho|Okutama|Hinohara)\b/gi,
      // Add more patterns for other regions as needed
    ];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(...matches.map(match => match.trim()));
      }
    }
    
    // Remove duplicates and return top 3 most likely locations
    const uniqueLocations = [...new Set(locations)];
    return uniqueLocations.slice(0, 3);
  }

  /**
   * Geocode a location name to coordinates
   */
  private async geocodeLocation(locationName: string): Promise<{ latitude: number | null; longitude: number | null }> {
    if (!this.geocodingApiKey) {
      return { latitude: null, longitude: null };
    }
    
    await this.rateLimitDelay('geocoding');
    
    try {
      const response: AxiosResponse = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
        params: {
          key: this.geocodingApiKey,
          q: locationName,
          limit: 1,
          no_annotations: 1
        },
        timeout: 5000
      });
      
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          latitude: result.geometry.lat,
          longitude: result.geometry.lng
        };
      }
      
      return { latitude: null, longitude: null };
      
    } catch (error) {
      logger.warn('Error geocoding location', { 
        location: locationName,
        error: error instanceof Error ? error.message : error 
      });
      return { latitude: null, longitude: null };
    }
  }

  /**
   * Rate limiting helper
   */
  private async rateLimitDelay(service: 'newsapi' | 'guardian' | 'geocoding'): Promise<void> {
    const now = Date.now();
    let lastCall: number;
    let delay: number;
    
    switch (service) {
      case 'newsapi':
        lastCall = this.lastNewsAPICall;
        delay = this.NEWS_API_DELAY;
        this.lastNewsAPICall = now;
        break;
      case 'guardian':
        lastCall = this.lastGuardianCall;
        delay = this.GUARDIAN_API_DELAY;
        this.lastGuardianCall = now;
        break;
      case 'geocoding':
        lastCall = this.lastGeocodingCall;
        delay = this.GEOCODING_DELAY;
        this.lastGeocodingCall = now;
        break;
    }
    
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < delay) {
      const waitTime = delay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Save aggregated articles to database
   */
  async saveArticlesToDatabase(articles: CreateArticleData[]): Promise<number[]> {
    if (articles.length === 0) {
      logger.info('No articles to save');
      return [];
    }
    
    logger.info(`Saving ${articles.length} articles to database`);
    
    try {
      // Filter out articles that already exist (by URL)
      const newArticles: CreateArticleData[] = [];
      
      for (const article of articles) {
        const existing = await ArticleModel.findByUrl(article.url);
        if (!existing) {
          newArticles.push(article);
        }
      }
      
      if (newArticles.length === 0) {
        logger.info('All articles already exist in database');
        return [];
      }
      
      // Save new articles in batches and collect IDs
      const batchSize = 10;
      let savedCount = 0;
      const savedArticleIds: number[] = [];
      
      for (let i = 0; i < newArticles.length; i += batchSize) {
        const batch = newArticles.slice(i, i + batchSize);
        try {
          const savedArticles = await ArticleModel.createBatch(batch);
          savedCount += batch.length;
          savedArticleIds.push(...savedArticles.map(article => article.id));
          
          // Broadcast new articles via Socket.io
          for (const article of savedArticles) {
            try {
              broadcastNewsUpdate(article, 'new');
            } catch (broadcastError) {
              logger.warn('Failed to broadcast news update', {
                articleId: article.id,
                error: broadcastError instanceof Error ? broadcastError.message : broadcastError
              });
            }
          }
          
          logger.info(`Saved batch ${Math.floor(i / batchSize) + 1}, total saved: ${savedCount}`);
        } catch (error) {
          logger.error('Error saving article batch', { 
            batchStart: i,
            batchSize: batch.length,
            error: error instanceof Error ? error.message : error 
          });
        }
      }
      
      logger.info(`Successfully saved ${savedCount} new articles out of ${articles.length} total`);
      return savedArticleIds;
      
    } catch (error) {
      logger.error('Error saving articles to database', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * Full news aggregation and save process
   */
  async aggregateAndSaveNews(): Promise<{ total: number; saved: number; errors: number; biasAnalyzed: number }> {
    logger.info('Starting full news aggregation process');
    
    try {
      const articles = await this.fetchAllNews();
      const initialCount = articles.length;
      
      const savedArticleIds = await this.saveArticlesToDatabase(articles);
      
      // Trigger bias analysis for newly saved articles
      let biasAnalyzedCount = 0;
      if (savedArticleIds.length > 0) {
        logger.info(`Starting bias analysis for ${savedArticleIds.length} new articles`);
        try {
          const biasResults = await BiasAnalysisService.batchAnalyzeArticles(savedArticleIds);
          biasAnalyzedCount = biasResults.size;
          logger.info(`Completed bias analysis for ${biasAnalyzedCount} articles`);
        } catch (error) {
          logger.error('Error in bias analysis during news aggregation', { 
            error: error instanceof Error ? error.message : error 
          });
        }
      }
      
      // Get count of articles that were actually saved
      const stats = await ArticleModel.getStatistics();
      
      logger.info('News aggregation completed successfully', {
        totalFetched: initialCount,
        totalSaved: savedArticleIds.length,
        biasAnalyzed: biasAnalyzedCount,
        totalInDatabase: stats.totalArticles
      });
      
      return {
        total: initialCount,
        saved: savedArticleIds.length,
        errors: 0,
        biasAnalyzed: biasAnalyzedCount
      };
      
    } catch (error) {
      logger.error('Error in news aggregation process', { 
        error: error instanceof Error ? error.message : error 
      });
      
      return {
        total: 0,
        saved: 0,
        errors: 1,
        biasAnalyzed: 0
      };
    }
  }
}