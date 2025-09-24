import React from 'react';
import { Bell, User, Shield } from 'lucide-react';
import { Button } from '../ui/button';

export function Header() {
  return <header className="bg-white shadow-sm border-b border-gray-100 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-12 w-auto" />
      </div>
      <nav className="hidden md:flex items-center space-x-8">
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
      </nav>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="relative hover:bg-gray-50">
          <Bell size={20} className="two-tone-icon" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-amazon-orange rounded-full"></span>
        </Button>
        <Button variant="ghost" size="icon" className="hover:bg-gray-50">
          <User size={20} className="two-tone-icon" />
        </Button>
      </div>
    </header>;
}
