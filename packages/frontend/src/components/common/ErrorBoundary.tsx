import { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
  Chip
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    errorId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error with context
    const errorContext = {
      errorId: this.state.errorId,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    };

    console.error('ErrorBoundary caught an error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      context: errorContext
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo, errorContext);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, context: any) => {
    try {
      // This would integrate with your error tracking service
      // For now, we'll store in localStorage for debugging
      const errorReport = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo,
        context,
        timestamp: new Date().toISOString()
      };

      const existingReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingReports.push(errorReport);
      
      // Keep only last 10 error reports
      if (existingReports.length > 10) {
        existingReports.splice(0, existingReports.length - 10);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(existingReports));
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        errorId: ''
      });
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorSeverity = (): 'error' | 'warning' => {
    const { level } = this.props;
    return level === 'critical' ? 'error' : 'warning';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    
    return (
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2">
            Error Details (ID: {errorId})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Error Message:
              </Typography>
              <Typography 
                variant="body2" 
                component="pre" 
                sx={{ 
                  bgcolor: 'grey.100', 
                  p: 1, 
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflow: 'auto'
                }}
              >
                {error?.message}
              </Typography>
            </Box>
            
            {process.env.NODE_ENV === 'development' && error?.stack && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Stack Trace:
                </Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    p: 1, 
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 200
                  }}
                >
                  {error.stack}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Context:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Retry: ${this.retryCount}/${this.maxRetries}`} size="small" />
                <Chip label={`Level: ${this.props.level || 'component'}`} size="small" />
                <Chip label={`Time: ${new Date().toLocaleTimeString()}`} size="small" />
              </Stack>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const canRetry = this.retryCount < this.maxRetries;
      const severity = this.getErrorSeverity();

      // For component-level errors, show a smaller error UI
      if (level === 'component') {
        return (
          <Paper 
            sx={{ 
              p: 3, 
              m: 2, 
              textAlign: 'center',
              border: 1,
              borderColor: severity === 'error' ? 'error.main' : 'warning.main'
            }}
          >
            <Alert severity={severity} sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Component Error
              </Typography>
              <Typography variant="body2">
                This component encountered an error and couldn't render properly.
              </Typography>
            </Alert>
            
            <Stack direction="row" spacing={1} justifyContent="center">
              {canRetry && (
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  Retry ({this.maxRetries - this.retryCount} left)
                </Button>
              )}
              <Button 
                variant="outlined" 
                size="small"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
            </Stack>
            
            {process.env.NODE_ENV === 'development' && this.renderErrorDetails()}
          </Paper>
        );
      }

      // For page-level or critical errors, show full-screen error UI
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: level === 'critical' ? '100vh' : '50vh',
            p: 3,
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
            <Alert severity={severity} sx={{ mb: 3 }}>
              <Typography variant="h5" component="h1" gutterBottom>
                {level === 'critical' ? 'Application Error' : 'Page Error'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {level === 'critical' 
                  ? 'A critical error occurred that prevented the application from working properly.'
                  : 'An error occurred while loading this page.'
                }
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
              {canRetry && (
                <Button 
                  variant="contained" 
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  Try Again ({this.maxRetries - this.retryCount} left)
                </Button>
              )}
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Refresh Page
              </Button>
              {level !== 'critical' && (
                <Button 
                  variant="outlined" 
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If this problem persists, please contact support with error ID: {this.state.errorId}
            </Typography>

            {this.renderErrorDetails()}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;