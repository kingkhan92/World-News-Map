import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Box, CircularProgress } from '@mui/material';
import { MapPin, MapViewState } from '../../types/map';
import { PinCluster } from './PinCluster';
import { DEFAULT_MAP_CONFIG, getBoundsFromPins } from '../../utils/leafletIcons';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

interface MapViewProps {
  pins: MapPin[];
  viewState: MapViewState;
  onViewStateChange: (viewState: MapViewState) => void;
  onPinClick: (pin: MapPin) => void;
  loading?: boolean;
}

// Component to handle map events and updates
const MapController: React.FC<{
  viewState: MapViewState;
  onViewStateChange: (viewState: MapViewState) => void;
}> = ({ viewState, onViewStateChange }) => {
  const map = useMap();

  useEffect(() => {
    // Set initial view
    map.setView(viewState.center, viewState.zoom);
  }, [map, viewState.center, viewState.zoom]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      onViewStateChange({
        center: [center.lat, center.lng],
        zoom,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
      });
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onViewStateChange]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  pins,
  viewState,
  onViewStateChange,
  onPinClick,
  loading = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  // Auto-fit bounds when pins change
  useEffect(() => {
    if (mapRef.current && pins.length > 0) {
      const bounds = getBoundsFromPins(pins);
      if (bounds) {
        // Add padding to the bounds
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [pins]);

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        '& .leaflet-container': {
          height: '100%',
          width: '100%',
        },
      }}
    >
      <MapContainer
        center={viewState.center || DEFAULT_MAP_CONFIG.center}
        zoom={viewState.zoom || DEFAULT_MAP_CONFIG.zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        {...DEFAULT_MAP_CONFIG}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
          minZoom={DEFAULT_MAP_CONFIG.minZoom}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
        
        <MapController
          viewState={viewState}
          onViewStateChange={onViewStateChange}
        />
        
        <PinCluster pins={pins} onPinClick={onPinClick} />
      </MapContainer>
      
      {loading && (
        <Box
          className="map-loading-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Box sx={{ textAlign: 'center' }}>
            Loading map data...
          </Box>
        </Box>
      )}
    </Box>
  );
};