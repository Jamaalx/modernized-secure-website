// frontend/src/pages/Users.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  UserPlus,
  Users as UsersIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../utils/api';
import DashboardLayout from '../components/common/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import InviteUserModal from '../components/users/InviteUserModal';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const Users = () => {
  const { isAdmin } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's sent invitations
  const { 
    data: invitationsData, 
    isLoading, 
    error 
  } = useQuery(
    'userInvitations',
    usersAPI.getInvitations,
    { refetchInterval: 30000 }
  );

  const invitations = invitationsData?.data?.invitations || [];

  // Get invitation status color and icon
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'PENDING':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: Clock,
          text: 'Pending Approval'
        };
      case 'APPROVED':
        return {
          color: 'text-green-600 bg-green-100',
          icon: CheckCircle,
          text: 'Approved'
        };
      case 'REJECTED':
        return {
          color: 'text-red-600 bg-red-100',
          icon: XCircle,
          text: 'Rejected'
        };
      case 'COMPLETED':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: CheckCircle,
          text: 'User Registered'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: AlertCircle,
          text: 'Unknown'
        };
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading invitations..." />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Invitations
          </h3>
          <p className="text-gray-600">
            There was an error loading your invitation data.
          </p>
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
              User Management
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin() 
                ? 'Manage all users and invitations'
                : 'Invite new users to the platform'
              }
            </p>
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-primary flex items-center mt-4 sm:mt-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </button>
        </div>

        {/* Invitation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Invitations"
            value={invitations.length}
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={invitations.filter(inv => inv.status === 'PENDING').length}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={invitations.filter(inv => inv.status === 'APPROVED').length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Completed"
            value={invitations.filter(inv => inv.status === 'COMPLETED').length}
            icon={UsersIcon}
            color="purple"
          />
        </div>

        {/* Instructions for moderators */}
        {!isAdmin() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Invitation Process
                </h3>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>1. Send invitations to new users using their email addresses</p>
                  <p>2. Admin will review and approve your invitation requests</p>
                  <p>3. Approved users will receive an email to complete registration</p>
                  <p>4. Admin will assign document permissions to new users</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invitations List */}
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Invitations
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Track the status of users you've invited
            </p>
          </div>

          {invitations.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No invitations sent yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start by inviting users to join the platform
              </p>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="btn-primary flex items-center mx-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Send First Invitation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => {
                    const statusDisplay = getStatusDisplay(invitation.status);
                    const StatusIcon = statusDisplay.icon;

                    return (
                      <tr key={invitation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-gray-100 p-2 rounded-full mr-3">
                              <Mail className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invitation.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusDisplay.text}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invitation.approved_by_email || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite User Modal */}
        {inviteModalOpen && (
          <InviteUserModal
            onClose={() => setInviteModalOpen(false)}
            onSuccess={() => {
              setInviteModalOpen(false);
              queryClient.invalidateQueries('userInvitations');
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  };

  return (
    <div className="card p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Users;