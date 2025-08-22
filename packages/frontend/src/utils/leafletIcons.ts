import L from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Vite
// This is a common issue where the default marker icons don't load properly
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

// Custom icon factory for news pins
export const createNewsIcon = (biasScore: number, isSelected = false): L.DivIcon => {
  const getBiasColor = (score: number): string => {
    if (score <= 30) return '#4caf50'; // Green for low bias
    if (score <= 60) return '#ff9800'; // Orange for medium bias
    return '#f44336'; // Red for high bias
  };

  const color = getBiasColor(biasScore);
  const size = isSelected ? 32 : 24;
  const iconSize = isSelected ? 28 : 20;
  
  return new L.DivIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        border: ${isSelected ? '3px' : '2px'} solid white;
        box-shadow: 0 ${isSelected ? '4px 8px' : '2px 4px'} rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${iconSize - 8}px;
        font-weight: bold;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
      ">
        📰
      </div>
    `,
    className: `custom-news-pin ${isSelected ? 'selected' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// Custom cluster icon factory
export const createClusterIcon = (cluster: any): L.DivIcon => {
  const childCount = cluster.getChildCount();
  
  // Calculate average bias score from cluster markers
  const markers = cluster.getAllChildMarkers();
  const averageBias = markers.reduce((sum: number, marker: any) => {
    const biasScore = marker.options.biasScore || 50;
    return sum + biasScore;
  }, 0) / markers.length;

  const getBiasColor = (score: number): string => {
    if (score <= 30) return '#4caf50';
    if (score <= 60) return '#ff9800';
    return '#f44336';
  };

  const color = getBiasColor(averageBias);
  
  let size = 'small';
  if (childCount >= 100) size = 'large';
  else if (childCount >= 10) size = 'medium';

  const sizeMap = {
    small: { width: 40, height: 40, fontSize: '12px' },
    medium: { width: 50, height: 50, fontSize: '14px' },
    large: { width: 60, height: 60, fontSize: '16px' },
  };

  const dimensions = sizeMap[size];

  return new L.DivIcon({
    html: `
      <div style="
        width: ${dimensions.width}px;
        height: ${dimensions.height}px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: ${dimensions.fontSize};
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.2s ease-in-out;
      ">
        <div>${childCount}</div>
        <div style="font-size: 10px; margin-top: -2px;">news</div>
      </div>
    `,
    className: `custom-cluster-icon marker-cluster-${size}`,
    iconSize: [dimensions.width, dimensions.height],
    iconAnchor: [dimensions.width / 2, dimensions.height / 2],
  });
};

// Utility to get map bounds from pins
export const getBoundsFromPins = (pins: Array<{ latitude: number; longitude: number }>): L.LatLngBounds | null => {
  if (pins.length === 0) return null;
  
  const latLngs = pins.map(pin => [pin.latitude, pin.longitude] as [number, number]);
  return L.latLngBounds(latLngs);
};

// Utility to check if coordinates are valid
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
};

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  center: [20, 0] as [number, number], // Centered on equator, prime meridian
  zoom: 3,
  minZoom: 2,
  maxZoom: 18,
  maxBounds: [[-90, -180], [90, 180]] as [[number, number], [number, number]],
  maxBoundsViscosity: 1.0,
  worldCopyJump: true,
  zoomControl: true,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  dragging: true,
};