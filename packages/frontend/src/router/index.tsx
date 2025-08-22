import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MapPage, LoginPage, ProfilePage } from '../pages';
import { ProtectedRoute } from '../components/auth';

// Define application routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/map" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/map',
    element: (
      <ProtectedRoute>
        <MapPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
]);

// Router provider component
export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;