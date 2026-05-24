import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
 import { Shield, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
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
      if (!supabase) {
        setError('Supabase client is not configured');
        return;
      }

      // Set up auth state change listener to catch any session transitions
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        console.log('Auth state change in SetPassword:', event, session?.user?.email);
        if (session) {
          setSessionReady(true);
          setError('');
        }
      });
      authSubscription = subscription;

      // FIRST: Check if we already have a valid session (handles page reloads/reopens)
      try {
        const { data: existingSession, error: sessionCheckError } = await supabase.auth.getSession();

        if (!sessionCheckError && existingSession?.session) {
          console.log('Existing session found, reusing session for user:', existingSession.session.user?.email);
          if (isMounted) {
            setSessionReady(true);
            return;
          }
        }
      } catch (err) {
        console.log('No existing session, will check URL parameters');
      }

      // SECOND: Try to parse tokens or code from both hash and search query params
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

      // Handle error cases (e.g., expired token from URL)
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

      // If we have an authorization code (PKCE flow), exchange it for a session
      if (code) {
        try {
          console.log('Exchanging authorization code for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.session) {
            console.log('Session established via code exchange for user:', data.session.user?.email);
            if (isMounted) {
              setSessionReady(true);
            }
            return;
          }
        } catch (err) {
          console.error('Code exchange failed:', err);
          if (isMounted) {
            setError('This link has expired or is no longer valid. Please request a new password reset link.');
          }
          return;
        }
      }

      // If we have access and refresh tokens (Implicit flow), establish session manually
      if (accessToken) {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            if (sessionError.message?.includes('expired') ||
                sessionError.message?.includes('invalid') ||
                sessionError.message?.includes('already') ||
                sessionError.status === 401 ||
                sessionError.status === 422) {

              // Fallback check
              const { data: fallbackSession } = await supabase.auth.getSession();
              if (fallbackSession?.session) {
                console.log('Token was already used, but valid session exists. Continuing...');
                if (isMounted) {
                  setSessionReady(true);
                }
                return;
              }

              if (isMounted) {
                setError('This link has expired or has already been used. Please request a new password reset link.');
              }
            } else {
              throw sessionError;
            }
            return;
          }

          if (!data?.session) {
            if (isMounted) {
              setError('Failed to create session. Please try clicking the link in your email again.');
            }
            return;
          }

          console.log('Session established successfully via tokens for user:', data.session.user?.email);
          if (isMounted) {
            setSessionReady(true);
          }
        } catch (err) {
          console.error('Error setting session:', err);
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

      // If no valid session is established and no tokens/code are present in the URL,
      // check getSession once more to be absolutely sure
      const { data: finalSession } = await supabase.auth.getSession();
      if (finalSession?.session) {
        if (isMounted) {
          setSessionReady(true);
        }
      } else {
        if (isMounted) {
          setError('Invalid or missing authentication token. Please check your email and click the invitation link again.');
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
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

      setTimeout(() => {
        navigate('/', { replace: true });
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
              disabled={!allRequirementsMet || loading || !sessionReady || !!error}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Setting Password...
                </div>
              ) : !sessionReady && !error ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Authenticating...
                </div>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact your school administrator
            </p>
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
