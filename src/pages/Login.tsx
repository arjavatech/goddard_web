import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useAuth } from '../services/auth/useAuth';
import { fetchUserContext } from '../services/api/user';
import { useToast } from '../contexts/ToastContext';
import { AlertModal } from '../components/ui/alert-modal';
import { useAlertModal } from '../hooks/useAlertModal';
import { validateEmail } from '../lib/emailValidation';
import { fetchSchools, getSelectedSchool, setSelectedSchool, School } from '../services/api/schools';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(null);
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const {
    signInWithPassword,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { alertState, hideAlert } = useAlertModal();

  // Load schools on mount
  useEffect(() => {
    const loadSchools = async () => {
      setIsLoadingSchools(true);
      try {
        const fetchedSchools = await fetchSchools();
        setSchools(fetchedSchools);
        const storedSchool = getSelectedSchool();
        if (storedSchool) {
          setSelectedSchoolState(storedSchool);
        } else if (fetchedSchools.length > 0) {
          setSelectedSchoolState(fetchedSchools[0]);
        }
      } catch (error) {
        console.error('Failed to load schools:', error);
      } finally {
        setIsLoadingSchools(false);
      }
    };
    loadSchools();
  }, []);

  const handleSchoolChange = (school: School) => {
    setSelectedSchoolState(school);
    setSelectedSchool(school);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if school is selected
    if (!selectedSchool) {
      setShowSchoolSelector(true);
      return;
    }
    
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setEmailError(emailError);
      return;
    }
    
    setIsLoading(true);
    try {
      // First, sign in with password
      await signInWithPassword(formData.email, formData.password);

      // Fetch user context to get the user's school_id
      const userContext = await fetchUserContext();
      const userSchoolId = userContext.school_id || userContext.schoolId;

      // Validate that the selected school matches the user's school_id
      if (userSchoolId && userSchoolId !== selectedSchool.id) {
        // School ID doesn't match - sign out and show error
        await signOut();
        showToast('error', `Your account is registered to a different school. Please select the correct school.`, 'School Mismatch');
        setShowSchoolSelector(true);
        setIsLoading(false);
        return;
      }

      let redirectTo = location.state?.from?.pathname;

      // If no specific redirect path, use role-based default
      if (!redirectTo) {
        // Check role case-insensitively (API returns 'Admin' or 'SuperAdmin')
        const isAdmin = userContext.role && (userContext.role.toLowerCase() === 'admin' || userContext.role.toLowerCase() === 'superadmin');
        redirectTo = isAdmin ? '/admin' : '/dashboard';
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
    
    // Clear email error when user starts typing
    if (name === 'email' && emailError) {
      setEmailError('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  return <div className="min-h-screen bg-gradient-to-br from-amazon-teal/5 via-background to-amazon-orange/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src="./images/gs_logo_lynnwood.png" alt="App Logo" className="h-16 w-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              Welcome Back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>
        </div>
        {/* Login Form */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} className={`w-full pl-10 pr-4 py-3 border rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all text-sm ${emailError ? 'border-red-500' : 'border-input'}`} placeholder="Enter your email" />
                </div>
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
              </div>
              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-10 py-3 border border-input rounded-md bg-background/50 backdrop-blur-xs focus:outline-none focus:ring-2 focus:ring-amazon-teal focus:border-transparent transition-all text-sm" placeholder="Enter your password" />
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
              <Button type="submit" disabled={isLoading} className="w-full bg-amazon-teal hover:bg-amazon-teal/90 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed py-3">
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

      {/* School Selector Modal */}
      <Dialog open={showSchoolSelector} onOpenChange={setShowSchoolSelector}>
        <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amazon-teal" />
              Select School
            </DialogTitle>
            <DialogDescription>Choose the Goddard School location you want to view</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingSchools ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {schools.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSchoolChange(school)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                      selectedSchool?.id === school.id
                        ? 'border-amazon-teal bg-amazon-teal/10'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{school.name}</div>
                    {school.subdomain && (
                      <div className="text-xs text-gray-500 mt-1">Subdomain: {school.subdomain}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSchoolSelector(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSchoolSelector(false)}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}