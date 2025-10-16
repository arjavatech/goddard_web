import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useAuth } from '../services/auth/useAuth';
import { fetchUserContext } from '../services/api/user';
import { useToast } from '../contexts/ToastContext';
import { AlertModal } from '../components/ui/alert-modal';
import { useAlertModal } from '../hooks/useAlertModal';
export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const {
    signInWithPassword
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { alertState, showAlert, hideAlert } = useAlertModal();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithPassword(formData.email, formData.password);

      // Fetch user context to determine role-based redirect
      const userContext = await fetchUserContext();

      let redirectTo = location.state?.from?.pathname;

      // If no specific redirect path, use role-based default
      if (!redirectTo) {
        // Check role case-insensitively (API returns 'Admin' with capital A)
        const isAdmin = userContext.role && userContext.role.toLowerCase() === 'admin';
        redirectTo = isAdmin ? '/admin' : '/';
      }

      navigate(redirectTo, {
        replace: true
      });
    } catch (err) {
      showToast('error', (err as Error).message, 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  return <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-16 sm:h-20 w-auto max-w-full" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your parent portal
            </p>
          </div>
        </div>
        {/* Login Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all" placeholder="Enter your email" />
                </div>
              </div>
              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-12 py-2 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all" placeholder="Enter your password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} className="w-4 h-4 text-amazon-teal border-input rounded focus:ring-amazon-teal focus:ring-2" />
                  <span className="text-sm text-foreground">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-amazon-teal hover:text-amazon-teal/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              {/* Sign In Button */}
              <Button type="submit" disabled={isLoading} className="w-full bg-amazon-teal hover:bg-amazon-teal/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">
                    Don't have an account?
                  </span>
                </div>
              </div>
              {/* Test Toast Notifications */}
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center mb-2">Test Toast Notifications:</p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => showToast('error', 'Invalid email or password. Please try again.', 'Login Failed')}
                    className="flex-1 text-xs border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Toast Error
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => showToast('success', 'Welcome back! You have successfully signed in.', 'Login Successful')}
                    className="flex-1 text-xs border-green-300 text-green-600 hover:bg-green-50"
                  >
                    Toast Success
                  </Button>
                </div>
              </div>

              {/* Test Alert Modals */}
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground text-center mb-2">Test Alert Modals:</p>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => showAlert('error', 'Your session has expired. Please log in again to continue.', 'Session Expired')}
                    className="flex-1 text-xs border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Modal Error
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => showAlert('success', 'Your account has been successfully verified and is now active.', 'Account Verified')}
                    className="flex-1 text-xs border-green-300 text-green-600 hover:bg-green-50"
                  >
                    Modal Success
                  </Button>
                </div>
              </div>

              {/* Sign Up Link */}
              <Link to="/signup">
                <Button type="button" variant="outline" className="w-full border-amazon-teal text-amazon-teal hover:bg-amazon-teal/5">
                  Create Account
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2024 Goddard School. All rights reserved.</p>
        </div>
      </div>
      
      {/* Alert Modal */}
      <AlertModal
        open={alertState.open}
        onClose={hideAlert}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
      />
    </div>;
}