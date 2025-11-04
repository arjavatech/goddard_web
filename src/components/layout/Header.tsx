import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
export function Header() {
  const { userData } = useUserContext();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', {
        replace: true
      });
    } catch (err) {
    }
    setShowLogoutModal(false);
  };
  return <header className="bg-white shadow-sm border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-12 sm:h-16 w-auto" />
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden sm:flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
            {userData?.firstName && userData?.lastName
              ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
              : 'P'}
          </div>
          <span className="text-sm font-medium">
            {userData?.firstName && userData?.lastName
              ? `${userData.firstName} ${userData.lastName}`
              : 'Parent User'}
          </span>
        </div>
        <div className="sm:hidden w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
          {userData?.firstName && userData?.lastName
            ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
            : 'P'}
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Logout</span>
        </button>
      </div>
      
      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You will need to sign in again to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>;
}