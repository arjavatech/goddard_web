import { useState } from 'react';
import { LogOut, User, ChevronDown, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { NotificationBell } from '../notifications/NotificationBell';

export function Header() {
  const { userData, schoolName } = useUserContext();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : 'U';

  const displayName = userData?.firstName && userData?.lastName
    ? `${userData.firstName} ${userData.lastName}`
    : userData?.email || 'User';

  const roleLabel = (() => {
    const role = userData?.role?.toLowerCase();
    if (role === 'employee') return 'Employee';
    if (role === 'admin') return 'Admin';
    return 'Parent';
  })();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.setItem('explicit_logout', 'true');
    signOut().catch(err => console.error('Logout error:', err));
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.05)]">
        {/* Mobile: two-row layout — logo + school name stacked */}
        {schoolName && (
          <div className="sm:hidden flex items-center justify-between px-3 pt-2 pb-1">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-7 w-auto object-contain flex-shrink-0"
            />
            <span className="text-[11px] font-bold text-[#0F2D52] text-center flex-1 px-2 truncate">
              {schoolName}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificationBell enabled={!!userData} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-xl px-1 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 focus:outline-none">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-slate-400">{roleLabel}</p>
                      </div>
                    </div>
                  </div>
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
          </div>
        )}

        {/* Mobile fallback row (no school name): single row with logo + controls */}
        {!schoolName && (
          <div className="sm:hidden flex items-center justify-between px-3 h-14">
            <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-1">
              <NotificationBell enabled={!!userData} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-xl px-1 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 focus:outline-none">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                        <p className="text-xs text-slate-400">{roleLabel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Desktop (sm+): single-row three-column layout */}
        <div className="w-full h-16 hidden sm:flex items-center justify-between gap-2 px-2 sm:px-3 lg:px-4">
          {/* Logo — left */}
          <div className="flex items-center flex-shrink-0">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-11 w-auto object-contain"
            />
          </div>

          {/* School Name — center */}
          {schoolName && (
            <div className="flex-1 flex justify-center px-2">
              <span className="text-sm font-bold text-[#0F2D52] whitespace-nowrap leading-tight">
                {schoolName}
              </span>
            </div>
          )}

          {/* Right side — desktop only */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell enabled={!!userData} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 focus:outline-none">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                    {initials}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-xs text-slate-400">{roleLabel}</p>
                    </div>
                  </div>
                </div>
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
        </div>
      </header>

      {/* Logout confirmation */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl" preventClose>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll need to sign in again to access your {roleLabel.toLowerCase()} dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="w-full sm:w-auto rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto rounded-xl"
            >
              {isLoggingOut ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing out…
                </span>
              ) : (
                'Sign out'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
