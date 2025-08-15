// frontend/src/components/common/DashboardLayout.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Activity, 
  LogOut,
  Menu,
  X,
  User,
  Shield,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin, isModerator, getRoleDisplayName, getRoleColor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation items based on role
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['USER', 'MODERATOR', 'ADMIN']
      },
      {
        name: 'Shared Docs',
        href: '/documents',
        icon: FileText,
        roles: ['USER', 'MODERATOR', 'ADMIN']
      },
    ];

    const moderatorItems = [
      {
        name: 'Users',
        href: '/users',
        icon: Users,
        roles: ['MODERATOR', 'ADMIN']
      },
    ];

    const adminItems = [
      {
        name: 'Admin Panel',
        href: '/admin',
        icon: Shield,
        roles: ['ADMIN']
      },
      {
        name: 'Activity Log',
        href: '/admin/activity',
        icon: Activity,
        roles: ['ADMIN']
      },
    ];

    let items = [...baseItems];
    
    if (isModerator()) {
      items = [...items, ...moderatorItems];
    }
    
    if (isAdmin()) {
      items = [...items, ...adminItems];
    }

    return items.filter(item => item.roles.includes(user?.role));
  };

  const navigationItems = getNavigationItems();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const isCurrentPath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Sidebar component
  const Sidebar = ({ mobile = false }) => (
    <div className={`${mobile ? 'w-full' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-full`}>
      {/* Logo/Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-600 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Secure Docs
            </h1>
          </div>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-100 p-2 rounded-full">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className={`text-xs ${getRoleColor()}`}>
              {getRoleDisplayName()}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = isCurrentPath(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                isActive
                  ? 'sidebar-item-active'
                  : 'sidebar-item-inactive'
              }`}
              onClick={mobile ? () => setSidebarOpen(false) : undefined}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <Link
          to="/profile"
          className="sidebar-item-inactive"
          onClick={mobile ? () => setSidebarOpen(false) : undefined}
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-item-inactive w-full text-left"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 lg:border-b-0">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title for mobile */}
            <div className="lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => isCurrentPath(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <Bell className="w-5 h-5" />
                {/* Notification badge */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-primary-100 p-1 rounded-full">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.email?.split('@')[0]}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container-padding page-padding">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;