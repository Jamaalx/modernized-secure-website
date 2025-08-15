// frontend/src/App.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy load components for better performance
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Documents = React.lazy(() => import('./pages/Documents'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Users = React.lazy(() => import('./pages/Users'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Layout wrapper component
const AuthLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
      {children}
    </div>
  </div>
);

const MainLayout = ({ children }) => (
  <div className="min-h-screen bg-gray-50">
    {children}
  </div>
);

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Main App component
function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="App">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/auth/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthLayout>
                  <Login />
                </AuthLayout>
              )
            }
          />
          
          <Route
            path="/auth/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AuthLayout>
                  <Register />
                </AuthLayout>
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Documents />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin-only routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <MainLayout>
                  <AdminPanel />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']}>
                <MainLayout>
                  <Users />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route
            path="/"
            element={
              <Navigate 
                to={isAuthenticated ? "/dashboard" : "/auth/login"} 
                replace 
              />
            }
          />

          {/* 404 page */}
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;