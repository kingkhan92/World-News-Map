import React, { useMemo } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapPin } from '../../types/map';
import { NewsPin } from './NewsPin';
import { createClusterIcon, isValidCoordinate } from '../../utils/leafletIcons';

interface PinClusterProps {
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
}

export const PinCluster: React.FC<PinClusterProps> = ({ pins, onPinClick }) => {

  // Filter out pins with invalid coordinates and enhance with keys
  const validPins = useMemo(() => {
    return pins
      .filter(pin => isValidCoordinate(pin.latitude, pin.longitude))
      .map(pin => ({
        ...pin,
        key: `pin-${pin.id}`,
      }));
  }, [pins]);

  return (
    <MarkerClusterGroup
      chunkedLoading
      iconCreateFunction={createClusterIcon}
      maxClusterRadius={50}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      spiderfyDistanceMultiplier={1.5}
      removeOutsideVisibleBounds={true}
      animate={true}
      animateAddingMarkers={true}
      disableClusteringAtZoom={15} // Disable clustering at high zoom levels
    >
      {validPins.map((pin) => (
        <NewsPin
          key={pin.key}
          pin={pin}
          onClick={onPinClick}
        />
      ))}
    </MarkerClusterGroup>
  );
};