import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, CheckCircle, XCircle, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { supabase } from '../services/auth/authClient';
import { activateAccount } from '../services/api/auth';
import { fetchUserContext } from '../services/api/user';
import { useUserContext } from '../contexts/UserContext';
import { prefilloutProvision } from '../services/api/fillout';
import { useAuth } from '../services/auth/useAuth';

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('pending_oauth') === 'google'
  );
  const [error, setError] = useState('');
  const [alreadyActivated, setAlreadyActivated] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated, signOut, authGeneration } = useAuth();
  const { seedUserData } = useUserContext();

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

      // If this page loaded as the Google OAuth callback, let useAuth handle the
      // exchange — skip invite-token processing to avoid false "already activated" flash.
      if (sessionStorage.getItem('pending_oauth') === 'google') return;

      // Already authenticated (custom JWT present) with no fresh invite token in the URL —
      // this link has already been used. Show the blocking screen instead of calling
      // setSession() which would fire SIGNED_OUT and clear the JWT.
      // If a fresh code/access_token IS present (new invite), fall through to normal processing.
      if (!authLoading && isAuthenticated) {
        const sp = new URLSearchParams(window.location.search);
        const hp = new URLSearchParams(window.location.hash.substring(1));
        const hasFreshToken = sp.has('code') || hp.has('code') ||
                              sp.has('access_token') || hp.has('access_token');
        if (!hasFreshToken) {
          if (isMounted) setAlreadyActivated(true);
          return;
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        // session establishment handled in main async flow below
      });
      authSubscription = subscription;

      const checkAlreadyActivated = async (): Promise<boolean> => {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return false;
        const passwordSet = user.user_metadata?.password_set === true;
        return passwordSet;
      };

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

      // If the URL contains a fresh invite token, process it directly — do NOT check the
      // existing Supabase session first, because that session may belong to a different
      // user (e.g. an admin still logged in on the same browser), which would cause a
      // false "already set up" flash and redirect to login.
      if (!accessToken && !code && !errorParam) {
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          if (await checkAlreadyActivated()) {
            if (isMounted) { setAlreadyActivated(true); }
            return;
          }
          if (isMounted) { setSessionReady(true); setTokenValidated(true); setError(''); }
          return;
        }
      }

      if (errorParam) {
        if (isMounted) {
          if (errorParam === 'access_denied' || errorParam === 'invitation_already_used' ||
              errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            setAlreadyActivated(true);
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
          if (data?.session) {
            if (await checkAlreadyActivated()) {
              if (isMounted) { setAlreadyActivated(true); }
              return;
            }
            if (isMounted) { setSessionReady(true); setTokenValidated(true); }
            return;
          }
        } catch {
          if (isMounted) setAlreadyActivated(true);
          return;
        }
      }

      if (accessToken) {
        try {
          // Mark this as an intentional session swap so the global SIGNED_OUT handler
          // doesn't show the "Signed Out for Security" toast on the login page.
          sessionStorage.setItem('invite_session_swap', 'true');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid') ||
                sessionError.message?.includes('already') || sessionError.status === 401 || sessionError.status === 422) {
              const { data: fallbackSession } = await supabase.auth.getSession();
              if (fallbackSession?.session) {
                if (await checkAlreadyActivated()) {
                  if (isMounted) { setAlreadyActivated(true); }
                  return;
                }
                if (isMounted) { setSessionReady(true); setTokenValidated(true); return; }
              }
              if (isMounted) setAlreadyActivated(true);
            } else throw sessionError;
            return;
          }

          if (!data?.session) {
            if (isMounted) setError('Failed to create session. Please try clicking the link in your email again.');
            return;
          }
          if (await checkAlreadyActivated()) {
            if (isMounted) { setAlreadyActivated(true); }
            return;
          }
          if (isMounted) { setSessionReady(true); setTokenValidated(true); }
        } catch (err) {
          const errorMessage = (err as Error).message || 'Unknown error';
          if (isMounted) {
            if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('already')) {
              setAlreadyActivated(true);
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

  // After Google OAuth redirects back here and exchange succeeds, navigate directly to user page.
  // Mirrors Login.tsx oauth_just_succeeded effect exactly.
  useEffect(() => {
    if (!authLoading && isAuthenticated && sessionStorage.getItem('oauth_just_succeeded')) {
      sessionStorage.removeItem('oauth_just_succeeded');
      setIsOAuthCallback(false);
      setIsRedirecting(true);
      (async () => {
        try {
          const userData = await fetchUserContext();
          seedUserData(userData);
          prefilloutProvision(userData).catch(() => {});
          const sub = userData.schoolData?.subdomain || 'goddard';
          const role = userData.role?.toLowerCase();
          const path = role === 'admin' || role === 'superadmin'
            ? `/${sub}/admin`
            : role === 'employee'
            ? `/${sub}/employee/dashboard`
            : `/${sub}/dashboard`;
          navigate(path, { replace: true });
        } catch (err) {
          setIsRedirecting(false);
          setIsOAuthCallback(false);
          await signOut();
          setError((err as Error).message || 'Sign-in failed. Please try again.');
        }
      })();
    }
  }, [authLoading, isAuthenticated, authGeneration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show exchange failure errors dispatched by useAuth when already on this page.
  // Mirrors Login.tsx showGoogleAuthError effect.
  useEffect(() => {
    const showGoogleError = () => {
      const msg = sessionStorage.getItem('google_auth_error');
      if (!msg) return;
      setIsOAuthCallback(false);
      setIsRedirecting(false);
      setError(msg);
      sessionStorage.removeItem('google_auth_error');
    };
    showGoogleError();
    window.addEventListener('goddard:google-auth-error', showGoogleError);
    return () => window.removeEventListener('goddard:google-auth-error', showGoogleError);
  }, []);

  const allRequirementsMet = requirements.every(req => req.valid);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        setError('Session expired. Please refresh the page and try again.');
        setIsGoogleLoading(false);
        return;
      }
      await activateAccount(session.access_token);
      await supabase!.auth.updateUser({ data: { password_set: true } });
      sessionStorage.setItem('pending_oauth', 'google');
      await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/set-password`,
          queryParams: { prompt: 'select_account' }
        }
      });
    } catch (err) {
      sessionStorage.removeItem('pending_oauth');
      setError((err as Error).message || 'Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

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

  if (alreadyActivated) {
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
                Welcome Back to <br />
                <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Goddard School</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-xs lg:text-sm text-slate-300/90 leading-relaxed"
              >
                Your account is already set up and ready to use. Sign in to access your school portal.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-3 pt-2"
            >
              {[
                'Access your parent portal anytime',
                'View forms, documents and notifications',
                'Stay connected with your school',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10">
                  <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300">{item}</span>
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

        {/* ── Right content panel ── */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:px-8 sm:py-12 md:px-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="lg:hidden mb-6 text-center">
            <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto mx-auto" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm sm:max-w-md space-y-5"
          >
            <div className="mb-5 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F2D52]/5 border border-[#0F2D52]/10 text-[#0F2D52] text-[9px] sm:text-[10px] font-bold tracking-wider uppercase w-fit">
                <Shield className="w-3.5 h-3.5" /> Account Status
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Invitation Link No Longer Valid</h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-normal">This invitation link has already been used or has expired.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-blue-500" />
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 text-center">
                If you've already set up your account, sign in below. Otherwise, please contact your administrator for a new invitation.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] transition-all duration-300 shadow-md shadow-[#0F2D52]/10"
              >
                Go to Sign In
              </button>
            </div>

            <p className="text-center text-[10px] sm:text-xs text-slate-400">
              © {new Date().getFullYear()} The Goddard School. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

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
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] transition-all duration-300 shadow-md shadow-[#0F2D52]/10"
            >
              Sign In
            </button>
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

            {(tokenValidated || !error) && (
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
                    disabled={loading || !tokenValidated}
                    className="w-full pl-11 pr-11 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                    disabled={loading || !tokenValidated}
                    className="w-full pl-11 pr-11 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
            )}

            {sessionReady && tokenValidated && !error && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] sm:text-xs text-slate-400 font-medium">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                    <button
                      type="button"
                      disabled={isGoogleLoading || loading}
                      onClick={handleGoogleSignIn}
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
                      Sign in with Google instead
                    </button>
                  </motion.div>
                  <p className="text-center text-[10px] sm:text-xs text-slate-400">
                    If you sign in with Google, no password is needed.
                  </p>
                </div>
              </>
            )}

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

      {(isOAuthCallback || isRedirecting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <span className="h-6 w-6 block rounded-full border-2 border-slate-200 border-t-[#0F2D52] animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
