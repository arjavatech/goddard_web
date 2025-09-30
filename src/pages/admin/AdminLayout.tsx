import React, { ReactNode } from 'react';
import { Home, School, FileText, Users, LogOut, GraduationCap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
interface AdminLayoutProps {
  children: ReactNode;
}
export function AdminLayout({
  children
}: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const { userData } = useUserContext();
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', {
        replace: true
      });
    } catch (err) {
    }
  };
  const currentPath = location.pathname;
  const navigationItems = [{
    icon: <Home className="w-5 h-5" />,
    label: 'Dashboard',
    path: '/admin'
  }, {
    icon: <School className="w-5 h-5" />,
    label: 'Classrooms',
    path: '/admin/classrooms'
  }, {
    icon: <GraduationCap className="w-5 h-5" />,
    label: 'Students',
    path: '/admin/students'
  }, {
    icon: <FileText className="w-5 h-5" />,
    label: 'Forms',
    path: '/admin/forms'
  }, {
    icon: <Users className="w-5 h-5" />,
    label: 'Parents',
    path: '/admin/parents'
  }];
  return <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-1">
            <img src="/gs_logo_lynnwood.png" alt="App Logo" className="h-18 w-auto max-h-none shrink-0" />
          </div>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navigationItems.map((item, index) => <li key={index}>
                <Link to={item.path} className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${currentPath === item.path ? 'bg-amazon-teal/10 text-amazon-teal font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>)}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </div>
        </div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            Admin Portal
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
                {userData?.firstName && userData?.lastName
                  ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
                  : 'AD'}
              </div>
              <span className="text-sm font-medium">
                {userData?.firstName && userData?.lastName
                  ? `${userData.firstName} ${userData.lastName}`
                  : 'Admin User'}
              </span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>;
}