import React from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserProfilePage } from '../components/settings/UserProfilePage';
import { Layout } from '../components/layout';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/map');
  };

  return (
    <Layout>
      <Box sx={{ position: 'absolute', top: 80, left: 16, zIndex: 1000 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          variant="outlined"
          size="small"
        >
          Back to Map
        </Button>
      </Box>
      <UserProfilePage />
    </Layout>
  );
};

export default ProfilePage;