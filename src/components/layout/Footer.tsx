import { useState } from 'react';
import { Phone, Mail, Globe, HelpCircle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HelpCenterContent } from '../HelpCenterContent';
import { ParentGuideContent } from '../ParentGuideContent';
import { useUserContext } from '../../contexts/UserContext';

export function Footer() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { schoolName, schoolPhone, schoolEmail, schoolAddress, userData } = useUserContext();

  return (
    <footer className="w-full bg-[#1a3a5c]">
      {/* Main content grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <img
              src="/gs_logo_lynnwood.png"
              alt="The Goddard School"
              className="h-9 w-auto object-contain brightness-0 invert opacity-90"
            />
            <p className="text-sm text-slate-300/70 leading-relaxed max-w-sm">
              Quality early childhood education through play-based learning — nurturing curious, confident, and creative kids since 1988.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {schoolPhone && (
                <a href={`tel:${schoolPhone}`}
                  className="inline-flex items-center gap-2.5 text-xs text-slate-300/70 hover:text-white transition-colors group w-fit">
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0">
                    <Phone className="h-3 w-3 text-slate-300" />
                  </span>
                  <span className="font-medium">{schoolPhone}</span>
                </a>
              )}
              {schoolEmail && (
                <a href={`mailto:${schoolEmail}`}
                  className="inline-flex items-center gap-2.5 text-xs text-slate-300/70 hover:text-white transition-colors group w-fit">
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors flex-shrink-0">
                    <Mail className="h-3 w-3 text-slate-300" />
                  </span>
                  <span className="font-medium">{schoolEmail}</span>
                </a>
              )}
              {schoolAddress && (
                <span className="inline-flex items-start gap-2.5 text-xs text-slate-300/70 w-fit">
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="h-3 w-3 text-slate-300" />
                  </span>
                  <span className="font-medium leading-relaxed">{schoolAddress}</span>
                </span>
              )}
            </div>
          </div>

          {/* Spacer for structure grid */}
          <div className="hidden lg:block" />

          {/* Resources column */}
          <div className="space-y-4 min-w-[200px]">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400/80">Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => setShowHelpModal(true)} className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                  <span className="font-medium">Help Center</span>
                </button>
              </li>
              <li>
                <button onClick={() => setShowGuideModal(true)} className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                  <span className="font-medium">Parent Guide</span>
                </button>
              </li>
              <li>
                <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group">
                  <Globe className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                  <span className="font-medium">Goddard School</span>
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-[#16314f]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            © {new Date().getFullYear()} {schoolName || 'The Goddard School'}. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              {userData?.role === 'Employee' ? 'Employee Portal' : 'Parent Portal'}
            </span>
          </div>
        </div>
      </div>

      {/* Parent Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0F2D52]" />
              Parent Guide
            </DialogTitle>
            <DialogDescription>Everything you need to complete your child's enrollment</DialogDescription>
          </DialogHeader>
          <ParentGuideContent />
        </DialogContent>
      </Dialog>

      {/* Help Center Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#0F2D52]" />
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
