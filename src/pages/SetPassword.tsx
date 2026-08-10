import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, CheckCircle, XCircle, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { supabase } from '../services/auth/authClient';

interface PasswordRequirement {
  label: string;
  test: (password: string, confirmPassword?: string) => boolean;
  valid: boolean;
}

export function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters long', test: (pwd) => pwd.length >= 8, valid: false },
    { label: 'At least one uppercase letter', test: (pwd) => /[A-Z]/.test(pwd), valid: false },
    { label: 'At least one lowercase letter', test: (pwd) => /[a-z]/.test(pwd), valid: false },
    { label: 'At least one number', test: (pwd) => /\d/.test(pwd), valid: false },
    { label: 'Passwords match', test: (pwd, confirm) => pwd === confirm && pwd.length > 0, valid: false }
  ]);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initializeSession = async () => {
      if (!supabase) { setError('Supabase client is not configured'); return; }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        if (session) { setSessionReady(true); setTokenValidated(true); setError(''); }
      });
      authSubscription = subscription;

      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession?.session) {
        if (isMounted) { setSessionReady(true); setTokenValidated(true); setError(''); }
        return;
      }

      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(search);

      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      const code = hashParams.get('code') || searchParams.get('code');
      const errorParam = hashParams.get('error') || searchParams.get('error');
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

      if (errorParam) {
        if (isMounted) {
          if (errorParam === 'access_denied' || errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            setError('This link has expired or is no longer valid. Please request a new password reset link.');
          } else {
            setError(`Authentication error: ${errorDescription || errorParam}. Please contact support.`);
          }
        }
        return;
      }

      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.session && isMounted) { setSessionReady(true); setTokenValidated(true); return; }
        } catch {
          if (isMounted) setError('This link has expired or is no longer valid. Please request a new password reset link.');
          return;
        }
      }

      if (accessToken) {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid') ||
                sessionError.message?.includes('already') || sessionError.status === 401 || sessionError.status === 422) {
              const { data: fallbackSession } = await supabase.auth.getSession();
              if (fallbackSession?.session) {
                if (isMounted) { setSessionReady(true); setTokenValidated(true); return; }
              }
              if (isMounted) setError('This link has expired or has already been used. Please request a new password reset link.');
            } else throw sessionError;
            return;
          }

          if (!data?.session) {
            if (isMounted) setError('Failed to create session. Please try clicking the link in your email again.');
            return;
          }
          if (isMounted) { setSessionReady(true); setTokenValidated(true); }
        } catch (err) {
          const errorMessage = (err as Error).message || 'Unknown error';
          if (isMounted) {
            if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('already')) {
              setError('This link has expired or has already been used. Please request a new password reset link.');
            } else {
              setError(`Failed to authenticate: ${errorMessage}. Please try clicking the link in your email again.`);
            }
          }
        }
        return;
      }

      // No token/code in URL and no existing session
      if (isMounted) setError('Invalid or missing authentication token. Please check your email and click the invitation link again.');
    };

    initializeSession();
    return () => { isMounted = false; if (authSubscription) authSubscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setRequirements(prev => prev.map(req => ({ ...req, valid: req.test(password, confirmPassword) })));
  }, [password, confirmPassword]);

  const allRequirementsMet = requirements.every(req => req.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allRequirementsMet) { setError('Please ensure all password requirements are met.'); return; }
    setLoading(true);

    try {
      if (!supabase) throw new Error('Supabase client is not configured');

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError('Your session has expired. Please request a new password reset link from your school administrator.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (updateError.message?.includes('expired') || updateError.message?.includes('invalid') ||
            updateError.status === 401 || updateError.status === 403) {
          setError('Your session has expired. Please request a new password reset link from your school administrator.');
          setLoading(false);
          return;
        }
        throw updateError;
      }

      await supabase.auth.updateUser({ data: { password_set: true } });
      sessionStorage.removeItem('first_login_reset_pending');
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to set password';
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setError('Your session has expired. Please request a new password reset link from your school administrator.');
      } else {
        setError(`${errorMessage}. Please try again or contact support.`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm sm:max-w-md space-y-5"
        >
          <div className="text-center">
            <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-9 sm:h-12 w-auto mx-auto" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-9 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Welcome to Goddard School! 🎉</h2>
              <p className="text-xs sm:text-sm text-slate-500">Your password has been set successfully. You can now access your parent portal.</p>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">Redirecting to login...</p>
          </div>
          <p className="text-center text-[10px] sm:text-xs text-slate-400">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#091629] via-[#0F2D52] to-[#1E4B83] p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain brightness-0 invert opacity-95" />
        </motion.div>

        <div className="relative z-10 space-y-8 my-auto max-w-md mt-8">
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
            >
              Secure Your <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Goddard Account</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xs lg:text-sm text-slate-300/90 leading-relaxed"
            >
              Create a strong password to protect your account and access your school portal securely.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3 pt-2"
          >
            {requirements.map((req, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors duration-200 ${
                req.valid
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                {req.valid
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                }
                <span className={`text-xs ${req.valid ? 'text-emerald-300' : 'text-slate-400'}`}>{req.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-6 mt-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <p className="text-[11px] text-slate-400/60 font-medium">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-slate-300 font-bold tracking-wider uppercase">Registered Education Partner</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:px-8 sm:py-12 md:px-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
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
              <Shield className="w-3.5 h-3.5" /> Account Setup
            </motion.div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Set your password</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-normal">Create a secure password to complete your account setup.</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-8 space-y-4"
          >
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs sm:text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-11 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200"
                    required
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Confirm your password"
                    className="w-full pl-11 pr-11 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password requirements (mobile only) */}
              <div className="lg:hidden space-y-1.5 pt-1">
                {requirements.map((req, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${req.valid ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {req.valid ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                    {req.label}
                  </div>
                ))}
              </div>

              <motion.div
                whileHover={!loading && allRequirementsMet ? { scale: 1.015 } : {}}
                whileTap={!loading && allRequirementsMet ? { scale: 0.985 } : {}}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={!allRequirementsMet || loading || !tokenValidated}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Setting Password…
                    </span>
                  ) : !tokenValidated && !error ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Authenticating…
                    </span>
                  ) : (
                    'Set Password'
                  )}
                </Button>
              </motion.div>
            </form>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] sm:text-xs text-slate-400">
                Need help? Contact your school administrator
              </p>
            </div>
          </motion.div>

          <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
