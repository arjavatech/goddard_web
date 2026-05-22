import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
export function Header() {
  const { userData } = useUserContext();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    // Clear all stored data to reset tokens, auth state, and user data completely
    localStorage.clear();
    sessionStorage.clear();
    
    // Sign out in background (don't await)
    signOut().catch(err => console.error('Logout error during Header sign out:', err));
    
    // Immediately redirect - don't wait for signOut
    window.location.href = '/';
  };
  return <header className="bg-white shadow-sm border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-12 sm:h-16 w-auto" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {userData?.firstName && userData?.lastName
                ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
                : 'P'}
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
                    : 'Parent User'}
                </p>
                <p className="text-xs text-gray-500">Parent</p>
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
      
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent preventClose>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="w-full sm:w-auto">
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging...
                </>
              ) : (
                'Logout'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>;
}