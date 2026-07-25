import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useToast } from '../contexts/ToastContext';
import { httpFetch } from '../services/api/http';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { showToast('error', 'Please enter your email address'); return; }

    setIsLoading(true);
    try {
      await httpFetch({ method: 'POST', url: '/auth/forgot-password', body: { email: email.trim() } });
      setIsEmailSent(true);
      showToast('success', 'Password reset email sent successfully');
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/60 px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md space-y-5 sm:space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-9 sm:h-12 w-auto mx-auto" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-9">
          {isEmailSent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4 sm:space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Check your email</h2>
                <p className="text-xs sm:text-sm text-slate-500">We sent a password reset link to</p>
                <p className="text-xs sm:text-sm font-semibold text-cyan-700 break-all">{email}</p>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                  Check your inbox and follow the instructions to reset your password. The link expires in 24 hours.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full h-10 sm:h-11 rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs sm:text-sm font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-5 sm:mb-6 space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Forgot your password?</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 h-11 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 sm:h-11 rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white text-xs sm:text-sm font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-[11px] sm:text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[10px] sm:text-xs text-slate-400">
          © {new Date().getFullYear()} Goddard School. All rights reserved.
        </p>
      </div>
    </div>
  );
}
