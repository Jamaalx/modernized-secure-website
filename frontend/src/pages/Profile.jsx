// frontend/src/pages/Profile.jsx
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Activity, 
  Eye, 
  Monitor,
  MapPin,
  Lock,
  Edit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../utils/api';
import DashboardLayout from '../components/common/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ChangePasswordModal from '../components/users/ChangePasswordModal';
import { format, formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const { user, getRoleDisplayName, getRoleColor } = useAuth();
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // Fetch user profile
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'userProfile',
    usersAPI.getProfile
  );

  // Fetch user activity
  const { data: activityData, isLoading: activityLoading } = useQuery(
    'userActivity',
    () => usersAPI.getActivity({ limit: 10 })
  );

  // Fetch user sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery(
    'userSessions',
    usersAPI.getSessions
  );

  const profile = profileData?.data?.profile;
  const activities = activityData?.data?.activities || [];
  const sessions = sessionsData?.data?.sessions || [];

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Profile Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your account settings and security
            </p>
          </div>
          <button
            onClick={() => setChangePasswordModalOpen(true)}
            className="btn-primary flex items-center mt-4 sm:mt-0"
          >
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Account Information
                </h2>
                <button className="btn-ghost btn-sm flex items-center">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile Picture & Basic Info */}
                <div className="flex items-center space-x-6">
                  <div className="bg-primary-100 p-4 rounded-full">
                    <User className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {profile?.email?.split('@')[0] || 'User'}
                    </h3>
                    <p className="text-gray-600">{profile?.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`badge ${getRoleColor()}`}>
                        {getRoleDisplayName()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{profile?.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Role</p>
                        <p className="text-sm text-gray-600">{getRoleDisplayName()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Member Since</p>
                        <p className="text-sm text-gray-600">
                          {profile?.created_at && format(new Date(profile.created_at), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Active</p>
                        <p className="text-sm text-gray-600">
                          {profile?.last_login_at 
                            ? formatDistanceToNow(new Date(profile.last_login_at), { addSuffix: true })
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Account Statistics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {profile?.accessible_documents || 0}
                  </p>
                  <p className="text-sm text-gray-600">Documents Accessible</p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {profile?.total_document_accesses || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Document Views</p>
                </div>

                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {profile?.last_document_access 
                      ? formatDistanceToNow(new Date(profile.last_document_access), { addSuffix: true })
                      : 'Never'
                    }
                  </p>
                  <p className="text-sm text-gray-600">Last Document Access</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Recent Activity
              </h2>
              
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.action_type}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          {activity.ip_address && ` from ${activity.ip_address}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Sessions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Active Sessions
              </h3>
              
              {sessionsLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-600">No active sessions</p>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="flex items-start space-x-3">
                      <Monitor className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {session.ip_address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(session.login_time), { addSuffix: true })}
                        </p>
                        {session.location_data && (
                          <div className="flex items-center mt-1">
                            <MapPin className="w-3 h-3 text-gray-400 mr-1" />
                            <p className="text-xs text-gray-500">
                              {session.location_data.city}, {session.location_data.country}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Settings */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Security
              </h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Change Password
                      </p>
                      <p className="text-xs text-gray-500">
                        Update your account password
                      </p>
                    </div>
                  </div>
                </button>

                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Two-Factor Authentication
                      </p>
                      <p className="text-xs text-gray-500">
                        Coming soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Details
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Type:</span>
                  <span className="font-medium">{getRoleDisplayName()}</span>
                </div>
                
                {profile?.invited_by_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invited by:</span>
                    <span className="font-medium">{profile.invited_by_email}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since:</span>
                  <span className="font-medium">
                    {profile?.created_at && format(new Date(profile.created_at), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {changePasswordModalOpen && (
          <ChangePasswordModal
            onClose={() => setChangePasswordModalOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;