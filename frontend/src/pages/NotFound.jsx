// frontend/src/pages/NotFound.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="relative">
            <div className="text-9xl font-bold text-gray-200 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white p-4 rounded-full shadow-soft">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="btn-primary w-full flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Link>
              
              <Link
                to="/documents"
                className="btn-secondary w-full flex items-center justify-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Documents
              </Link>
            </>
          ) : (
            <Link
              to="/auth/login"
              className="btn-primary w-full flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Login
            </Link>
          )}

          <button
            onClick={handleGoBack}
            className="btn-ghost w-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Need help?</strong> If you believe this is an error, please contact 
            your system administrator or try refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;