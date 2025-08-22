import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';

interface BiasIndicatorProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
}

export const BiasIndicator: React.FC<BiasIndicatorProps> = ({ 
  score, 
  size = 'medium',
  showLabel = true,
  showTooltip = true,
}) => {
  const getBiasInfo = (biasScore: number) => {
    if (biasScore <= 20) {
      return {
        label: 'Very Low Bias',
        shortLabel: 'Low',
        color: '#2e7d32',
        backgroundColor: '#e8f5e8',
        description: 'Highly factual and balanced reporting',
      };
    }
    if (biasScore <= 40) {
      return {
        label: 'Low Bias',
        shortLabel: 'Low',
        color: '#4caf50',
        backgroundColor: '#e8f5e8',
        description: 'Generally factual with minimal bias',
      };
    }
    if (biasScore <= 60) {
      return {
        label: 'Medium Bias',
        shortLabel: 'Medium',
        color: '#ff9800',
        backgroundColor: '#fff3e0',
        description: 'Some bias present, read with awareness',
      };
    }
    if (biasScore <= 80) {
      return {
        label: 'High Bias',
        shortLabel: 'High',
        color: '#f57c00',
        backgroundColor: '#fff3e0',
        description: 'Significant bias, consider multiple sources',
      };
    }
    return {
      label: 'Very High Bias',
      shortLabel: 'Very High',
      color: '#d32f2f',
      backgroundColor: '#ffebee',
      description: 'Heavily biased, verify with other sources',
    };
  };

  const biasInfo = getBiasInfo(score);
  
  const sizeMap = {
    small: { width: 60, height: 8, fontSize: '0.75rem' },
    medium: { width: 80, height: 10, fontSize: '0.875rem' },
    large: { width: 120, height: 12, fontSize: '1rem' },
  };

  const dimensions = sizeMap[size];

  const BiasIndicatorContent = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Bias score bar */}
      <Box
        sx={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: '#e0e0e0',
          borderRadius: 1,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${biasInfo.color}20`,
        }}
      >
        <Box
          sx={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: biasInfo.color,
            borderRadius: 1,
            transition: 'width 0.3s ease',
            position: 'relative',
          }}
        />
        
        {/* Score markers */}
        {size === 'large' && (
          <>
            {[20, 40, 60, 80].map((marker) => (
              <Box
                key={marker}
                sx={{
                  position: 'absolute',
                  left: `${marker}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              />
            ))}
          </>
        )}
      </Box>
      
      {showLabel && (
        <Chip
          label={size === 'small' ? `${biasInfo.shortLabel} (${score})` : `${biasInfo.label} (${score})`}
          size={size === 'large' ? 'medium' : 'small'}
          sx={{
            backgroundColor: biasInfo.backgroundColor,
            color: biasInfo.color,
            fontWeight: 'bold',
            fontSize: dimensions.fontSize,
            border: `1px solid ${biasInfo.color}40`,
          }}
        />
      )}
      
      {!showLabel && size !== 'small' && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: biasInfo.color, 
            fontWeight: 'bold',
            fontSize: dimensions.fontSize,
          }}
        >
          {score}
        </Typography>
      )}
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip 
        title={
          <Box>
            <Typography variant="body2" fontWeight="bold">
              {biasInfo.label} ({score}/100)
            </Typography>
            <Typography variant="caption">
              {biasInfo.description}
            </Typography>
          </Box>
        }
        arrow
        placement="top"
      >
        <Box>
          <BiasIndicatorContent />
        </Box>
      </Tooltip>
    );
  }

  return <BiasIndicatorContent />;
};