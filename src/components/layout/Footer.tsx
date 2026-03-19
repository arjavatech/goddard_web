import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer>
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-cyan-600 to-cyan-700 px-6 sm:px-8 py-8">
        <div className="absolute inset-y-0 right-0 w-64 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 256 200" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <circle cx="220" cy="-10" r="120" fill="white" fillOpacity="0.08" />
            <circle cx="256" cy="180" r="90" fill="white" fillOpacity="0.06" />
            <circle cx="140" cy="100" r="60" fill="white" fillOpacity="0.05" />
            <circle cx="210" cy="30" r="3" fill="white" fillOpacity="0.3" />
            <circle cx="235" cy="55" r="2" fill="white" fillOpacity="0.25" />
            <circle cx="245" cy="15" r="4" fill="white" fillOpacity="0.2" />
          </svg>
        </div>
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="bg-white/10 rounded-xl p-3 inline-block">
              <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-sm text-white/80 leading-relaxed">Nurturing children through play-based learning and quality early education.</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Contact Us</h3>
            <ul className="space-y-3">
              <li><a href="tel:+18000000000" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Phone className="h-4 w-4 flex-shrink-0" />+1 (800) 000-0000</a></li>
              <li><a href="mailto:support@goddardschool.com" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Mail className="h-4 w-4 flex-shrink-0" />support@goddardschool.com</a></li>
              <li><a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/90 hover:text-white transition-colors"><Globe className="h-4 w-4 flex-shrink-0" />goddardschool.com</a></li>
              <li className="flex items-start gap-3 text-sm text-white/90"><MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />123 School Lane, Lynnwood, WA 98036</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Resources</h3>
            <ul className="space-y-2.5">
              <li><Link to="/help" className="text-sm text-white/90 hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-cyan-800 px-6 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-1">
        <p className="text-xs text-white/60">© {new Date().getFullYear()} The Goddard School. All rights reserved.</p>
        <p className="text-xs text-white/40 tracking-widest font-medium">PARENT PORTAL</p>
      </div>
    </footer>
  );
}
