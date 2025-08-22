import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            fontSize: '14px',
            maxWidth: '400px',
          },
          // Success toasts
          success: {
            duration: 3000,
            style: {
              background: theme.palette.success.light,
              color: theme.palette.success.contrastText,
              border: `1px solid ${theme.palette.success.main}`,
            },
            iconTheme: {
              primary: theme.palette.success.main,
              secondary: theme.palette.success.contrastText,
            },
          },
          // Error toasts
          error: {
            duration: 6000,
            style: {
              background: theme.palette.error.light,
              color: theme.palette.error.contrastText,
              border: `1px solid ${theme.palette.error.main}`,
            },
            iconTheme: {
              primary: theme.palette.error.main,
              secondary: theme.palette.error.contrastText,
            },
          },
          // Loading toasts
          loading: {
            style: {
              background: theme.palette.info.light,
              color: theme.palette.info.contrastText,
              border: `1px solid ${theme.palette.info.main}`,
            },
            iconTheme: {
              primary: theme.palette.info.main,
              secondary: theme.palette.info.contrastText,
            },
          },
        }}
      />
    </>
  );
};

export default ToastProvider;