// frontend/src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { ShieldX } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking authentication..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role-based access if roles are specified
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-3">
              <ShieldX className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          
          <div className="text-sm text-gray-500 mb-6">
            <p>Required roles: {allowedRoles.join(', ')}</p>
            <p>Your role: {user?.role || 'Unknown'}</p>
          </div>
          
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return children;
};

export default ProtectedRoute;