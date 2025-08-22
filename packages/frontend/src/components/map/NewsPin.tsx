import React, { useState } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import { Box, Typography, Chip, Button } from '@mui/material';
import { MapPin } from '../../types/map';
import { BiasIndicator } from './BiasIndicator';
import { ArticlePreview } from './ArticlePreview';
import { createNewsIcon, isValidCoordinate } from '../../utils/leafletIcons';

interface NewsPinProps {
  pin: MapPin;
  onClick: (pin: MapPin) => void;
}

export const NewsPin: React.FC<NewsPinProps> = ({ pin, onClick }) => {
  const [isSelected, setIsSelected] = useState(false);
  
  // Validate coordinates before rendering
  if (!isValidCoordinate(pin.latitude, pin.longitude)) {
    console.warn(`Invalid coordinates for pin ${pin.id}: ${pin.latitude}, ${pin.longitude}`);
    return null;
  }

  const customIcon = createNewsIcon(pin.article.biasScore, isSelected);

  const handleMarkerClick = () => {
    setIsSelected(true);
    onClick(pin);
    // Reset selection after a short delay
    setTimeout(() => setIsSelected(false), 2000);
  };

  return (
    <Marker
      position={[pin.latitude, pin.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
        <Box sx={{ maxWidth: 200 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            {pin.article.title.length > 50 
              ? `${pin.article.title.substring(0, 50)}...` 
              : pin.article.title
            }
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pin.article.source}
          </Typography>
        </Box>
      </Tooltip>
      
      <Popup maxWidth={320} closeButton={true}>
        <Box sx={{ p: 0.5 }}>
          <ArticlePreview
            pin={pin}
            onReadMore={onClick}
            onOpenOriginal={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
            compact={true}
            showActions={true}
          />
        </Box>
      </Popup>
    </Marker>
  );
};