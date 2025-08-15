// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../utils/api';

// Auth context
const AuthContext = createContext();

// Auth states
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  SET_USER: 'SET_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token && refreshToken) {
        try {
          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token by getting user info
          const response = await api.get('/auth/me');
          
          dispatch({
            type: AUTH_ACTIONS.SET_USER,
            payload: response.data.data.user,
          });
        } catch (error) {
          console.error('Token verification failed:', error);
          
          // Try to refresh token
          if (refreshToken) {
            try {
              await refreshAuthToken();
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              logout();
            }
          } else {
            logout();
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token, refreshToken } = response.data.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Set token in API client
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token, refreshToken },
      });

      toast.success(`Welcome back, ${user.email}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message,
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (email, password, confirmPassword, invitationToken) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        confirmPassword,
        invitationToken,
      });

      const { user, token, refreshToken } = response.data.data;

      // Store tokens
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Set token in API client
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token, refreshToken },
      });

      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: message,
      });

      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate tokens
      await api.post('/auth/logout', {
        refreshToken: state.refreshToken,
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    // Remove token from API client
    delete api.defaults.headers.common['Authorization'];

    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Refresh token function
  const refreshAuthToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { refreshToken });
      const { token } = response.data.data;

      // Store new token
      localStorage.setItem('token', token);

      // Set token in API client
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: AUTH_ACTIONS.REFRESH_TOKEN,
        payload: token,
      });

      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      const updatedUser = response.data.data.user;

      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: updatedUser,
      });

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      await api.post('/users/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      toast.success('Password changed successfully. Please log in again.');
      
      // Force logout after password change
      logout();
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(state.user?.role);
  };

  // Check if user is admin
  const isAdmin = () => hasRole('ADMIN');

  // Check if user is moderator or admin
  const isModerator = () => hasAnyRole(['MODERATOR', 'ADMIN']);

  // Get user role display name
  const getRoleDisplayName = () => {
    switch (state.user?.role) {
      case 'ADMIN':
        return 'Administrator';
      case 'MODERATOR':
        return 'Moderator';
      case 'USER':
        return 'User';
      default:
        return 'Unknown';
    }
  };

  // Get role color class
  const getRoleColor = () => {
    switch (state.user?.role) {
      case 'ADMIN':
        return 'role-admin';
      case 'MODERATOR':
        return 'role-moderator';
      case 'USER':
        return 'role-user';
      default:
        return 'text-gray-600';
    }
  };

  const value = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    refreshAuthToken,
    updateProfile,
    changePassword,
    clearError,
    
    // Utilities
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    getRoleDisplayName,
    getRoleColor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Higher-order component for role-based access
export const withRole = (allowedRoles) => (Component) => {
  return (props) => {
    const { hasAnyRole, isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
      return null; // Will be handled by route protection
    }
    
    if (!hasAnyRole(allowedRoles)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;