// Map-related types
export interface MapPin {
  id: number;
  latitude: number;
  longitude: number;
  article: {
    id: number;
    title: string;
    summary: string;
    source: string;
    biasScore: number;
    url?: string;
    locationName?: string;
    publishedAt?: Date;
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewState {
  center: [number, number]; // [lat, lng]
  zoom: number;
  bounds?: MapBounds;
}

export type MapViewType = 'map' | 'globe';

export interface FilterState {
  dateRange: {
    start: Date;
    end: Date;
  };
  sources: string[];
  biasRange: [number, number];
  keywords: string;
  region?: MapBounds;
}