import React from 'react';
export function Footer() {
  return <footer className="border-t border-gray-100 mt-12 py-6 text-center text-sm text-muted-foreground">
      <p>© 2025 The Goddard School. All rights reserved.</p>
      <div className="flex justify-center space-x-4 mt-2">
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