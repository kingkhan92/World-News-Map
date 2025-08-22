import React from 'react';
import { Box } from '@mui/material';
import { Layout } from '../components/layout';
import { MapContainer } from '../components/map';

const MapPage: React.FC = () => {
  const handleMapError = (error: Error) => {
    console.error('Map error:', error);
    // TODO: Add proper error handling/reporting
  };

  return (
    <Layout>
      <Box sx={{ height: 'calc(100vh - 64px)', width: '100%' }}>
        <MapContainer
          autoRefresh={true}
          refreshInterval={5 * 60 * 1000} // 5 minutes
          onError={handleMapError}
        />
      </Box>
    </Layout>
  );
};

export default MapPage;