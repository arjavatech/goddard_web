import React, { ReactNode, useState, useEffect } from 'react';
import {
  Home, LogOut, Menu, X, ShoppingBag, UserCog, User
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { Loading } from '../../components/ui/loading';
import { cn } from '../../lib/utils';
import { Footer } from '../../components/layout/Footer';

interface EmployeeLayoutProps { children: ReactNode; }

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userData, schoolName, schoolSubdomain, isReady } = useUserContext();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.clear();
      sessionStorage.setItem('explicit_logout', 'true');
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  const currentPath = location.pathname.replace(/^\/[^/]+(?=\/employee|\/profile)/, '');

  const isNavItemActive = (normalizedItemPath: string) => {
    if (normalizedItemPath === '/employee/dashboard') return currentPath === '/employee/dashboard';
    if (normalizedItemPath === '/employee/requests') return currentPath === '/employee/requests';
    if (normalizedItemPath === '/profile') return currentPath === '/profile';
    return currentPath === normalizedItemPath || currentPath.startsWith(normalizedItemPath + '/');
  };

  const schoolPrefix = `/${schoolSubdomain || 'goddard'}`;

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { icon: <Home className="w-[18px] h-[18px]" />, label: 'Dashboard', path: `${schoolPrefix}/employee/dashboard` },
        { icon: <ShoppingBag className="w-[18px] h-[18px]" />, label: 'Requests', path: `${schoolPrefix}/employee/requests` },
        { icon: <UserCog className="w-[18px] h-[18px]" />, label: 'Profile', path: `${schoolPrefix}/profile` },
      ],
    }
  ];

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase() : 'EMP';

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading size="md" message="Loading portal…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col font-sans">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex flex-1 min-h-screen">
        {/* ── Sidebar — sticky, scrolls up with footer ── */}
        {/* Mobile drawer (fixed overlay) */}
        <aside className={cn(
          'fixed top-0 left-0 h-full w-64 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:hidden',
          'bg-white border-r border-slate-100 shadow-2xl',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Logo area */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-9 w-auto object-contain max-w-[150px]"
            />
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin pt-4 pb-2">
            {navGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/70 px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => {
                    const normalizedItemPath = item.path.replace(/^\/[^/]+(?=\/employee|\/profile)/, '');
                    const isActive = isNavItemActive(normalizedItemPath);
                    return (
                      <Link key={i} to={item.path} onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                          isActive ? 'bg-[#EFF5FB] text-[#0F2D52] shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1a6fc4] rounded-r-full" />}
                        <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-[#1a6fc4]' : 'text-slate-400 group-hover:text-slate-700')}>{item.icon}</span>
                        <span className={cn('text-sm truncate', isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-600 group-hover:text-slate-900')}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Mobile sidebar footer: User + Logout ── */}
          <div className="flex-shrink-0 border-t border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-[#0F2D52]/10 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{userData?.firstName} {userData?.lastName}</p>
              </div>
              <button
                onClick={() => { setIsSidebarOpen(false); setShowLogoutModal(true); }}
                title="Sign out"
                className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Desktop sidebar — fixed position */}
        <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed top-0 left-0 h-screen bg-[#0F2D52] border-r border-[#1a3a60] z-30">
          {/* Logo area */}
          <div className="h-20 px-5 flex items-center border-b border-[#1a3a60] flex-shrink-0 bg-[#0F2D52]">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-12 w-auto object-contain brightness-0 invert opacity-95 max-w-[170px]"
            />
          </div>
          <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin pt-4">
            {navGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/70 px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => {
                    const normalizedItemPath = item.path.replace(/^\/[^/]+(?=\/employee|\/profile)/, '');
                    const isActive = isNavItemActive(normalizedItemPath);
                    return (
                      <Link key={i} to={item.path}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-250 ease-in-out group',
                          isActive ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/8'
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1a6fc4] rounded-r-full" />}
                        <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-200')}>{item.icon}</span>
                        <span className={cn('text-sm truncate', isActive ? 'font-semibold text-white' : 'font-medium group-hover:text-white')}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Desktop sidebar footer: User + Logout ── */}
          <div className="flex-shrink-0 border-t border-[#1a3a60] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-white/15 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white leading-tight truncate">{userData?.firstName} {userData?.lastName}</p>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                title="Sign out"
                className="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
          {/* Top header */}
          {userData?.role && (
            <header className={cn(
              "fixed top-0 right-0 left-0 lg:left-60 z-40 h-16 px-2 lg:px-6 flex items-center border-b shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors duration-300",
              isSidebarOpen ? "bg-[#0F2D52] border-[#1a3a60]" : "bg-white border-slate-200"
            )}>
              {/* Left col — hamburger (mobile only), flex-1 to balance right col */}
              <div className="flex-1 flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn(
                    "lg:hidden p-2 rounded-xl transition-all flex-shrink-0",
                    isSidebarOpen
                      ? "text-slate-200 hover:text-white hover:bg-white/10"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {/* Center col — school name */}
              <div className="flex-1 flex items-center justify-center">
                <h1 className={cn(
                  "text-sm sm:text-base font-bold tracking-tight leading-none whitespace-nowrap transition-colors duration-300",
                  isSidebarOpen ? "text-white" : "text-slate-900"
                )}>
                  {schoolName || 'The Goddard School'}
                </h1>
              </div>

              {/* Right col — notification + user menu */}
              <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2">
                <div className={cn(
                  "transition-colors flex items-center justify-center",
                  isSidebarOpen
                    ? "[&_button]:text-slate-200 hover:[&_button]:bg-white/10 hover:[&_button]:text-white"
                    : ""
                )}>
                  <NotificationBell enabled={!!userData} />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-1.5 border border-transparent transition-all duration-150 focus:outline-none",
                      isSidebarOpen
                        ? "hover:bg-white/10 hover:border-white/10"
                        : "hover:bg-slate-100 hover:border-slate-200"
                    )}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {initials}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-auto min-w-[15rem] p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">{initials}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">{userData?.firstName} {userData?.lastName}</p>
                          <div className="whitespace-nowrap text-xs text-slate-400">{userData?.email}</div>
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#1a6fc4]">Employee</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <DropdownMenuItem onClick={() => navigate(`${schoolPrefix}/employee/dashboard`)} className="rounded-lg text-sm text-slate-700 hover:bg-slate-50 py-2 cursor-pointer gap-2">
                        <Home className="w-4 h-4 text-slate-400" /> Dashboard
                      </DropdownMenuItem>
                    </div>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <div className="p-2">
                      <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
          )}

          {/* Page content */}
          <main className={cn(
            'flex-1 flex flex-col min-w-0 bg-[#F7F9FC]',
            userData?.role ? 'pt-16' : 'pt-0',
            'p-3 sm:p-4 md:p-6'
          )}>
            {children}
          </main>
          <Footer />
        </div>
      </div>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl" preventClose>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You'll need to sign in again to access the portal.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut} className="rounded-xl">Cancel</Button>
            <AsyncButton variant="destructive" onClick={handleLogout} className="rounded-xl">Sign out</AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
