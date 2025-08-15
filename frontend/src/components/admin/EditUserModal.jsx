// frontend/src/components/admin/EditUserModal.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { X, Mail, Shield, User, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../utils/api';
import { InlineSpinner } from '../common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const EditUserModal = ({ user, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm({
    defaultValues: {
      role: user.role,
      is_active: user.is_active
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation(
    (userData) => adminAPI.updateUser(user.id, userData),
    {
      onSuccess: () => {
        toast.success('User updated successfully');
        onSuccess?.();
      },
      onError: (error) => {
        const message = error.response?.data?.message || 'Failed to update user';
        toast.error(message);
        setError('root', { type: 'manual', message });
      }
    }
  );

  const onSubmit = async (data) => {
    updateUserMutation.mutate(data);
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
                <Edit3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit User
                </h2>
                <p className="text-sm text-gray-600">
                  Update user role and status
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

          {/* User Info */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-500">
                  Created {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Role Field */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  {...register('role', {
                    required: 'Role is required',
                  })}
                  className={`input pl-10 ${errors.role ? 'input-error' : ''}`}
                >
                  <option value="USER">User</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Status Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    {...register('is_active')}
                    type="radio"
                    value={true}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Active
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('is_active')}
                    type="radio"
                    value={false}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Inactive
                  </span>
                </label>
              </div>
            </div>

            {/* Role Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Role Permissions:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li><strong>User:</strong> View assigned documents only</li>
                <li><strong>Moderator:</strong> User permissions + invite users (requires admin approval)</li>
                <li><strong>Admin:</strong> Full system access + user management + document upload</li>
              </ul>
            </div>

            {/* Current Stats */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Current Statistics:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Documents:</span>
                  <div>{user.accessible_documents || 0} accessible</div>
                </div>
                <div>
                  <span className="font-medium">Activity:</span>
                  <div>{user.total_accesses || 0} total views</div>
                </div>
                <div>
                  <span className="font-medium">Last Login:</span>
                  <div>
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>
                <div>
                  <span className="font-medium">Login Attempts:</span>
                  <div>{user.failed_login_attempts || 0} failed</div>
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
                disabled={updateUserMutation.isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={updateUserMutation.isLoading}
              >
                {updateUserMutation.isLoading ? (
                  <>
                    <InlineSpinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Update User
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

export default EditUserModal;