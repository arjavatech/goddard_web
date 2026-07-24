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
    : 'P';

  const displayName = userData?.firstName && userData?.lastName
    ? `${userData.firstName} ${userData.lastName}`
    : 'Parent User';

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    signOut().catch(err => console.error('Logout error:', err));
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.05)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo + School Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <img
              src="./images/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-8 sm:h-11 w-auto object-contain flex-shrink-0"
            />
            {schoolName && (
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none hidden sm:block">School</span>
                <span className="text-[11px] sm:text-sm font-bold text-[#0F2D52] truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[240px] md:max-w-[320px] leading-tight">
                  {schoolName}
                </span>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <NotificationBell enabled={!!userData} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-1.5 sm:px-2 py-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 focus:outline-none">
                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm flex-shrink-0">
                    {initials}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] sm:max-w-[140px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 sm:w-60 p-0 rounded-xl border border-slate-100 shadow-xl bg-white overflow-hidden">
                {/* Profile header */}
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-xs text-slate-400">Parent</p>
                    </div>
                  </div>
                </div>
                {/* Logout button */}
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
              You'll need to sign in again to access your parent dashboard.
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
