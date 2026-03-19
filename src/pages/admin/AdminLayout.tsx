import React, { ReactNode, useState } from 'react';
import { Home, School, FileText, Users, LogOut, GraduationCap, Menu, X, ChevronDown, User, Settings, UserCog, Calendar, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
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
  
  // Check if user is SuperAdmin - temporarily show for all users for testing
  const isSuperAdmin = userData?.role === 'SuperAdmin';
  
  // Debug: Log user data
  console.log('User data:', userData);
  console.log('Is SuperAdmin:', isSuperAdmin);
  
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
    icon: <Calendar className="w-5 h-5" />,
    label: 'Due Forms',
    path: '/admin/forms/due'
  }, {
    icon: <Users className="w-5 h-5" />,
    label: 'Parents',
    path: '/admin/parents'
  }];
  
  // Add Admins menu only for SuperAdmin
  if (isSuperAdmin) {
    navigationItems.push({
      icon: <UserCog className="w-5 h-5" />,
      label: 'Admins',
      path: '/admin/admin-management'
    });
  }
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

  const footerRef = React.useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = React.useState(0);
  React.useEffect(() => {
    if (!footerRef.current) return;
    const observer = new ResizeObserver(() => {
      setFooterHeight(footerRef.current?.offsetHeight || 0);
    });
    observer.observe(footerRef.current);
    setFooterHeight(footerRef.current.offsetHeight);
    return () => observer.disconnect();
  }, []);

  return <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar + Main wrapper */}
      <div className="flex flex-1">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{bottom: footerHeight}}>
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
            {navigationItems.map((item, index) => {
              console.log('Rendering nav item:', item.label, item.path);
              return <li key={index}>
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
              </li>
            })}
          </ul>
        </nav>
       
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
            <div>
              <h1 className="text-lg lg:text-xl font-semibold text-foreground">
                {isSuperAdmin ? 'SuperAdmin Portal' : 'Admin Portal'}
              </h1>
              <p className="text-xs text-gray-500">Role: {userData?.role || 'Unknown'}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {userData?.firstName && userData?.lastName
                    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
                    : 'AD'}
                </div>
                
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0 bg-white shadow-lg border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {userData?.firstName && userData?.lastName
                        ? `${userData.firstName} ${userData.lastName}`
                        : 'Administrator'}
                    </p>
                    <p className="text-xs text-gray-500">System Administrator</p>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center px-4 py-2.5 bg-amazon-teal hover:bg-amazon-teal/90 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {/* Page content */}
        <main className={`flex-1 sm:p-6 ${isParentDetailsPage ? 'p-2' : 'p-0'} sm:pt-20 pt-20 bg-gray-50`}>{children}</main>
      </div>
      </div>

      {/* Footer - full width spanning sidebar too */}
      <footer ref={footerRef} className="relative z-40">
        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-cyan-600 to-cyan-700 px-6 sm:px-8 py-8">
          <div className="absolute inset-y-0 right-0 w-64 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 256 200" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
              <circle cx="220" cy="-10" r="120" fill="white" fillOpacity="0.08" />
              <circle cx="256" cy="180" r="90" fill="white" fillOpacity="0.06" />
              <circle cx="140" cy="100" r="60" fill="white" fillOpacity="0.05" />
              <circle cx="210" cy="30" r="3" fill="white" fillOpacity="0.3" />
              <circle cx="235" cy="55" r="2" fill="white" fillOpacity="0.25" />
              <circle cx="245" cy="15" r="4" fill="white" fillOpacity="0.2" />
            </svg>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="bg-white/10 rounded-xl p-3 inline-block">
                <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-sm text-white/80 leading-relaxed">Nurturing children through play-based learning and quality early education.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Contact Us</h3>
              <ul className="space-y-3">
                <li><a href="tel:+18000000000" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Phone className="h-4 w-4 flex-shrink-0" />+1 (800) 000-0000</a></li>
                <li><a href="mailto:support@goddardschool.com" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Mail className="h-4 w-4 flex-shrink-0" />support@goddardschool.com</a></li>
                <li><a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Globe className="h-4 w-4 flex-shrink-0" />goddardschool.com</a></li>
                <li className="flex items-start gap-3 text-sm text-white/90"><MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />123 School Lane, Lynnwood, WA 98036</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Resources</h3>
              <ul className="space-y-2.5">
                  {!isSuperAdmin && (
                    <li><Link to="/admin/help" className="text-sm text-white/90 hover:text-white transition-colors">Help Center</Link></li>
                  )}
                  <li><Link to="/admin/guide" className="text-sm text-white/90 hover:text-white transition-colors">Admin Guide</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-cyan-800 px-6 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-1">
          <p className="text-xs text-white/60">© {new Date().getFullYear()} The Goddard School. All rights reserved.</p>
          <p className="text-xs text-white/40 tracking-widest font-medium">ADMIN PORTAL</p>
        </div>
      </footer>
      
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
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