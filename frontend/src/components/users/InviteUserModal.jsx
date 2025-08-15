// frontend/src/components/users/InviteUserModal.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { X, Mail, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/api';
import { InlineSpinner } from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const InviteUserModal = ({ onClose, onSuccess }) => {
  const { isAdmin } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm();

  // Send invitation mutation
  const inviteUserMutation = useMutation(
    (email) => usersAPI.sendInvitation(email),
    {
      onSuccess: () => {
        const message = isAdmin() 
          ? 'Invitation sent and approved' 
          : 'Invitation sent for admin approval';
        toast.success(message);
        onSuccess?.();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to send invitation';
        toast.error(message);
        setError('root', { type: 'manual', message });
      }
    }
  );

  const onSubmit = async (data) => {
    inviteUserMutation.mutate(data.email);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-modal w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Invite User
                </h2>
                <p className="text-sm text-gray-600">
                  Send an invitation to join the platform
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
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
                  className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  placeholder="user@company.com"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Process Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">
                    Invitation Process
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    {isAdmin() ? (
                      <>
                        <p>• Invitation will be sent immediately</p>
                        <p>• User will receive registration email</p>
                        <p>• You can assign document permissions after registration</p>
                      </>
                    ) : (
                      <>
                        <p>• Your invitation will be sent to admin for approval</p>
                        <p>• You'll be notified when it's approved</p>
                        <p>• User will then receive registration email</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Error */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={inviteUserMutation.isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={inviteUserMutation.isLoading}
              >
                {inviteUserMutation.isLoading ? (
                  <>
                    <InlineSpinner className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InviteUserModal;