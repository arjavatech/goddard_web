import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../services/auth/useAuth';
import { useToast } from '../contexts/ToastContext';
import { AlertModal } from '../components/ui/alert-modal';
import { useAlertModal } from '../hooks/useAlertModal';

function FieldInput({
  id, name, type = 'text', value, onChange, placeholder, icon: Icon, required = false, rightSlot,
}: {
  id: string; name: string; type?: string; value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder: string;
  icon?: React.ElementType; required?: boolean; rightSlot?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />}
      <input
        id={id} name={name} type={type} required={required} value={value} onChange={onChange}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} ${rightSlot ? 'pr-11' : 'pr-4'} py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all`}
        placeholder={placeholder}
      />
      {rightSlot && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  );
}

export function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', agreeToTerms: false,
  });
  const { signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { alertState, hideAlert } = useAlertModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('error', 'Please make sure both password fields match.', 'Passwords do not match');
      return;
    }
    const selectedSchool = localStorage.getItem('selectedSchool');
    const schoolId = selectedSchool ? JSON.parse(selectedSchool).id : null;
    if (!schoolId) {
      showToast('error', 'Please select a school first.', 'School Required');
      navigate('/');
      return;
    }
    try {
      const result = await signUpWithPassword(formData.email, formData.password, formData.firstName, formData.lastName, schoolId, 'Admin');
      if (result?.needsConfirmation) {
        showToast('success', 'Please check your email and click the confirmation link to complete registration.', 'Account Created');
        navigate('/login', { replace: true });
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      showToast('error', (err as Error).message, 'Registration Failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between bg-gradient-to-br from-[#0B1F3A] via-[#0F2D52] to-[#0E3A68] p-10 xl:p-14 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-10 -left-16 w-72 h-72 rounded-full bg-cyan-500/10" />
        <div className="relative z-10">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain brightness-0 invert opacity-90" />
        </div>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-cyan-300" />
            </div>
            <span className="text-xs font-semibold tracking-widest text-cyan-400/80 uppercase">Create Account</span>
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Join the Goddard<br />parent community
          </h1>
          <p className="text-sm text-slate-300/80 leading-relaxed max-w-sm">
            Create your account to manage enrollment forms and stay connected with your child's school.
          </p>
        </div>
        <p className="relative z-10 text-[11px] text-slate-500">© {new Date().getFullYear()} The Goddard School. All rights reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-slate-50/60">
        <div className="lg:hidden mb-8 text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-12 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-sm text-slate-500 mt-1">Fill in your details to get started.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">First Name</label>
                  <FieldInput id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" icon={User} required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Last Name</label>
                  <FieldInput id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" required />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Email Address</label>
                <FieldInput id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" icon={Mail} required />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Phone Number</label>
                <FieldInput id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" icon={Phone} required />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Password</label>
                <FieldInput
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange} placeholder="Create a password" icon={Lock} required
                  rightSlot={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Confirm Password</label>
                <FieldInput
                  id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" icon={Lock} required
                  rightSlot={
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms}
                  onChange={handleChange} required
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 flex-shrink-0"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-cyan-600 hover:underline font-medium">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-cyan-600 hover:underline font-medium">Privacy Policy</Link>
                </span>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                disabled={!formData.agreeToTerms}
                className="w-full h-12 rounded-xl bg-[#0891b2] hover:bg-[#0e7490] text-white text-sm font-semibold"
              >
                Create Account
              </Button>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">Already have an account?</span>
                </div>
              </div>

              <Link to="/login">
                <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-50">
                  Sign In
                </Button>
              </Link>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Goddard School. All rights reserved.
          </p>
        </div>
      </div>

      <AlertModal open={alertState.open} onClose={hideAlert} type={alertState.type} title={alertState.title} message={alertState.message} />
    </div>
  );
}
