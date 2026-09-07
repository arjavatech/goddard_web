import { type ReactNode, useEffect, useRef, useState } from 'react';
import { FileText, Home, LogOut, Menu, UserCog, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { Footer } from '../../components/layout/Footer';
import { Loading } from '../../components/ui/loading';
import { cn } from '../../lib/utils';

interface ParentLayoutProps { children: ReactNode; }

export function ParentLayout({ children }: ParentLayoutProps) {
  const activeNavRef = useRef<HTMLAnchorElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userData, schoolName, schoolSubdomain, isReady } = useUserContext();
  const schoolPrefix = `/${schoolSubdomain || 'goddard'}`;
  const currentPath = location.pathname.replace(/^\/[^/]+(?=\/dashboard|\/profile)/, '');
  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : 'PAR';
  const navItems = [
    { icon: <Home className="h-[18px] w-[18px]" />, label: 'Dashboard', path: `${schoolPrefix}/dashboard`, exact: true },
    { icon: <FileText className="h-[18px] w-[18px]" />, label: 'Documents', path: `${schoolPrefix}/dashboard/documents` },
    { icon: <UserCog className="h-[18px] w-[18px]" />, label: 'Profile', path: `${schoolPrefix}/profile` },
  ];
  const isActive = (path: string, exact?: boolean) => {
    const normalized = path.replace(/^\/[^/]+(?=\/dashboard|\/profile)/, '');
    return exact ? currentPath === normalized : currentPath === normalized || currentPath.startsWith(`${normalized}/`);
  };
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.clear();
      sessionStorage.setItem('explicit_logout', 'true');
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);
  useEffect(() => { activeNavRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [location.pathname]);
  if (!isReady) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loading size="md" message="Loading portal…" /></div>;
  const Nav = ({ mobile = false }: { mobile?: boolean }) => <nav className="flex-1 overflow-y-auto px-3 pb-2 pt-4">
    <p className={cn('mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest', mobile ? 'text-slate-500/70' : 'text-slate-500/70')}>Workspace</p>
    <div className="space-y-0.5">{navItems.map(item => {
      const active = isActive(item.path, item.exact);
      return <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} ref={active ? activeNavRef : undefined} className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all', mobile ? (active ? 'bg-[#EFF5FB] text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900') : (active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/[.08] hover:text-white'))}>
        {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#1a6fc4]" />}
        <span className={cn(active ? 'text-blue-400' : mobile ? 'text-slate-400' : 'text-slate-500')}>{item.icon}</span><span className={cn('font-medium', active && 'font-semibold')}>{item.label}</span>
      </Link>;
    })}</div>
  </nav>;
  const UserFooter = ({ mobile = false }: { mobile?: boolean }) => <div className={cn('flex shrink-0 items-center gap-3 border-t px-4 py-3.5', mobile ? 'border-slate-100' : 'border-[#1a3a60]')}>
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] text-xs font-bold text-white">{initials}</div>
    <p className={cn('min-w-0 flex-1 truncate text-[13px] font-semibold', mobile ? 'text-slate-900' : 'text-white')}>{userData?.firstName} {userData?.lastName}</p>
    <button onClick={() => { setIsSidebarOpen(false); setShowLogoutModal(true); }} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600" title="Sign out"><LogOut className="h-4 w-4" /></button>
  </div>;
  return <div className="flex min-h-screen flex-col bg-[#F7F9FC] font-sans">
    {isSidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    <div className="flex min-h-screen flex-1">
      <aside className={cn('fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-slate-100 bg-white shadow-2xl transition-transform duration-300 lg:hidden', isSidebarOpen ? 'translate-x-0' : '-translate-x-full')}><div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5"><img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-9 w-auto max-w-[150px] object-contain" /><button onClick={() => setIsSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><Nav mobile /><UserFooter mobile /></aside>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 shrink-0 flex-col border-r border-[#1a3a60] bg-[#0F2D52] lg:flex"><div className="flex h-20 shrink-0 items-center border-b border-[#1a3a60] px-5"><img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-12 w-auto max-w-[170px] object-contain brightness-0 invert opacity-95" /></div><Nav /><UserFooter /></aside>
      <div className="ml-0 flex min-w-0 flex-1 flex-col lg:ml-60"><header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white px-2 shadow-[0_1px_3px_rgba(15,23,42,0.06)] lg:left-60 lg:px-6"><div className="flex flex-1 items-center"><button onClick={() => setIsSidebarOpen(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button></div><div className="flex flex-1 justify-center"><h1 className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 sm:text-base">{schoolName || 'The Goddard School'}</h1></div><div className="flex flex-1 items-center justify-end gap-2"><NotificationBell enabled={!!userData} /><DropdownMenu><DropdownMenuTrigger asChild><button className="rounded-xl p-1.5 hover:bg-slate-100"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-sm font-bold text-white">{initials}</div></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60 rounded-xl p-0"><div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3"><p className="text-sm font-semibold text-slate-900">{userData?.firstName} {userData?.lastName}</p><p className="truncate text-xs text-slate-400">{userData?.email}</p><span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-[#1a6fc4]">Parent</span></div><div className="p-2"><DropdownMenuItem onClick={() => navigate(`${schoolPrefix}/dashboard`)} className="cursor-pointer gap-2 rounded-lg"><Home className="h-4 w-4 text-slate-400" />Dashboard</DropdownMenuItem></div><DropdownMenuSeparator /><div className="p-2"><button onClick={() => setShowLogoutModal(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button></div></DropdownMenuContent></DropdownMenu></div></header><main className="flex min-w-0 flex-1 flex-col bg-[#F7F9FC] p-3 pt-19 sm:p-4 sm:pt-20 md:p-6 md:pt-22">{children}</main><Footer /></div>
    </div>
    <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}><DialogContent className="w-[95vw] max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Sign out?</DialogTitle><DialogDescription>You'll need to sign in again to access the portal.</DialogDescription></DialogHeader><DialogFooter className="flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut} className="rounded-xl">Cancel</Button><AsyncButton variant="destructive" onClick={handleLogout} className="rounded-xl">Sign out</AsyncButton></DialogFooter></DialogContent></Dialog>
  </div>;
}
