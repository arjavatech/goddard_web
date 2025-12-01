import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useAuth } from '../services/auth/useAuth';
import { useToast } from '../contexts/ToastContext';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setIsEmailSent(true);
      showToast('success', 'Password reset email sent successfully');
    } catch (err) {
      showToast('error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-16 w-auto" />
            </div>
          </div>
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-lg">Check Your Email</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  We've sent a password reset link to:
                </p>
                <p className="text-sm font-medium text-amazon-teal">{email}</p>
                <p className="text-xs text-muted-foreground">
                  Please check your email and follow the instructions to reset your password.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full bg-amazon-teal hover:bg-amazon-teal/90">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-16 w-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              Forgot Password?
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>
        </div>
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">Reset Password</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amazon-teal hover:bg-amazon-teal/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed py-3"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-amazon-teal hover:text-amazon-teal/80 transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Goddard School. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}