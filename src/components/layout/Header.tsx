import React from 'react';
import { useUserContext } from '../../contexts/UserContext';
export function Header() {
  const { userData } = useUserContext();
  return <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-16 w-auto" />
      </div>
      {/* <nav className="hidden md:flex items-center space-x-8">
        <Button variant="link" className="font-medium text-amazon-teal">
          Dashboard
        </Button>
        <Button variant="link" className="font-medium text-muted-foreground hover:text-foreground">
          Forms
        </Button>
        <Button variant="link" className="font-medium text-muted-foreground hover:text-foreground">
          Documents
        </Button>
        <Button variant="link" className="font-medium text-muted-foreground hover:text-foreground">
          Children
        </Button>
        <Button variant="link" className="font-medium text-muted-foreground hover:text-foreground">
          Messages
        </Button>
       </nav> */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
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
      </div>
    </header>;
}