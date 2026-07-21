import { useState } from 'react';
import { Phone, Mail, Globe, MapPin, HelpCircle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HelpCenterContent } from '../HelpCenterContent';
import { ParentGuideContent } from '../ParentGuideContent';
import { useUserContext } from '../../contexts/UserContext';

export function Footer() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const { schoolName, schoolPhone, schoolEmail, schoolAddress } = useUserContext();

  return (
    <footer className="w-full bg-white border-t border-slate-200">
      {/* Main content grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10 flex flex-col md:flex-row justify-start items-start gap-16 lg:gap-32">
        {/* Brand */}
        <div className="space-y-4 max-w-md">
          <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain" />
          <p className="text-sm text-slate-500 leading-relaxed">
            Quality early childhood education through play-based learning — nurturing curious, confident, and creative kids since 1988.
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            {schoolPhone && (
              <a href={`tel:${schoolPhone}`} title={schoolPhone}
                className="w-9 h-9 rounded-xl bg-white hover:bg-[#0F2D52] hover:text-white flex items-center justify-center text-slate-500 transition-all border border-slate-200 hover:border-[#0F2D52] shadow-xs">
                <Phone className="h-4 w-4" />
              </a>
            )}
            {schoolEmail && (
              <a href={`mailto:${schoolEmail}`} title={schoolEmail}
                className="w-9 h-9 rounded-xl bg-white hover:bg-[#0F2D52] hover:text-white flex items-center justify-center text-slate-500 transition-all border border-slate-200 hover:border-[#0F2D52] shadow-xs">
                <Mail className="h-4 w-4" />
              </a>
            )}
            <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#0F2D52] hover:text-white flex items-center justify-center text-slate-500 transition-all border border-slate-200 hover:border-[#0F2D52] shadow-xs">
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-4 min-w-[200px]">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#0F2D52]">Resources</h4>
          <ul className="space-y-3">
            <li>
              <button onClick={() => setShowHelpModal(true)} className="flex items-center gap-2.5 text-sm font-medium text-slate-600 hover:text-[#0F2D52] transition-colors group w-full text-left">
                <HelpCircle className="h-4 w-4 text-slate-400 group-hover:text-[#0F2D52] transition-colors" />
                <span>Help Center</span>
              </button>
            </li>
            <li>
              <button onClick={() => setShowGuideModal(true)} className="flex items-center gap-2.5 text-sm font-medium text-slate-600 hover:text-[#0F2D52] transition-colors group w-full text-left">
                <BookOpen className="h-4 w-4 text-slate-400 group-hover:text-[#0F2D52] transition-colors" />
                <span>Parent Guide</span>
              </button>
            </li>
            <li>
              <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm font-medium text-slate-600 hover:text-[#0F2D52] transition-colors group">
                <Globe className="h-4 w-4 text-slate-400 group-hover:text-[#0F2D52] transition-colors" />
                <span>Goddard School</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-100 bg-[#F7F9FC]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            © {new Date().getFullYear()} {schoolName || 'The Goddard School'}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Parent Portal</span>
          </div>
        </div>
      </div>

      {/* Parent Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
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
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto no-scrollbar">
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
