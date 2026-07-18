import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/button';
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
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<School | null>(null);
  const [schoolMismatchError, setSchoolMismatchError] = useState('');
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  const { signInWithPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { alertState, hideAlert } = useAlertModal();

  useEffect(() => {
    const loadSchools = async () => {
      setIsLoadingSchools(true);
      try {
        const fetched = await fetchSchools();
        setSchools(fetched);
        const stored = getSelectedSchool();
        if (stored) {
          setSelectedSchoolState(stored);
        } else if (fetched.length > 0) {
          setSelectedSchoolState(fetched[0]);
        }
      } catch (err) {
        console.error('Failed to load schools:', err);
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
    if (!selectedSchool) { setShowSchoolSelector(true); return; }
    const err = validateEmail(formData.email);
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    try {
      await signInWithPassword(formData.email, formData.password);
      const userCtx = await fetchUserContext();
      if (userCtx.schoolId && userCtx.schoolId !== selectedSchool.id) {
        await signOut();
        setSchoolMismatchError('Your account is registered to a different school. Please go back and select the correct school.');
        setIsLoading(false);
        return;
      }
      let redirectTo = location.state?.from?.pathname;
      if (!redirectTo) {
        const isAdmin = userCtx.role && ['admin','superadmin'].includes(userCtx.role.toLowerCase());
        redirectTo = isAdmin ? '/admin' : '/dashboard';
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      showToast('error', (err as Error).message, 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email' && emailError) setEmailError('');
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between bg-gradient-to-br from-[#0B1F3A] via-[#0F2D52] to-[#0E3A68] p-10 xl:p-14 overflow-hidden auth-panel-left">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-10 -left-16 w-72 h-72 rounded-full bg-white/5" />

        <div className="relative z-10">
          <img
            src="./images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-10 w-auto object-contain brightness-0 invert opacity-90"
          />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-200" />
            </div>
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Welcome back,<br />let's get started
          </h1>
          <p className="text-sm xl:text-base text-slate-300/80 leading-relaxed max-w-sm">
            Sign in to manage enrollment forms, track your child's progress, and stay connected with your school.
          </p>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500">
          © {new Date().getFullYear()} The Goddard School. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50/60 auth-panel-right">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-12 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-md">
          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to school selection
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your credentials to access your account.</p>
          </div>

          {/* Selected school chip */}
          {selectedSchool && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#EFF5FB] border border-blue-200/50 mb-6">
              <Building2 className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
              <p className="text-sm font-semibold text-[#0F2D52] truncate">{selectedSchool.name}</p>
            </div>
          )}

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all ${emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : 'border-slate-200'}`}
                    placeholder="you@example.com"
                  />
                </div>
                {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-widest">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-medium transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                   className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-slate-300 text-[#0F2D52] focus:ring-[#0F2D52]/20 accent-[#0F2D52]"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>

              {/* School mismatch */}
              {schoolMismatchError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{schoolMismatchError}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="mt-1 text-xs font-semibold text-red-700 underline hover:text-red-800"
                  >
                    Go back and select correct school
                  </button>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-sm font-semibold rounded-xl"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Goddard School. All rights reserved.
          </p>
        </div>
      </div>

      <AlertModal open={alertState.open} onClose={hideAlert} type={alertState.type} title={alertState.title} message={alertState.message} />

      {/* School Selector Modal */}
      <Dialog open={showSchoolSelector} onOpenChange={setShowSchoolSelector}>
        <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0F2D52]" />
              Select School
            </DialogTitle>
            <DialogDescription>Choose the Goddard School location you want to access</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            {isLoadingSchools ? (
              <div className="flex justify-center py-8">
                <span className="h-8 w-8 rounded-full border-2 border-[#0F2D52] border-t-transparent animate-spin" />
              </div>
            ) : (
              schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => handleSchoolChange(school)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    selectedSchool?.id === school.id
                      ? 'border-[#0F2D52]/30 bg-[#EFF5FB] text-[#0F2D52]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {school.name}
                  {school.subdomain && <span className="block text-xs font-normal text-slate-400 mt-0.5">{school.subdomain}</span>}
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowSchoolSelector(false)}>Cancel</Button>
            <Button onClick={() => setShowSchoolSelector(false)}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
