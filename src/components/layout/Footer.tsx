import { useState } from 'react';
import { Phone, Mail, Globe, MapPin, HelpCircle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HelpCenterContent } from '../HelpCenterContent';
import { ParentGuideContent } from '../ParentGuideContent';

export function Footer() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <footer className="relative bg-amazon-teal">
      {/* Top orange accent line */}
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-5 sm:gap-6 pb-4 sm:pb-5 border-b border-white/20">

          {/* Brand */}
          <div className="sm:col-span-1 lg:col-span-5 flex flex-col gap-3">
            <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-7 w-auto object-contain brightness-0 invert opacity-90 self-start" />
            <p className="text-xs text-white/70 leading-relaxed max-w-xs hidden sm:block">
              Nurturing children through play-based learning and quality early childhood education in Lynnwood, WA.
            </p>
            <div className="flex items-center gap-2">
              <a href="tel:+18000000000" aria-label="Call us"
                className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                <Phone className="h-3.5 w-3.5" />
              </a>
              <a href="mailto:support@goddardschool.com" aria-label="Email us"
                className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                <Mail className="h-3.5 w-3.5" />
              </a>
              <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" aria-label="Website"
                className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                <Globe className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="sm:col-span-1 lg:col-span-4 flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">Contact</p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
              <li>
                <a href="tel:+18000000000" className="flex items-center gap-2 text-xs text-white/80 hover:text-white transition-colors">
                  <Phone className="h-3 w-3 text-white/60 shrink-0" />
                  +1 (800) 000-0000
                </a>
              </li>
              <li>
                <a href="mailto:support@goddardschool.com" className="flex items-center gap-2 text-xs text-white/80 hover:text-white transition-colors">
                  <Mail className="h-3 w-3 text-white/60 shrink-0" />
                  <span className="truncate">support@goddardschool.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-xs text-white/80">
                <MapPin className="h-3 w-3 text-white/60 shrink-0 mt-0.5" />
                <span>123 School Lane, Lynnwood, WA 98036</span>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">Resources</p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
              <li>
                <button onClick={() => setShowHelpModal(true)} className="text-xs text-white/80 hover:text-white transition-colors text-left">
                  Help Center
                </button>
              </li>
              <li>
                <button onClick={() => setShowGuideModal(true)} className="text-xs text-white/80 hover:text-white transition-colors text-left">
                  Parent Guide
                </button>
              </li>
              <li>
                <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" className="text-xs text-white/80 hover:text-white transition-colors">
                  Goddard School
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs text-white/50 text-center sm:text-left">© {new Date().getFullYear()} The Goddard School — Lynnwood. All rights reserved.</p>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/20 bg-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-amazon-orange" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">Parent Portal</span>
          </div>
        </div>
      </div>

      {/* Parent Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amazon-teal" />
              Parent Guide
            </DialogTitle>
            <DialogDescription>Everything you need to complete your child's enrollment</DialogDescription>
          </DialogHeader>
          <ParentGuideContent />
        </DialogContent>
      </Dialog>

      {/* Help Center Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amazon-teal" />
              Help Center
            </DialogTitle>
            <DialogDescription>Find answers to common questions about your enrollment</DialogDescription>
          </DialogHeader>
          <HelpCenterContent role="parent" />
        </DialogContent>
      </Dialog>
    </footer>
  );
}
