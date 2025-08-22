import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface LogoutButtonProps {
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  showConfirmDialog?: boolean;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'button',
  size = 'medium',
  showConfirmDialog = true,
}) => {
  const { logout, user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Handle logout click
  const handleLogoutClick = () => {
    if (showConfirmDialog) {
      setConfirmOpen(true);
    } else {
      handleLogout();
    }
  };

  // Handle confirmed logout
  const handleLogout = () => {
    logout();
    setConfirmOpen(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setConfirmOpen(false);
  };

  if (variant === 'icon') {
    return (
      <>
        <Tooltip title="Sign Out">
          <IconButton
            onClick={handleLogoutClick}
            size={size}
            color="inherit"
          >
            <Logout />
          </IconButton>
        </Tooltip>

        {showConfirmDialog && (
          <Dialog
            open={confirmOpen}
            onClose={handleCancel}
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <DialogTitle id="logout-dialog-title">
              Sign Out
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="logout-dialog-description">
                Are you sure you want to sign out? You'll need to sign in again to access your personalized news map.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancel} color="primary">
                Cancel
              </Button>
              <Button onClick={handleLogout} color="primary" variant="contained">
                Sign Out
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleLogoutClick}
        variant="outlined"
        size={size}
        startIcon={<Logout />}
        color="inherit"
      >
        Sign Out
      </Button>

      {showConfirmDialog && (
        <Dialog
          open={confirmOpen}
          onClose={handleCancel}
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-description"
        >
          <DialogTitle id="logout-dialog-title">
            Sign Out
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="logout-dialog-description">
              Are you sure you want to sign out, {user?.email}? You'll need to sign in again to access your personalized news map.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleLogout} color="primary" variant="contained">
              Sign Out
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default LogoutButton;