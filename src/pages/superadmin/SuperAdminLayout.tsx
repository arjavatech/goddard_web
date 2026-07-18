import React, { ReactNode, useState } from 'react';
import { Home, Users, LogOut, Menu, X, Crown, School, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { NotificationBell } from '../../components/notifications/NotificationBell';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { userData } = useUserContext();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error during SuperAdmin sign out:', err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      window.location.href = '/';
    }
  };

  const currentPath = location.pathname;

  const navItems = [
    { icon: <LayoutDashboard className="w-[18px] h-[18px]" />, label: 'Dashboard',    path: '/superadmin-arjava' },
    { icon: <Crown className="w-[18px] h-[18px]" />,          label: 'Subscription', path: '/superadmin-arjava/subscription' },
    { icon: <School className="w-[18px] h-[18px]" />,         label: 'Schools',      path: '/superadmin-arjava/schools' },
    { icon: <Users className="w-[18px] h-[18px]" />,          label: 'Clients',      path: '/superadmin-arjava/clients' },
  ];

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : 'SA';

  React.useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  const SidebarContent = () => (
    <>
      <div className="px-5 pt-5 pb-2 flex-shrink-0 lg:mt-20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">Navigation</p>
      </div>
      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-0.5 scrollbar-thin">
        {navItems.map((item, i) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={i}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/8'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#1a6fc4] rounded-r-full" />
              )}
              <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-200')}>
                {item.icon}
              </span>
              <span className={cn('text-sm truncate', isActive ? 'font-semibold text-white' : 'font-medium group-hover:text-white')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Mobile sidebar drawer */}
        <aside className={cn(
          'fixed top-0 left-0 h-full w-60 flex flex-col z-50 transition-transform duration-300 lg:hidden',
          'bg-[#0F2D52] border-r border-[#1a3a60]',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="h-20 px-5 flex items-center justify-between border-b border-[#1a3a60] flex-shrink-0">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-12 w-auto object-contain brightness-0 invert opacity-95 max-w-[170px]"
            />
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 sticky top-0 self-start h-screen bg-[#0F2D52] border-r border-[#1a3a60] z-30">
          <div className="h-20 px-5 flex items-center border-b border-[#1a3a60] flex-shrink-0 lg:fixed lg:top-0 lg:left-0 lg:w-60 bg-[#0F2D52] z-40 border-r border-r-[#1a3a60]">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-12 w-auto object-contain brightness-0 invert opacity-95 max-w-[170px]"
            />
          </div>
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="fixed top-0 right-0 left-0 lg:left-60 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 h-16 px-4 lg:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                  Super Admin Portal
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5">System Administration</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell enabled={!!userData} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 focus:outline-none">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {userData?.firstName && userData?.lastName
                            ? `${userData.firstName} ${userData.lastName}`
                            : 'Super Administrator'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{userData?.email || 'System SuperAdmin'}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <div className="p-2">
                    <button
                      onClick={() => setShowLogoutModal(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 bg-[#F7F9FC] pt-16 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Logout modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="w-[95vw] max-w-sm" preventClose>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access the SuperAdmin portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut}>
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleLogout}>
              Sign out
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
