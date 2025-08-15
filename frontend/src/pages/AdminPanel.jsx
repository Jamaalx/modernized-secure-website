// frontend/src/pages/AdminPanel.jsx
import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Activity, 
  Shield, 
  Settings,
  Upload,
  UserPlus,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import DashboardLayout from '../components/common/DashboardLayout';
import UserManagement from '../components/admin/UserManagement';
import DocumentManagement from '../components/admin/DocumentManagement';
import ActivityLogs from '../components/admin/ActivityLogs';
import SecurityEvents from '../components/admin/SecurityEvents';
import SystemSettings from '../components/admin/SystemSettings';
import UploadModal from '../components/documents/UploadModal';
import { motion } from 'framer-motion';

const AdminPanel = () => {
  const location = useLocation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Admin navigation items
  const adminNavItems = [
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      description: 'Manage user accounts and permissions'
    },
    {
      name: 'Documents',
      href: '/admin/documents',
      icon: FileText,
      description: 'Upload and manage documents'
    },
    {
      name: 'Activity Logs',
      href: '/admin/activity',
      icon: Activity,
      description: 'View system activity and user actions'
    },
    {
      name: 'Security Events',
      href: '/admin/security',
      icon: Shield,
      description: 'Monitor security incidents and threats'
    },
    {
      name: 'System Settings',
      href: '/admin/settings',
      icon: Settings,
      description: 'Configure system preferences'
    }
  ];

  const isCurrentPath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Admin Panel Overview (default route)
  const AdminOverview = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Panel
          </h1>
          <p className="text-gray-600 mt-1">
            Manage users, documents, and system security
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="btn-primary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard
          title="Total Users"
          value="24"
          change="+3 this week"
          icon={Users}
          color="blue"
          href="/admin/users"
        />
        <QuickStatCard
          title="Documents"
          value="156"
          change="+12 today"
          icon={FileText}
          color="green"
          href="/admin/documents"
        />
        <QuickStatCard
          title="Activity (24h)"
          value="1,247"
          change="Normal"
          icon={Activity}
          color="purple"
          href="/admin/activity"
        />
        <QuickStatCard
          title="Security Alerts"
          value="3"
          change="2 resolved"
          icon={AlertTriangle}
          color="red"
          href="/admin/security"
        />
      </div>

      {/* Admin Navigation Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Administration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminNavItems.map((item) => (
            <AdminNavCard
              key={item.name}
              item={item}
              isActive={isCurrentPath(item.href)}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityWidget />
        <PendingActionsWidget />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/documents" element={<DocumentManagement />} />
        <Route path="/activity" element={<ActivityLogs />} />
        <Route path="/security" element={<SecurityEvents />} />
        <Route path="/settings" element={<SystemSettings />} />
      </Routes>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadModal onClose={() => setUploadModalOpen(false)} />
      )}
    </DashboardLayout>
  );
};

// Quick Stat Card Component
const QuickStatCard = ({ title, value, change, icon: Icon, color, href }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  };

  return (
    <Link to={href} className="block">
      <motion.div
        whileHover={{ y: -2 }}
        className="card p-6 hover:shadow-card-hover transition-all duration-200"
      >
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{change}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

// Admin Navigation Card Component
const AdminNavCard = ({ item, isActive }) => (
  <Link to={item.href}>
    <motion.div
      whileHover={{ y: -2 }}
      className={`card p-6 hover:shadow-card-hover transition-all duration-200 group ${
        isActive ? 'ring-2 ring-primary-500 border-primary-200' : ''
      }`}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-primary-100' 
            : 'bg-gray-100 group-hover:bg-primary-100'
        }`}>
          <item.icon className={`w-6 h-6 transition-colors ${
            isActive 
              ? 'text-primary-600' 
              : 'text-gray-600 group-hover:text-primary-600'
          }`} />
        </div>
        <div>
          <h3 className={`font-medium transition-colors ${
            isActive 
              ? 'text-primary-600' 
              : 'text-gray-900 group-hover:text-primary-600'
          }`}>
            {item.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {item.description}
          </p>
        </div>
      </div>
    </motion.div>
  </Link>
);

// Recent Activity Widget
const RecentActivityWidget = () => (
  <div className="card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Recent Activity
      </h3>
      <Link to="/admin/activity" className="text-sm text-primary-600 hover:text-primary-700">
        View all →
      </Link>
    </div>
    <div className="space-y-4">
      {[
        {
          action: 'Document uploaded',
          user: 'admin@company.com',
          time: '2 minutes ago',
          icon: FileText,
          color: 'text-green-600'
        },
        {
          action: 'User invited',
          user: 'moderator@company.com',
          time: '15 minutes ago',
          icon: UserPlus,
          color: 'text-blue-600'
        },
        {
          action: 'Document accessed',
          user: 'user@company.com',
          time: '1 hour ago',
          icon: FileText,
          color: 'text-gray-600'
        }
      ].map((activity, index) => (
        <div key={index} className="flex items-center space-x-3 py-2">
          <activity.icon className={`w-4 h-4 ${activity.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {activity.action}
            </p>
            <p className="text-xs text-gray-500">
              by {activity.user}
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {activity.time}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Pending Actions Widget
const PendingActionsWidget = () => (
  <div className="card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Pending Actions
      </h3>
      <span className="badge-warning">3 items</span>
    </div>
    <div className="space-y-4">
      {[
        {
          title: 'User invitation approval',
          description: '2 pending invitations from moderators',
          action: 'Review',
          href: '/admin/users',
          priority: 'medium'
        },
        {
          title: 'Security alert review',
          description: 'Multiple failed login attempts detected',
          action: 'Investigate',
          href: '/admin/security',
          priority: 'high'
        },
        {
          title: 'System backup',
          description: 'Weekly backup scheduled for tonight',
          action: 'Configure',
          href: '/admin/settings',
          priority: 'low'
        }
      ].map((item, index) => (
        <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">
                {item.title}
              </h4>
              <span className={`badge ${
                item.priority === 'high' ? 'badge-danger' :
                item.priority === 'medium' ? 'badge-warning' : 'badge-gray'
              }`}>
                {item.priority}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {item.description}
            </p>
          </div>
          <Link
            to={item.href}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {item.action}
          </Link>
        </div>
      ))}
    </div>
  </div>
);

export default AdminPanel;