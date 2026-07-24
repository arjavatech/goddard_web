import React, { ReactNode, useState, useEffect } from 'react';
import {
  Home, School, FileText, Users, LogOut, GraduationCap, Menu, X,
  Calendar, Phone, Mail, Globe, BookOpen,
  LayoutDashboard, Download, CheckCircle, Clock, AlertTriangle,
  Eye, ShieldCheck, Settings, UserCog,
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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { HelpCenterContent } from '../../components/HelpCenterContent';
import { SuperAdminGuideContent } from '../../components/SuperAdminGuideContent';
import { cn } from '../../lib/utils';

interface AdminLayoutProps { children: ReactNode; }

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSuperGuideModal, setShowSuperGuideModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { userData, schoolName, schoolPhone, schoolEmail, schoolAddress, isReady } = useUserContext();
  const isSuperAdmin = userData?.role === 'SuperAdmin';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await signOut(); } catch (err) { console.error('Logout error:', err); } finally {
      localStorage.clear(); sessionStorage.clear();
      setIsLoggingOut(false); setShowLogoutModal(false);
      window.location.href = '/';
    }
  };

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  const currentPath = location.pathname;
  const isParentDetailsPage = currentPath.includes('/admin/parents/') && currentPath !== '/admin/parents';

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { icon: <Home className="w-[18px] h-[18px]" />, label: 'Dashboard', path: '/admin' },
        { icon: <School className="w-[18px] h-[18px]" />, label: 'Classrooms', path: '/admin/classrooms' },
        { icon: <GraduationCap className="w-[18px] h-[18px]" />, label: 'Students', path: '/admin/students' },
        { icon: <Users className="w-[18px] h-[18px]" />, label: 'Parents', path: '/admin/parents' },
      ],
    },
    {
      label: 'Enrollment',
      items: [
        { icon: <FileText className="w-[18px] h-[18px]" />, label: 'Forms', path: '/admin/forms' },
        { icon: <Calendar className="w-[18px] h-[18px]" />, label: 'Due Forms', path: '/admin/forms/due' },
      ],
    },
    ...(isSuperAdmin ? [{
      label: 'Administration',
      items: [
        { icon: <UserCog className="w-[18px] h-[18px]" />, label: 'Admins', path: '/admin/admin-management' },
      ],
    }] : []),
  ];

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase() : 'AD';

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
          'bg-white border-r border-slate-200 shadow-2xl',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Logo area */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-9 w-auto object-contain max-w-[150px]"
            />
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin pt-4 pb-2">
            {navGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => {
                    const isActive = currentPath === item.path;
                    return (
                      <Link key={i} to={item.path} onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                          isActive ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1a6fc4] rounded-r-full" />}
                        <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-[#1a6fc4]' : 'text-slate-400 group-hover:text-slate-600')}>{item.icon}</span>
                        <span className={cn('text-sm truncate', isActive ? 'font-semibold' : 'font-medium')}>{item.label}</span>
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate">{userData?.firstName} {userData?.lastName}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{userData?.email}</p>
              </div>
              <button
                onClick={() => { setIsSidebarOpen(false); setShowLogoutModal(true); }}
                title="Sign out"
                className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Desktop sidebar — sticky, stays in document flow */}
        <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 sticky top-0 self-start h-screen bg-[#0F2D52] border-r border-[#1a3a60] z-30">
          {/* Logo area */}
          <div className="h-20 px-5 flex items-center border-b border-[#1a3a60] flex-shrink-0 lg:fixed lg:top-0 lg:left-0 lg:w-60 bg-[#0F2D52] z-40 border-r border-r-[#1a3a60]">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-12 w-auto object-contain brightness-0 invert opacity-95 max-w-[170px]"
            />
          </div>
          <nav className="flex-1 px-3 overflow-y-auto scrollbar-thin lg:mt-20 pt-4">
            {navGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/70 px-3 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item, i) => {
                    const isActive = currentPath === item.path;
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
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{userData?.email}</p>
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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header — fixed, offset from sidebar on desktop */}
          {userData?.role && (
            <header className={cn(
              'fixed top-0 right-0 left-0 lg:left-60 z-40 h-16 px-4 lg:px-6 flex items-center justify-between border-b transition-colors duration-300',
              isSidebarOpen ? 'bg-[#0F2D52] border-[#1a3a60] lg:bg-white lg:border-slate-200' : 'bg-white border-slate-200'
            )}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn(
                    'lg:hidden p-2 rounded-xl transition-all duration-300',
                    isSidebarOpen
                      ? 'text-slate-300 hover:text-white hover:bg-white/10'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className={cn(
                    'text-sm sm:text-base font-bold tracking-tight leading-none transition-colors duration-300',
                    isSidebarOpen ? 'text-white lg:text-slate-900' : 'text-slate-900'
                  )}>
                    {isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'}
                  </h1>
                  <p className={cn(
                    'text-[11px] mt-0.5 transition-colors duration-300',
                    isSidebarOpen ? 'text-slate-400 lg:text-slate-500' : 'text-slate-500'
                  )}>
                    {schoolName || 'The Goddard School'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell enabled={!!userData} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'flex items-center gap-2 rounded-xl px-2 py-1.5 border border-transparent transition-all duration-150 focus:outline-none',
                      isSidebarOpen
                        ? 'hover:bg-white/10 hover:border-white/20 lg:hover:bg-slate-100 lg:hover:border-slate-200'
                        : 'hover:bg-slate-100 hover:border-slate-200'
                    )}>
                      <div className={cn(
                        'w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0 ring-1 transition-colors duration-300',
                        isSidebarOpen
                          ? 'bg-white/15 ring-white/25 lg:bg-gradient-to-br lg:from-[#0F2D52] lg:to-[#1a6fc4] lg:ring-transparent'
                          : 'bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] ring-transparent'
                      )}>
                        {initials}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">{initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{userData?.firstName} {userData?.lastName}</p>
                          <p className="text-xs text-slate-400 truncate">{userData?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-lg text-sm text-slate-700 hover:bg-slate-50 py-2 cursor-pointer gap-2">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                      </DropdownMenuItem>
                      {!isSuperAdmin && (
                        <DropdownMenuItem onClick={() => setShowHelpModal(true)} className="rounded-lg text-sm text-slate-700 hover:bg-slate-50 py-2 cursor-pointer gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400" /> Help Center
                        </DropdownMenuItem>
                      )}
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={() => setShowSuperGuideModal(true)} className="rounded-lg text-sm text-slate-700 hover:bg-slate-50 py-2 cursor-pointer gap-2">
                          <ShieldCheck className="w-4 h-4 text-slate-400" /> SuperAdmin Guide
                        </DropdownMenuItem>
                      )}
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
            'flex-1 bg-[#F7F9FC]',
            userData?.role ? 'pt-16' : 'pt-0',
            isParentDetailsPage ? 'p-3 sm:p-5' : 'p-4 sm:p-6'
          )}>
            {children}
          </main>
        </div>
        {/* END main content column */}
      </div>
      {/* END sidebar + main row — footer is OUTSIDE this row */}
      {/* ── Footer ── */}
      <footer className="w-full bg-[#1a3a5c]">
        {/* Main body */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* ── Brand column ── */}
            <div className="lg:col-span-2 space-y-4">
              <img
                src="/gs_logo_lynnwood.png"
                alt="The Goddard School"
                className="h-9 w-auto object-contain brightness-0 invert opacity-90"
              />
              <p className="text-sm text-slate-300/70 leading-relaxed max-w-sm">
                Empowering families through seamless enrollment management — built for The Goddard School's commitment to quality early childhood education.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                {schoolPhone && (
                  <a href={`tel:${schoolPhone}`}
                    className="inline-flex items-center gap-2.5 text-xs text-slate-300/70 hover:text-white transition-colors group w-fit">
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0">
                      <Phone className="h-3 w-3 text-slate-300" />
                    </span>
                    <span className="font-medium">{schoolPhone}</span>
                  </a>
                )}
                {schoolEmail && (
                  <a href={`mailto:${schoolEmail}`}
                    className="inline-flex items-center gap-2.5 text-xs text-slate-300/70 hover:text-white transition-colors group w-fit">
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0">
                      <Mail className="h-3 w-3 text-slate-300" />
                    </span>
                    <span className="font-medium">{schoolEmail}</span>
                  </a>
                )}
                {schoolAddress && (
                  <span className="inline-flex items-start gap-2.5 text-xs text-slate-300/70 w-fit">
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="h-3 w-3 text-slate-300" />
                    </span>
                    <span className="font-medium leading-relaxed">{schoolAddress}</span>
                  </span>
                )}
              </div>
            </div>

            {/* ── Quick Navigation ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400/80">Quick Links</h4>
              <ul className="space-y-2.5">
                {[
                  { icon: <Home className="h-3.5 w-3.5" />, label: 'Dashboard', path: '/admin' },
                  { icon: <School className="h-3.5 w-3.5" />, label: 'Classrooms', path: '/admin/classrooms' },
                  // { icon: <GraduationCap className="h-3.5 w-3.5" />, label: 'Students', path: '/admin/students' },
                  { icon: <Users className="h-3.5 w-3.5" />, label: 'Parents', path: '/admin/parents' },
                  { icon: <FileText className="h-3.5 w-3.5" />, label: 'Forms', path: '/admin/forms' },
                  // { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Due Forms', path: '/admin/forms/due' },
                ].map(item => (
                  <li key={item.path}>
                    <Link to={item.path}
                      className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group">
                      <span className="text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Resources ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400/80">Resources</h4>
              <ul className="space-y-2.5">
                {!isSuperAdmin && (
                  <>
                    <li>
                      <button onClick={() => setShowHelpModal(true)}
                        className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                        <span className="font-medium">Help Center</span>
                      </button>
                    </li>
                    <li>
                      <button onClick={() => setShowGuideModal(true)}
                        className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                        <span className="font-medium">Admin Guide</span>
                      </button>
                    </li>
                  </>
                )}
                {isSuperAdmin && (
                  <li>
                    <button onClick={() => setShowSuperGuideModal(true)}
                      className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                      <span className="font-medium">SuperAdmin Guide</span>
                    </button>
                  </li>
                )}
                <li>
                  <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group">
                    <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                    <span className="font-medium">Goddard School</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              © {new Date().getFullYear()} {schoolName || 'The Goddard School'}. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                {isSuperAdmin ? 'SuperAdmin Portal' : 'Admin Portal'}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <Dialog open={showSuperGuideModal} onOpenChange={setShowSuperGuideModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-500" /> SuperAdmin Guide</DialogTitle>
            <DialogDescription>SuperAdmin-exclusive features, roles, and responsibilities</DialogDescription>
          </DialogHeader>
          <SuperAdminGuideContent />
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" /> Help Center</DialogTitle>
            <DialogDescription>Find answers to common admin questions</DialogDescription>
          </DialogHeader>
          <HelpCenterContent role="admin" />
        </DialogContent>
      </Dialog>

      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" /> Admin Guide</DialogTitle>
            <DialogDescription>Everything you need to manage your school portal</DialogDescription>
          </DialogHeader>
          <AdminGuideContent />
        </DialogContent>
      </Dialog>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl" preventClose>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You'll need to sign in again to access the admin portal.</DialogDescription>
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

// ── Inline guide data ─────────────────────────────────────────────────────────
const guideSections = [
  { id: 'dashboard', icon: <Home className="h-4 w-4 text-blue-600" />, title: 'Dashboard', description: 'High-level overview of your school.', steps: ['View totals for students, classrooms, and forms.', 'Monitor class-wise enrollment progress.', 'Use quick-action cards to navigate instantly.'] },
  { id: 'students', icon: <GraduationCap className="h-4 w-4 text-blue-600" />, title: 'Student Management', description: 'Manage students, forms, and classroom assignments.', steps: ['Search and filter by name, classroom, status, or year.', 'Use the ⋯ menu to Manage Forms, Transfer Class, or Download All Forms.', 'Checkbox-select multiple students for bulk transfers.', 'Toggle Active / Archived status from the status pill.'] },
  { id: 'classrooms', icon: <School className="h-4 w-4 text-blue-600" />, title: 'Classroom Management', description: 'Create and manage classrooms.', steps: ['Create a new classroom using "Add Classroom".', 'Click a classroom to view its students and forms.', 'Assign form templates so all students receive them automatically.'] },
  { id: 'forms', icon: <FileText className="h-4 w-4 text-blue-600" />, title: 'Forms Management', description: 'Create and assign form templates.', steps: ['Add a template with a name, Fillout ID, and optional due date.', 'Assign to the whole school or a specific classroom.', 'Edit or delete templates from the forms list.'] },
  { id: 'due-forms', icon: <Calendar className="h-4 w-4 text-blue-600" />, title: 'Due Forms Tracking', description: 'Monitor form completion and send reminders.', steps: ['Filter by Pending, Pending Approval, Overdue, or Completed.', 'Use Remind to email a parent for a specific form.', 'Bulk Remind sends to all Pending or Overdue at once.', 'Export the view as CSV or PDF.'] },
  { id: 'parents', icon: <Users className="h-4 w-4 text-blue-600" />, title: 'Parent Management', description: 'Invite and manage parent accounts.', steps: ['Invite with "Invite Parent" — sends a signup email.', 'Click a name to view full profile and form statuses.', 'Resend confirmation emails from the actions menu.'] },
  { id: 'downloads', icon: <Download className="h-4 w-4 text-blue-600" />, title: 'Downloading Forms', description: 'Download individual or all forms.', steps: ['Single form: Student Management → ⋯ → download icon.', 'All forms: Student Management → ⋯ → "Download All Forms" (ZIP).'] },
];

const statusGuide = [
  { icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, label: 'Approved', desc: 'Reviewed and approved by admin.' },
  { icon: <Clock className="h-4 w-4 text-blue-600" />, label: 'Pending Approval', desc: 'Parent submitted, awaiting review.' },
  { icon: <Clock className="h-4 w-4 text-amber-500" />, label: 'Pending', desc: 'Assigned but not started by parent.' },
  { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, label: 'Overdue', desc: 'Not completed past due date.' },
  { icon: <Eye className="h-4 w-4 text-slate-400" />, label: 'Draft', desc: 'Started but not submitted.' },
];

function AdminGuideContent() {
  const { schoolPhone, schoolEmail } = useUserContext();
  return (
    <div className="space-y-4 py-1">
      {/* Quick nav */}
      <div className="flex flex-wrap gap-1.5">
        {guideSections.map(s => (
          <a key={s.id} href={`#guide-${s.id}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium">
            {s.icon}<span>{s.title.split(' ')[0]}</span>
          </a>
        ))}
      </div>

      {/* Status legend */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-blue-600" />Form Status Reference</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {statusGuide.map(s => (
              <div key={s.label} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                <div><p className="text-xs font-semibold text-slate-800">{s.label}</p><p className="text-xs text-slate-500">{s.desc}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {guideSections.map(section => (
        <Card key={section.id} id={`guide-${section.id}`} className="scroll-mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">{section.icon}{section.title}</CardTitle>
            <p className="text-xs text-slate-500">{section.description}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-xs text-slate-700">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {(schoolEmail || schoolPhone) && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <Mail className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-800">Need more help?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {schoolEmail && <><a href={`mailto:${schoolEmail}`} className="text-blue-600 hover:underline">{schoolEmail}</a>{' '}</>}
              {schoolPhone && <>or <a href={`tel:${schoolPhone}`} className="text-blue-600 hover:underline">{schoolPhone}</a></>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
