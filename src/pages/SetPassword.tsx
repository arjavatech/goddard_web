import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
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
  const location = useLocation();

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

      // Check for access token in URL hash
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (!accessToken) {
        setError('Invalid or missing authentication token. Please check your email and click the invitation link again.');
        return;
      }

      try {
        // Set the session using the tokens from URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          throw sessionError;
        }

        setSessionReady(true);
      } catch (err) {
        console.error('Error setting session:', err);
        setError('Failed to authenticate. Please try clicking the link in your email again.');
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

      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('Error setting password:', err);
      setError((err as Error).message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amazon-teal to-purple-600 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Goddard School! 🎉
            </h1>
            <p className="text-gray-600 mb-6">
              Your password has been set successfully. You can now access your parent portal to manage your child's enrollment and view form assignments.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amazon-teal to-purple-600 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header with Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src="./images/gs_logo_lynnwood.png" alt="Goddard School Logo" className="h-16 sm:h-20 w-auto max-w-full" />
          </div>
        </div>

        <Card className="w-full">
        <CardHeader className="space-y-4">

          {/* Step Indicator */}
          <div className="flex justify-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div className="w-8 h-8 rounded-full bg-amazon-teal text-white flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-semibold">
              3
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-center">
            Set Your Password
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Welcome to Goddard School! Please create a secure password to complete your account setup.
          </p>
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
              <label className="text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Password Requirements:
              </h4>
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    req.valid ? 'text-green-600' : 'text-gray-600'
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
              className="w-full bg-gradient-to-r from-amazon-teal to-purple-600 hover:from-amazon-teal/90 hover:to-purple-600/90"
              disabled={!allRequirementsMet || loading || !sessionReady}
            >
              {loading ? 'Setting Password...' : !sessionReady ? 'Authenticating...' : 'Set Password'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Need help? Contact your school administrator
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
