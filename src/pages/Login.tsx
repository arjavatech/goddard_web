import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useAuth } from '../services/auth/useAuth';
import { prefilloutProvision } from '../services/api/fillout';
import { fetchUserContext } from '../services/api/user';
import { useToast } from '../contexts/ToastContext';
import { AlertModal } from '../components/ui/alert-modal';
import { useAlertModal } from '../hooks/useAlertModal';
import { validateEmail } from '../lib/emailValidation';


export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signInWithPassword, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { alertState, hideAlert } = useAlertModal();

  useEffect(() => {
    if (localStorage.getItem('session_invalidated') === 'true') {
      showToast('error', 'Your account has been logged out because it was signed in from another device.', 'Session Ended');
      localStorage.removeItem('session_invalidated');
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(formData.email);
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    try {
      await signInWithPassword(formData.email, formData.password);
      // Keep the established dev-branch behavior: load the fresh profile
      // directly after Supabase confirms the password login, then redirect.
      const userData = await fetchUserContext();
      prefilloutProvision(userData).catch(() => {/* non-blocking */});

      const userSubdomain = userData.schoolData?.subdomain || 'goddard';
      const isAdmin = userData.role && ['admin', 'superadmin'].includes(userData.role.toLowerCase());

      let redirectTo = location.state?.from?.pathname;

      // Discard any "from" path that belongs to a different school's subdomain
      if (redirectTo) {
        const fromSubdomain = redirectTo.split('/').filter(Boolean)[0];
        if (fromSubdomain !== userSubdomain) {
          redirectTo = null;
        }
      }

      if (!redirectTo || redirectTo === '/dashboard' || redirectTo === '/admin' || redirectTo === '/') {
        redirectTo = isAdmin ? `/${userSubdomain}/admin` : `/${userSubdomain}/dashboard`;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast('error', (err as Error).message, 'Login Failed');
      setIsLoading(false);
    }
    // Note: setIsLoading(false) is intentionally omitted from finally — the
    // spinner stays visible until the redirect completes, giving a seamless UX.
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

        {/* Logo Header */}
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

        {/* Centre copy (Balanced typographic visual layout) */}
        <div className="relative z-10 space-y-8 my-auto max-w-md mt-8">
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
            >
              Welcome Back to <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">The Goddard Portal</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xs lg:text-sm text-slate-300/90 leading-relaxed"
            >
              Access your school portal to manage classrooms, complete forms, track student progress, and stay connected through a secure, unified platform.
            </motion.p>
          </div>

          {/* Premium UI/UX Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="grid grid-cols-1 gap-4 pt-2"
          >
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors duration-300">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-semibold text-white">Smart Form Management</h3>
                <p className="text-[11px] lg:text-xs text-slate-300/80 mt-0.5 leading-relaxed">Create, complete, and manage enrollment and school forms with a simple, streamlined workflow.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors duration-300">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs lg:text-sm font-semibold text-white">Student & Classroom Insights</h3>
                <p className="text-[11px] lg:text-xs text-slate-300/80 mt-0.5 leading-relaxed">Monitor student progress, manage classrooms, and access important school information from one place.</p>
              </div>
            </div>
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:px-8 sm:py-12 md:px-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] auth-panel-right">
        {/* Mobile logo */}
        <div className="lg:hidden mb-6 text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-5 space-y-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F2D52]/5 border border-[#0F2D52]/10 text-[#0F2D52] text-[9px] sm:text-[10px] font-bold tracking-wider uppercase w-fit"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#0F2D52]" /> Goddard School Portal
            </motion.div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sign in</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-normal">Enter your credentials to access your account.</p>
            </div>
          </div>

          {/* Form card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-8 space-y-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                    className={`w-full pl-11 pr-4 py-2.5 h-11 rounded-xl border text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200 ${
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
                  <label htmlFor="password" className="block text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-[11px] sm:text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold transition-colors">
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
                    className="w-full pl-11 pr-11 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200"
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
                  <span className="text-[11px] sm:text-xs text-slate-600 font-semibold leading-none">Remember me</span>
                </label>
              </div>

              {/* Submit */}
              <motion.div
                whileHover={!isLoading ? { scale: 1.015 } : {}}
                whileTap={!isLoading ? { scale: 0.985 } : {}}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] active:scale-[0.98] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
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
              {/* <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] sm:text-xs text-slate-400 font-medium">or continue with</span>
                </div>
              </div> */}

              {/* Google Sign In */}
              {/* <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <button
                  type="button"
                  disabled={isGoogleLoading || isLoading}
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    try { await signInWithProvider('google'); }
                    catch (err) { showToast('error', (err as Error).message, 'Google Sign-In Failed'); }
                    finally { setIsGoogleLoading(false); }
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                >
                  {isGoogleLoading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Sign in with Google
                </button>
              </motion.div> */}
            </form>
          </motion.div>

          <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
        </div>
      </div>

      <AlertModal open={alertState.open} onClose={hideAlert} type={alertState.type} title={alertState.title} message={alertState.message} />


    </div>
  );
}
