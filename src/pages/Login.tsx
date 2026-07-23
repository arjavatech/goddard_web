import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowLeft, GraduationCap, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useAuth } from '../services/auth/useAuth';
import { fetchUserContext } from '../services/api/user';
import { useToast } from '../contexts/ToastContext';
import { AlertModal } from '../components/ui/alert-modal';
import { useAlertModal } from '../hooks/useAlertModal';
import { validateEmail } from '../lib/emailValidation';
import { fetchSchools, getSelectedSchool, setSelectedSchool, School } from '../services/api/schools';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(null);
  const [schoolMismatchError, setSchoolMismatchError] = useState('');
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  const { signInWithPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { alertState, hideAlert } = useAlertModal();

  useEffect(() => {
    const loadSchools = async () => {
      setIsLoadingSchools(true);
      try {
        const fetched = await fetchSchools();
        setSchools(fetched);
        const stored = getSelectedSchool();
        if (stored) {
          setSelectedSchoolState(stored);
        } else if (fetched.length > 0) {
          setSelectedSchoolState(fetched[0]);
        }
      } catch (err) {
        console.error('Failed to load schools:', err);
      } finally {
        setIsLoadingSchools(false);
      }
    };
    loadSchools();
  }, []);

  const handleSchoolChange = (school: School) => {
    setSelectedSchoolState(school);
    setSelectedSchool(school);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) { setShowSchoolSelector(true); return; }
    const err = validateEmail(formData.email);
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    try {
      await signInWithPassword(formData.email, formData.password);
      const userCtx = await fetchUserContext();
      if (userCtx.schoolId && userCtx.schoolId !== selectedSchool.id) {
        await signOut();
        setSchoolMismatchError('Your account is registered to a different school. Please go back and select the correct school.');
        setIsLoading(false);
        return;
      }
      let redirectTo = location.state?.from?.pathname;
      if (!redirectTo) {
        const isAdmin = userCtx.role && ['admin','superadmin'].includes(userCtx.role.toLowerCase());
        redirectTo = isAdmin ? '/admin' : '/dashboard';
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast('error', (err as Error).message, 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email' && emailError) setEmailError('');
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ── Left brand panel (matches select school and signup layouts) ── */}
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
        <div className="relative z-10 space-y-8 my-auto mt-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold tracking-wider uppercase">
              <GraduationCap className="w-3.5 h-3.5" /> Goddard School Portal
            </div>
          </motion.div>

          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
            >
              Welcome Back to <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">The Goddard Portal</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-sm text-slate-300/90 leading-relaxed max-w-sm"
            >
              Sign in to manage enrollment forms, upload physical documentation, track milestones, and stay integrated with our school administrators.
            </motion.p>
          </div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3.5 max-w-sm pt-2"
          >
            {[
              { text: 'Verify, sign, and submit documents securely', icon: ShieldCheck, color: 'text-cyan-400' },
              { text: 'Monitor assignment statuses and school updates', icon: Sparkles, color: 'text-amber-400' },
              { text: 'Automated milestone and learning progress logs', icon: CheckCircle2, color: 'text-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-200/90 font-medium">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                </span>
                {item.text}
              </div>
            ))}
          </motion.div>
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

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] auth-panel-right">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-12 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-md">
          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F2D52] mb-6 transition-colors font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to school selection
          </button>

          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h2>
            <p className="text-sm text-slate-500 leading-normal">Enter your credentials to access your account.</p>
          </div>

          {/* Selected school chip */}
          {selectedSchool && (
            <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-[#EFF5FB] border border-[#EFF5FB]/85 mb-6 shadow-sm shadow-[#0D2644]/5">
              <div className="w-7 h-7 rounded-md bg-[#0F2D52] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Goddard location</p>
                <p className="text-xs font-bold text-[#0f2d52] truncate mt-0.5">{selectedSchool.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSchoolSelector(true)}
                className="text-xs font-bold text-[#1a6fc4] hover:text-[#0f2d52] underline transition-colors pr-1"
              >
                Change
              </button>
            </div>
          )}

          {/* Form card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-8 sm:p-10 space-y-5"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-11 pr-4 py-3 h-12 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200 ${
                      emailError 
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' 
                        : 'border-slate-200'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-11 py-3 h-12 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Custom Remember Me Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                      formData.rememberMe 
                        ? 'bg-[#0F2D52] border-[#0F2D52] shadow-sm shadow-[#0F2D52]/20' 
                        : 'border-slate-200 bg-white group-hover:border-slate-300'
                    }`}>
                      {formData.rememberMe && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 font-semibold leading-none">Remember me</span>
                </label>
              </div>

              {/* School mismatch */}
              {schoolMismatchError && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 space-y-1">
                  <p className="text-xs text-red-700 leading-normal">{schoolMismatchError}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-xs font-bold text-red-700 underline hover:text-red-800"
                  >
                    Go back and select correct school
                  </button>
                </div>
              )}

              {/* Submit */}
              <motion.div
                whileHover={!isLoading ? { scale: 1.015 } : {}}
                whileTap={!isLoading ? { scale: 0.985 } : {}}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] active:scale-[0.98] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>

              {/* Divider */}
              {/* <div className="relative my-2 py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3.5 text-xs text-slate-400 font-medium">New to Goddard School?</span>
                </div>
              </div> */}

              {/* <Link to="/signup" className="block w-full">
                <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  Create Account
                </Button>
              </Link> */}
            </form>
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
        </div>
      </div>

      <AlertModal open={alertState.open} onClose={hideAlert} type={alertState.type} title={alertState.title} message={alertState.message} />

      {/* School Selector Modal */}
      <Dialog open={showSchoolSelector} onOpenChange={setShowSchoolSelector}>
        <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-[#0F2D52]" />
              Select School
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Choose the Goddard School location you want to access</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            {isLoadingSchools ? (
              <div className="flex justify-center py-8">
                <span className="h-8 w-8 rounded-full border-2 border-[#0F2D52] border-t-transparent animate-spin" />
              </div>
            ) : (
              schools.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSchoolChange(school)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-semibold ${
                    selectedSchool?.id === school.id
                      ? 'border-[#0F2D52]/30 bg-[#EFF5FB] text-[#0F2D52]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {school.name}
                  {school.subdomain && <span className="block text-xs font-normal text-slate-400 mt-0.5">{school.subdomain}</span>}
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
            <Button variant="outline" className="h-10 rounded-xl px-4 text-xs font-semibold" onClick={() => setShowSchoolSelector(false)}>Cancel</Button>
            <Button className="h-10 rounded-xl px-4 text-xs font-semibold bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white hover:from-[#091629] hover:to-[#0F2D52] border-none" onClick={() => setShowSchoolSelector(false)}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
