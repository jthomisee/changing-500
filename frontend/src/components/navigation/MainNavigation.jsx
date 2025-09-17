import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Users, User, Settings, Bell } from 'lucide-react';

const MainNavigation = ({
  isMobile,
  currentUser,
  isAdmin,
  pendingActions = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/',
      badge: pendingActions > 0 ? pendingActions : null,
    },
    {
      id: 'games',
      label: 'Games',
      icon: Calendar,
      path: '/games',
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: Users,
      path: '/groups',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Admin',
            icon: Settings,
            path: '/admin/users',
          },
        ]
      : []),
  ];

  const getActiveItem = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/groups')) return 'groups';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/admin')) return 'admin';
    return 'dashboard';
  };

  const activeItem = getActiveItem();

  if (isMobile) {
    // Bottom navigation for mobile
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 md:grid-cols-5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center py-2 px-1 ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop sidebar navigation
  return (
    <nav className="bg-white border-r border-gray-200 w-64 fixed left-0 top-0 h-full z-30 pt-16">
      <div className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 mr-3" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default MainNavigation;
