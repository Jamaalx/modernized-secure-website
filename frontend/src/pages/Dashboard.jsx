// frontend/src/pages/Dashboard.jsx
import React from 'react';
import { useQuery } from 'react-query';
import { 
  FileText, 
  Users, 
  Activity, 
  Shield, 
  TrendingUp,
  Clock,
  Eye,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, adminAPI, documentsAPI } from '../utils/api';
import DashboardLayout from '../components/common/DashboardLayout';
import LoadingSpinner, { CardSkeleton } from '../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const { user, isAdmin, isModerator } = useAuth();

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery(
    'userStats',
    usersAPI.getStats,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch admin dashboard data (admin only)
  const { data: adminData, isLoading: adminLoading } = useQuery(
    'adminDashboard',
    adminAPI.getDashboard,
    { 
      enabled: isAdmin(),
      refetchInterval: 30000 
    }
  );

  // Fetch recent documents
  const { data: recentDocuments, isLoading: documentsLoading } = useQuery(
    'recentDocuments',
    () => documentsAPI.getAll({ limit: 5 }),
    { refetchInterval: 60000 }
  );

  // Get welcome message based on time
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Stats cards for regular users
  const UserStatsCards = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      );
    }

    const stats = userStats?.data?.stats;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Accessible Documents"
          value={stats?.documentsAccessible || 0}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Total Views"
          value={stats?.totalAccesses || 0}
          icon={Eye}
          color="green"
        />
        <StatCard
          title="Recent Activity"
          value={stats?.recentAccesses || 0}
          icon={Activity}
          color="purple"
          subtitle="Last 7 days"
        />
        {isModerator() && (
          <StatCard
            title="Invitations Sent"
            value={stats?.invitationsSent || 0}
            icon={Users}
            color="orange"
          />
        )}
      </div>
    );
  };

  // Stats cards for admin
  const AdminStatsCards = () => {
    if (adminLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      );
    }

    const data = adminData?.data;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={data?.users?.total || 0}
            icon={Users}
            color="blue"
            subtitle={`${data?.users?.byRole?.admin || 0} admins, ${data?.users?.byRole?.moderator || 0} moderators`}
          />
          <StatCard
            title="Total Documents"
            value={data?.documents?.total || 0}
            icon={FileText}
            color="green"
            subtitle={`${data?.documents?.uniqueUsers || 0} users with access`}
          />
          <StatCard
            title="24h Activity"
            value={data?.activity?.last24Hours || 0}
            icon={Activity}
            color="purple"
            subtitle={`${data?.activity?.documentAccess24h || 0} document views`}
          />
          <StatCard
            title="Security Events"
            value={Object.values(data?.security?.eventsBySeverity || {}).reduce((a, b) => a + b, 0)}
            icon={Shield}
            color="red"
            subtitle="Last 7 days"
          />
        </div>

        {/* Top Documents */}
        {data?.topDocuments?.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Most Accessed Documents (30 days)
            </h3>
            <div className="card p-6">
              <div className="space-y-4">
                {data.topDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500 w-6">
                        #{index + 1}
                      </span>
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {doc.original_name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {doc.access_count} views
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Recent documents section
  const RecentDocuments = () => {
    if (documentsLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      );
    }

    const documents = recentDocuments?.data?.documents || [];

    if (documents.length === 0) {
      return (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No documents yet
          </h3>
          <p className="text-gray-600">
            Documents you have access to will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {documents.slice(0, 5).map((doc) => (
          <div key={doc.id} className="card p-4 hover:shadow-card-hover transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {doc.original_name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {doc.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </span>
                {doc.last_accessed_at && (
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    Last viewed {formatDistanceToNow(new Date(doc.last_accessed_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getWelcomeMessage()}, {user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your documents today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              Role: <span className={`font-medium ${user?.role === 'ADMIN' ? 'text-purple-600' : user?.role === 'MODERATOR' ? 'text-blue-600' : 'text-gray-600'}`}>
                {user?.role}
              </span>
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {isAdmin() ? <AdminStatsCards /> : <UserStatsCards />}

        {/* Recent Documents */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Documents
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all documents →
            </button>
          </div>
          <RecentDocuments />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              title="View Documents"
              description="Browse your accessible documents"
              icon={FileText}
              href="/documents"
            />
            {isModerator() && (
              <QuickActionCard
                title="Invite Users"
                description="Send invitation to new users"
                icon={Users}
                href="/users"
              />
            )}
            {isAdmin() && (
              <QuickActionCard
                title="Admin Panel"
                description="Manage users and system settings"
                icon={Shield}
                href="/admin"
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
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
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({ title, description, icon: Icon, href }) => (
  <a
    href={href}
    className="card p-6 hover:shadow-card-hover transition-all duration-200 group cursor-pointer"
  >
    <div className="flex items-center space-x-4">
      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary-100 transition-colors">
        <Icon className="w-6 h-6 text-gray-600 group-hover:text-primary-600" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </a>
);

export default Dashboard;