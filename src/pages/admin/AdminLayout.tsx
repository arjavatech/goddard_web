import { ReactNode } from 'react';
import { Home, School, FileText, Users, Bell, LogOut, GraduationCap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
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
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', {
        replace: true
      });
    } catch (err) {
      console.error('Error during logout', err);
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
          <div className="flex items-center space-x-2">
            <img src="../../images/gs_logo_lynnwood.png" alt="App Logo" className="h-12 w-auto" />
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
            <button className="relative hover:bg-gray-50 p-2 rounded-full">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-amazon-orange rounded-full"></span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <span className="text-sm font-medium">Admin User</span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>;
}