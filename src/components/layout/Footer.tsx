import { useState } from 'react';
import { Phone, Mail, Globe, HelpCircle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { HelpCenterContent } from '../HelpCenterContent';
import { ParentGuideContent } from '../ParentGuideContent';
import { EmployeeGuideContent } from '../EmployeeGuideContent';
import { useUserContext } from '../../contexts/UserContext';

export function Footer() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showEmployeeGuideModal, setShowEmployeeGuideModal] = useState(false);
  const { schoolName, schoolPhone, schoolEmail, schoolAddress, userData } = useUserContext();

  const isEmployee = userData?.role?.toLowerCase() === 'employee';

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
              {isEmployee
                ? 'Supporting our dedicated staff with the tools and documentation needed to deliver exceptional early childhood education.'
                : 'Quality early childhood education through play-based learning — nurturing curious, confident, and creative kids since 1988.'}
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
                {isEmployee ? (
                  <button onClick={() => setShowEmployeeGuideModal(true)} className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                    <span className="font-medium">Employee Guide</span>
                  </button>
                ) : (
                  <button onClick={() => setShowGuideModal(true)} className="flex items-center gap-2.5 text-sm text-slate-300/70 hover:text-white transition-colors group w-full text-left">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-300 transition-colors flex-shrink-0" />
                    <span className="font-medium">Parent Guide</span>
                  </button>
                )}
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

      {/* Employee Guide Modal */}
      <Dialog open={showEmployeeGuideModal} onOpenChange={setShowEmployeeGuideModal}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-lg no-scrollbar">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3 p-1 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">Employee Guide</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Everything you need to complete your assigned forms</p>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3">
            <EmployeeGuideContent />
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <Button variant="outline" onClick={() => setShowEmployeeGuideModal(false)} className="h-9 px-4 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] transition-all duration-200">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parent Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-lg no-scrollbar">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3 p-1 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">Parent Guide</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Everything you need to complete your child's enrollment</p>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3">
            <ParentGuideContent />
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <Button variant="outline" onClick={() => setShowGuideModal(false)} className="h-9 px-4 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] transition-all duration-200">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Center Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-lg no-scrollbar">
          <DialogHeader className="pb-0">
            <div className="flex items-center gap-3 p-1 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">Help Center</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Find answers to common questions about your enrollment</p>
              </div>
            </div>
          </DialogHeader>
          <div className="py-3">
            <HelpCenterContent role="parent" />
          </div>
          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <Button variant="outline" onClick={() => setShowHelpModal(false)} className="h-9 px-4 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] transition-all duration-200">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
