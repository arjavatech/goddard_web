import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { useToast } from '../contexts/ToastContext';
import { httpFetch } from '../services/api/http';
import { supabase } from '../services/auth/authClient';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { showToast('error', 'Please enter your email address'); return; }
    setEmailError('');
    setIsLoading(true);
    try {
      // Check if user exists via Supabase before sending reset email
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false }
        });
        if (error && (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('no user') || error.status === 422 || error.status === 404)) {
          setEmailError('No account found with this email address.');
          setIsLoading(false);
          return;
        }
      }
      await httpFetch({ method: 'POST', url: '/auth/forgot-password', body: { email: email.trim() } });
      setIsEmailSent(true);
      showToast('success', 'Password reset email sent successfully');
    } catch (err) {
      const msg = (err as any)?.message || '';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user') || (err as any)?.status === 404) {
        setEmailError('No account found with this email address.');
      } else {
        showToast('error', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              Reset Your <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Goddard Password</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xs lg:text-sm text-slate-300/90 leading-relaxed"
            >
              Enter your registered email address and we'll send you a secure link to reset your password.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3 pt-2"
          >
            {[
              'Enter your registered email address',
              'Check your inbox for the reset link',
              'Click the link to set a new password',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-400">{step}</span>
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
          {isEmailSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Check your email</h2>
                  <p className="text-xs sm:text-sm text-slate-500">We sent a password reset link to</p>
                  <p className="text-xs sm:text-sm font-semibold text-cyan-700 break-all">{email}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Check your inbox and follow the instructions to reset your password. The link expires in 24 hours.
                  </p>
                </div>
                <Link to="/login">
                  <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] border-none shadow-md shadow-[#0F2D52]/10">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
              <p className="text-center text-[10px] sm:text-xs text-slate-400">
                © {new Date().getFullYear()} The Goddard School. All rights reserved.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="mb-5 space-y-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F2D52]/5 border border-[#0F2D52]/10 text-[#0F2D52] text-[9px] sm:text-[10px] font-bold tracking-wider uppercase w-fit"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Password Recovery
                </motion.div>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Forgot your password?</h2>
                  <p className="text-xs sm:text-sm text-slate-500 leading-normal">Enter your email and we'll send you a reset link.</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-8 space-y-4"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                        className={`w-full pl-11 pr-4 py-2.5 h-11 rounded-xl border text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-4 transition-all duration-200 ${
                          emailError
                            ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                            : 'border-slate-200 focus:border-[#0F2D52] focus:ring-[#0F2D52]/5'
                        }`}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                    {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                  </div>

                  <motion.div
                    whileHover={isValidEmail && !isLoading ? { scale: 1.015 } : {}}
                    whileTap={isValidEmail && !isLoading ? { scale: 0.985 } : {}}
                    className="pt-2"
                  >
                    <Button
                      type="submit"
                      disabled={!isValidEmail || isLoading}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs sm:text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                          Sending…
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </motion.div>
                </form>

                <div className="pt-2 border-t border-slate-100 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 hover:text-[#0F2D52] font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </motion.div>

              <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-6">
                © {new Date().getFullYear()} The Goddard School. All rights reserved.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
