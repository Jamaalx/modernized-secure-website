// frontend/src/components/admin/UserManagement.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldCheck,
  User,
  Mail,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner, { TableSkeleton } from '../common/LoadingSpinner';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const queryClient = useQueryClient();

  // Fetch users
  const { 
    data: usersData, 
    isLoading, 
    error 
  } = useQuery(
    ['adminUsers', { 
      page: currentPage, 
      search: searchTerm, 
      role: roleFilter,
      status: statusFilter 
    }],
    () => adminAPI.getUsers({
      page: currentPage,
      search: searchTerm,
      role: roleFilter,
      limit: 20
    }),
    {
      keepPreviousData: true,
      refetchInterval: 30000
    }
  );

  // Fetch pending invitations
  const { data: invitationsData } = useQuery(
    'adminInvitations',
    adminAPI.getInvitations,
    { refetchInterval: 30000 }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, userData }) => adminAPI.updateUser(id, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
        toast.success('User updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => adminAPI.deleteUser(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers');
        toast.success('User deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  // Approve invitation mutation
  const approveInvitationMutation = useMutation(
    (invitationId) => adminAPI.approveInvitation(invitationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminInvitations');
        toast.success('Invitation approved');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve invitation');
      }
    }
  );

  // Reject invitation mutation
  const rejectInvitationMutation = useMutation(
    (invitationId) => adminAPI.rejectInvitation(invitationId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminInvitations');
        toast.success('Invitation rejected');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject invitation');
      }
    }
  );

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination || {};
  const invitations = invitationsData?.data?.invitations || [];
  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');

  // Handle user actions
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleToggleUserStatus = (user) => {
    updateUserMutation.mutate({
      id: user.id,
      userData: { is_active: !user.is_active }
    });
  };

  const handleApproveInvitation = (invitationId) => {
    approveInvitationMutation.mutate(invitationId);
  };

  const handleRejectInvitation = (invitationId) => {
    rejectInvitationMutation.mutate(invitationId);
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'badge-danger';
      case 'MODERATOR': return 'badge-warning';
      case 'USER': return 'badge-info';
      default: return 'badge-gray';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to Load Users
        </h3>
        <p className="text-gray-600">
          There was an error loading the user data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setCreateUserModalOpen(true)}
          className="btn-primary flex items-center mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Invitations
            </h2>
            <span className="badge-warning">
              {pendingInvitations.length} pending
            </span>
          </div>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Invited by {invitation.invited_by_email} • {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleApproveInvitation(invitation.id)}
                    className="btn-sm btn-success flex items-center"
                    disabled={approveInvitationMutation.isLoading}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectInvitation(invitation.id)}
                    className="btn-sm btn-danger flex items-center"
                    disabled={rejectInvitationMutation.isLoading}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MODERATOR">Moderator</option>
          <option value="USER">User</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </div>
                        {user.invited_by_email && (
                          <div className="text-xs text-gray-400">
                            Invited by {user.invited_by_email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        user.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`text-sm ${
                        user.is_active ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login_at ? (
                      <div>
                        <div>{formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })}</div>
                        {user.last_login_ip && (
                          <div className="text-xs text-gray-400">
                            from {user.last_login_ip}
                          </div>
                        )}
                      </div>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{user.accessible_documents || 0} accessible</div>
                      <div className="text-xs text-gray-400">
                        {user.total_accesses || 0} total views
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-700"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`${
                          user.is_active 
                            ? 'text-red-600 hover:text-red-700' 
                            : 'text-green-600 hover:text-green-700'
                        }`}
                        title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-sm btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                disabled={currentPage === pagination.pages}
                className="btn-sm btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {createUserModalOpen && (
        <CreateUserModal 
          onClose={() => setCreateUserModalOpen(false)}
          onSuccess={() => {
            setCreateUserModalOpen(false);
            queryClient.invalidateQueries('adminUsers');
          }}
        />
      )}

      {editUserModalOpen && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setEditUserModalOpen(false);
            setSelectedUser(null);
            queryClient.invalidateQueries('adminUsers');
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;