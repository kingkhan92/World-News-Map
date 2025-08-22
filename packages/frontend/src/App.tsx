import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { AppRouter } from './router';
import { AuthProvider } from './contexts';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { queryClient } from './services/queryClient';
import { ErrorBoundary, ToastProvider, OfflineIndicator, ConnectionStatus } from './components/common';
import { errorService } from './services/errorService';

function App() {
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    errorService.reportError(error, {
      component: 'App',
      action: 'Global Error Boundary'
    });
  };

  return (
    <ErrorBoundary level="critical" onError={handleGlobalError}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserPreferencesProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <ToastProvider>
                <Box sx={{ position: 'relative', minHeight: '100vh' }}>
                  {/* Global status indicators */}
                  <Box
                    sx={{
                      position: 'fixed',
                      top: 16,
                      right: 16,
                      zIndex: 1300,
                      display: 'flex',
                      gap: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}
                  >
                    <OfflineIndicator showDetails variant="chip" />
                    <ConnectionStatus showDetails variant="chip" />
                  </Box>
                  
                  <AppRouter />
                </Box>
              </ToastProvider>
            </ThemeProvider>
          </UserPreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;