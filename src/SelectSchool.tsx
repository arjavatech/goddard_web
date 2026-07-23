import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, School as SchoolIcon, MapPin, ArrowRight, GraduationCap, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchSchools, type School } from '@/services/api/schools';

const SelectSchool = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedSchool, setSelectedSchoolLocal] = useState<School | null>(null);
  
  // Track dropdown open states for visual changes on trigger borders
  const [stateOpen, setStateOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);

  const states = ['Washington'];

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const data = await fetchSchools();
        setSchools(data);
      } catch (err) {
        console.error('Failed to load schools:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSchools();
  }, []);

  const handleSchoolSelect = (school: School) => {
    setSelectedSchoolLocal(school);
    localStorage.setItem('selectedSchool', JSON.stringify(school));
  };

  const handleContinue = () => {
    if (selectedSchool) navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ── Left panel (brand with premium design elements) ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#091629] via-[#0F2D52] to-[#1E4B83] p-12 xl:p-16 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Decorative dynamic glows */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px]" />

        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <img
            src="./images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-10 w-auto object-contain brightness-0 invert opacity-95"
          />
        </motion.div>

        {/* Centre copy */}
        <div className="relative z-10 space-y-6 my-auto mt-8">
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold tracking-wider uppercase"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Goddard School Portal
            </motion.div>
            
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
              >
                Nurturing Play-Based <br />
                <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Learning Since 1988</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-sm xl:text-base text-slate-300/90 leading-relaxed max-w-md"
              >
                Join the portal to securely manage your child's enrollment forms, track their curriculum milestones, and stay integrated with our school administrators.
              </motion.p>
            </div>
          </div>

          {/* Feature bullets - high fidelity cards */}
          <motion.ul 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.15, delayChildren: 0.4 }
              }
            }}
            className="space-y-4 max-w-md"
          >
            {[
              { text: 'Manage enrollment forms online & securely sign updates', desc: 'No paper, completely digital.', icon: ShieldCheck, iconColor: 'text-cyan-400' },
              { text: 'Real-time updates on schedules and milestones', desc: 'Stay updated on daily lessons.', icon: Sparkles, iconColor: 'text-amber-400' },
              { text: 'Dedicated support center for parents', desc: 'Reach our staff instantly.', icon: CheckCircle2, iconColor: 'text-emerald-400' },
            ].map((item, i) => (
              <motion.li 
                key={i} 
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
                className="flex items-start gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200"
              >
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center`}>
                  <item.icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{item.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>

        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 border-t border-white/10 pt-6 mt-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <p className="text-[11px] text-slate-400/60 font-medium">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-slate-300 font-bold tracking-wider uppercase">
              Registered Education Partner
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel (form with updated, clean card system) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <img
            src="./images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-12 w-auto mx-auto mb-3"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-8 sm:p-10 space-y-8"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select your school</h2>
            <p className="text-sm text-slate-500 leading-normal">
              Select your state and school location to access your child's enrollment documentation.
            </p>
          </div>

          <div className="space-y-6">
            {/* State dropdown */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                State
              </label>
              <DropdownMenu onOpenChange={setStateOpen}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`w-full flex items-center justify-between h-12 px-4 rounded-xl border bg-white text-sm font-medium text-slate-700 focus:outline-none transition-all duration-200 outline-none ${
                      stateOpen 
                        ? 'border-[#0F2D52] ring-4 ring-[#0F2D52]/5 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <MapPin className={`h-4.5 w-4.5 transition-colors ${stateOpen ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                      {selectedState || <span className="text-slate-400 font-normal">Select State</span>}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${stateOpen ? 'rotate-180 text-slate-600' : ''}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-100 shadow-xl bg-white p-1 animate-scale-in">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
                    Select State
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  {states.map((state) => (
                    <DropdownMenuItem
                      key={state}
                      onClick={() => setSelectedState(state)}
                      className="rounded-lg cursor-pointer py-2.5 px-3 text-sm font-medium text-slate-700 hover:bg-[#EFF5FB] hover:text-[#0F2D52] focus:bg-[#EFF5FB] focus:text-[#0F2D52] transition-colors"
                    >
                      <MapPin className="mr-2.5 h-4 w-4 text-slate-400" />
                      {state}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* School dropdown */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                School Location
              </label>
              <DropdownMenu onOpenChange={setSchoolOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`w-full flex items-center justify-between h-12 px-4 rounded-xl border bg-white text-sm font-medium text-slate-700 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:bg-slate-50/50 disabled:cursor-not-allowed outline-none ${
                      schoolOpen 
                        ? 'border-[#0F2D52] ring-4 ring-[#0F2D52]/5 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                    disabled={!selectedState}
                  >
                    <span className="flex items-center gap-2.5">
                      <SchoolIcon className={`h-4.5 w-4.5 transition-colors ${schoolOpen ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                      {selectedSchool ? (
                        <span className="text-slate-900 font-semibold">{selectedSchool.name}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">Select location</span>
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${schoolOpen ? 'rotate-180 text-slate-600' : ''}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-100 shadow-xl bg-white p-1 max-h-64 overflow-y-auto animate-scale-in">
                  <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
                    Available Locations
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-50" />
                  {loading ? (
                    <DropdownMenuItem disabled className="py-4 text-slate-400 flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-[#0F2D52] border-t-transparent animate-spin" />
                      <span className="text-sm">Loading schools…</span>
                    </DropdownMenuItem>
                  ) : schools.length > 0 ? (
                    schools.map((school) => (
                      <DropdownMenuItem
                        key={school.id}
                        onClick={() => handleSchoolSelect(school)}
                        className="rounded-lg cursor-pointer py-2.5 px-3 hover:bg-[#EFF5FB] hover:text-[#0F2D52] focus:bg-[#EFF5FB] focus:text-[#0F2D52] transition-colors"
                      >
                        <SchoolIcon className="mr-2.5 h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{school.name}</div>
                          {school.location && (
                            <div className="text-xs text-slate-400 mt-0.5">{school.location}</div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled className="py-3 text-sm text-slate-400 text-center">
                      No schools available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Selected school confirmation chip */}
            <AnimatePresence mode="wait">
              {selectedSchool && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-[#EFF5FB] border border-[#EFF5FB]/80"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0F2D52] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#0F2D52]/20">
                    <SchoolIcon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Selected school</p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{selectedSchool.name}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue Button */}
            <motion.div
              whileHover={selectedSchool ? { scale: 1.015 } : {}}
              whileTap={selectedSchool ? { scale: 0.985 } : {}}
              className="pt-2"
            >
              <Button
                onClick={handleContinue}
                disabled={!selectedSchool}
                className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white hover:from-[#091629] hover:to-[#0F2D52] active:scale-[0.98] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
              >
                Continue to Sign In
                <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {!loading && schools.length === 0 && (
              <p className="text-center text-xs text-slate-400">No school listings found at this moment.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SelectSchool;
