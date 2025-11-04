import React, { ReactNode, useState } from 'react';
import { Home, School, FileText, Users, LogOut, GraduationCap, Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
interface AdminLayoutProps {
  children: ReactNode;
}
export function AdminLayout({
  children
}: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const { userData } = useUserContext();
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', {
        replace: true
      });
    } catch (err) {
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };
  const currentPath = location.pathname;
  const isParentDetailsPage = currentPath.includes('/admin/parents/') && currentPath !== '/admin/parents';
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
  React.useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  return <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <img src="/gs_logo_lynnwood.png" alt="App Logo" className="h-18 w-auto max-h-none shrink-0 max-w-[200px]" />
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-6">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => <li key={index}>
                <Link 
                  to={item.path} 
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-4 px-4 py-3.5 rounded-lg transition-all duration-200 ${currentPath === item.path ? 'bg-amazon-teal text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:text-amazon-teal'}`}
                >
                  <span className={`${currentPath === item.path ? 'text-white' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>)}
          </ul>
        </nav>
        <div className="p-6 border-t border-gray-200">
          <div onClick={() => setShowLogoutModal(true)} className="flex items-center space-x-4 px-4 py-3.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white shadow-sm border-b border-gray-100 py-3 px-4 lg:px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg lg:text-xl font-semibold text-foreground">
              Admin Portal
            </h1>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-xs lg:text-sm">
                {userData?.firstName && userData?.lastName
                  ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
                  : 'AD'}
              </div>
              <span className="text-xs lg:text-sm font-medium">
                {userData?.firstName && userData?.lastName
                  ? `${userData.firstName} ${userData.lastName}`
                  : 'Admin User'}
              </span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className={`flex-1 sm:p-6 ${isParentDetailsPage ? 'p-2' : 'p-0'} sm:pt-20 pt-20 flex flex-col bg-gray-50`}>{children}</main>
      </div>
      
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to sign in again to access the admin portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut}>
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleLogout}>
              Logout
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}