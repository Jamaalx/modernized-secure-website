// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, FileText, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InlineSpinner } from '../components/common/LoadingSpinner';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get invitation token from URL
  const invitationToken = searchParams.get('token');
  const invitedEmail = searchParams.get('email');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    defaultValues: {
      email: invitedEmail || '',
    }
  });

  const password = watch('password');

  // Check if user has invitation token
  useEffect(() => {
    if (!invitationToken) {
      // Redirect to contact admin page or show message
      navigate('/auth/login');
    }
  }, [invitationToken, navigate]);

  const onSubmit = async (data) => {
    const result = await registerUser(
      data.email, 
      data.password, 
      data.confirmPassword, 
      invitationToken
    );
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError('root', { 
        type: 'manual', 
        message: result.error 
      });
    }
  };

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score < 3) return { score, text: 'Weak', color: 'text-red-600' };
    if (score < 5) return { score, text: 'Medium', color: 'text-yellow-600' };
    return { score, text: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(password);

  if (!invitationToken) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="card p-8">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Invitation Required
          </h2>
          <p className="text-gray-600 mb-6">
            Registration is by invitation only. Please contact your administrator to get access.
          </p>
          <Link to="/auth/login" className="btn-primary">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

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
          Create Account
        </h1>
        <p className="text-gray-600 mt-2">
          Complete your registration to access secure documents
        </p>
      </div>

      {/* Registration Form */}
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
                disabled={!!invitedEmail}
                className={`input pl-10 ${errors.email ? 'input-error' : ''} ${invitedEmail ? 'bg-gray-50' : ''}`}
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
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain uppercase, lowercase, and number',
                  },
                })}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                placeholder="Create a strong password"
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
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${passwordStrength.color}`}>
                    {passwordStrength.text}
                  </span>
                  <span className="text-gray-500">
                    {passwordStrength.score}/5
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score < 3 
                        ? 'bg-red-500' 
                        : passwordStrength.score < 5 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value =>
                    value === password || 'Passwords do not match',
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('acceptTerms', {
                  required: 'You must accept the terms and conditions',
                })}
                type="checkbox"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="acceptTerms" className="text-gray-600">
                I agree to the{' '}
                <a href="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
          )}

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
                Creating account...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Create Account
              </>
            )}
          </button>
        </form>
      </div>

      {/* Login Link */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign in here
          </Link>
        </p>
      </div>

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Account Security
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Your account will have access to confidential documents. All activities 
              are logged and monitored for security purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;