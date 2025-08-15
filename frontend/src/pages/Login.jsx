// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InlineSpinner } from '../components/common/LoadingSpinner';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access
  const from = location.state?.from || '/dashboard';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError('root', { 
        type: 'manual', 
        message: result.error 
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo and Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-primary-600 p-3 rounded-xl">
            <FileText className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          Secure Documents
        </h1>
        <p className="text-gray-600 mt-2">
          Sign in to access your documents
        </p>
      </div>

      {/* Login Form */}
      <div className="card p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                autoComplete="email"
                className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('password', {
                  required: 'Password is required',
                })}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Form Error */}
          {errors.root && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <InlineSpinner className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>

      {/* Register Link */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Need an account?{' '}
          <Link
            to="/auth/register"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Contact your administrator
          </Link>
        </p>
      </div>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Lock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Security Notice
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              This is a secure document platform. All activities are logged and monitored 
              for security purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;