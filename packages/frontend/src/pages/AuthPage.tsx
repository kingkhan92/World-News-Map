import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Paper, Fade } from '@mui/material';
import { LoginForm, RegisterForm } from '../components/auth';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/map';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Switch between login and register
  const handleSwitchToRegister = () => {
    setMode('register');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          maxWidth: 450,
          width: '100%',
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <Fade in={true} timeout={500}>
          <Box>
            {mode === 'login' ? (
              <LoginForm onSwitchToRegister={handleSwitchToRegister} />
            ) : (
              <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
            )}
          </Box>
        </Fade>
      </Paper>
    </Box>
  );
};

export default AuthPage;