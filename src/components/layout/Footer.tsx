import React from 'react';
export function Footer() {
  return <footer className="border-t border-gray-100 mt-6 sm:mt-12 py-4 sm:py-6 px-4 text-center text-xs sm:text-sm text-muted-foreground">
      <p className="mb-2 sm:mb-0">© 2025 The Goddard School. All rights reserved.</p>
      <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2">
        <a href="#" className="hover:text-amazon-teal transition-colors">
          Privacy Policy
        </a>
        <a href="#" className="hover:text-amazon-teal transition-colors">
          Terms of Service
        </a>
        <a href="#" className="hover:text-amazon-teal transition-colors">
          Help Center
        </a>
      </div>
    </footer>;
}