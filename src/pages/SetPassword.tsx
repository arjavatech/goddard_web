import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
 import { Shield, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabaseClient';

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
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: 'At least 8 characters long', test: (pwd) => pwd.length >= 8, valid: false },
    { label: 'At least one uppercase letter', test: (pwd) => /[A-Z]/.test(pwd), valid: false },
    { label: 'At least one lowercase letter', test: (pwd) => /[a-z]/.test(pwd), valid: false },
    { label: 'At least one number', test: (pwd) => /\d/.test(pwd), valid: false },
    { label: 'Passwords match', test: (pwd, confirm) => pwd === confirm && pwd.length > 0, valid: false }
  ]);

  useEffect(() => {
    const initializeSession = async () => {
      if (!supabase) {
        setError('Supabase client is not configured');
        return;
      }

      // FIRST: Check if we already have a valid session (handles page reloads/reopens)
      try {
        const { data: existingSession, error: sessionCheckError } = await supabase.auth.getSession();

        if (!sessionCheckError && existingSession?.session) {
          console.log('Existing session found, reusing session for user:', existingSession.session.user?.email);
          setSessionReady(true);
          return;
        }
      } catch (err) {
        console.log('No existing session, will create new one from URL tokens');
      }

      // SECOND: Try to create session from URL tokens (first time clicking link)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const errorParam = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      // Handle error cases (e.g., expired token from URL)
      if (errorParam) {
        if (errorParam === 'access_denied' || errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
          setError('This link has expired or is no longer valid. Please request a new password reset link from your school administrator.');
        } else {
          setError(`Authentication error: ${errorDescription || errorParam}. Please contact support.`);
        }
        return;
      }

      if (!accessToken) {
        setError('Invalid or missing authentication token. Please check your email and click the invitation link again.');
        return;
      }

      try {
        // Set the session using the tokens from URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          // Check for token expiration or already-used errors
          if (sessionError.message?.includes('expired') ||
              sessionError.message?.includes('invalid') ||
              sessionError.message?.includes('already') ||
              sessionError.status === 401 ||
              sessionError.status === 422) {

            // Token might have been used already - check if we have a valid session anyway
            const { data: fallbackSession } = await supabase.auth.getSession();
            if (fallbackSession?.session) {
              console.log('Token was already used, but valid session exists. Continuing...');
              setSessionReady(true);
              return;
            }

            setError('This link has expired or has already been used. Please request a new password reset link from your school administrator.');
          } else {
            throw sessionError;
          }
          return;
        }

        // Verify the session was actually created
        if (!data?.session) {
          setError('Failed to create session. Please try clicking the link in your email again.');
          return;
        }

        console.log('Session established successfully for user:', data.session.user?.email);
        setSessionReady(true);
      } catch (err) {
        console.error('Error setting session:', err);
        const errorMessage = (err as Error).message || 'Unknown error';

        // Provide specific error messages for common issues
        if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('already')) {
          setError('This link has expired or has already been used. Please request a new password reset link from your school administrator.');
        } else {
          setError(`Failed to authenticate: ${errorMessage}. Please try clicking the link in your email again.`);
        }
      }
    };

    initializeSession();
  }, []);

  useEffect(() => {
    // Validate password requirements
    const updatedRequirements = requirements.map(req => ({
      ...req,
      valid: req.test(password, confirmPassword)
    }));
    setRequirements(updatedRequirements);
  }, [password, confirmPassword]);

  const allRequirementsMet = requirements.every(req => req.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please ensure all password requirements are met.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not configured');
      }

      // Verify session is still valid before updating password
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError('Your session has expired. Please request a new password reset link from your school administrator.');
        setLoading(false);
        return;
      }

      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        // Check for session expiration during password update
        if (updateError.message?.includes('expired') ||
            updateError.message?.includes('invalid') ||
            updateError.status === 401 ||
            updateError.status === 403) {
          setError('Your session has expired. Please request a new password reset link from your school administrator.');
          setLoading(false);
          return;
        }
        throw updateError;
      }

      // Mark password_set flag in user metadata so backend can track setup completion
      await supabase.auth.updateUser({
        data: { password_set: true }
      });

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('Error setting password:', err);
      const errorMessage = (err as Error).message || 'Failed to set password';

      // Provide user-friendly error messages
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
      <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome to Goddard School! 🎉
            </h1>
            <p className="text-muted-foreground mb-6">
              Your password has been set successfully. You can now access your parent portal to manage your child's enrollment and view form assignments.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="./images/gs_logo_lynnwood.png" alt="Goddard School Logo" className="h-16 sm:h-20 w-auto max-w-full" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Set Your Password
            </h1>
            <p className="text-muted-foreground">
              Welcome to Goddard School! Create a secure password to complete your account setup.
            </p>
          </div>
        </div>

        <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-center">Create Password</CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Setting up your password...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                New Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-2 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-12 py-2 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Password Requirements:
              </h4>
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    req.valid ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  {req.valid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {req.label}
                </div>
              ))}
            </div>

            <Button
              type="submit"
              className="w-full bg-amazon-teal hover:bg-amazon-teal/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!allRequirementsMet || loading || !sessionReady}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Setting Password...
                </div>
              ) : !sessionReady ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Authenticating...
                </div>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact your school administrator
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-center">Didn't receive or link expired? Resend invite</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={resendEmail}
                  onChange={e => { setResendEmail(e.target.value); setResendStatus('idle'); }}
                  className="h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={!resendEmail.trim() || resendLoading}
                  onClick={async () => {
                    if (!supabase) return;
                    setResendLoading(true);
                    setResendStatus('idle');
                    try {
                      const { error } = await supabase.auth.resend({
                        type: 'signup',
                        email: resendEmail.trim()
                      });
                      setResendStatus(error ? 'error' : 'success');
                    } catch {
                      setResendStatus('error');
                    } finally {
                      setResendLoading(false);
                    }
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  Resend
                </Button>
              </div>
              {resendStatus === 'success' && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Invite link sent! Check your inbox.
                </p>
              )}
              {resendStatus === 'error' && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Could not resend. Check the email and try again.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>© 2024 Goddard School. All rights reserved.</p>
      </div>
      </div>
    </div>
  );
}
