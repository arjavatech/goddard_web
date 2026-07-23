import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Eye, EyeOff, GraduationCap, School as SchoolIcon, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="relative group">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none group-focus-within:text-[#0F2D52] transition-colors duration-200" />
      )}
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} ${rightSlot ? 'pr-11' : 'pr-4'} py-3 h-12 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#0F2D52] focus:ring-4 focus:ring-[#0F2D52]/5 transition-all duration-200`}
        placeholder={placeholder}
      />
      {rightSlot && <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">{rightSlot}</div>}
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

  // Retrieve selected school information to customize the form header
  const selectedSchoolRaw = localStorage.getItem('selectedSchool');
  const selectedSchool = selectedSchoolRaw ? JSON.parse(selectedSchoolRaw) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('error', 'Please make sure both password fields match.', 'Passwords do not match');
      return;
    }
    const schoolId = selectedSchool ? selectedSchool.id : null;
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ── Left brand panel (matches SelectSchool) ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#091629] via-[#0F2D52] to-[#1E4B83] p-12 xl:p-16 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Decorative dynamic glows */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px]" />

        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto object-contain brightness-0 invert opacity-95" />
        </motion.div>

        {/* Centre copy */}
        <div className="relative z-10 space-y-8 my-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
              <GraduationCap className="w-4.5 h-4.5 text-cyan-300" />
            </div>
            <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">Create Account</span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight"
            >
              Join the Goddard <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Parent Community</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-sm text-slate-300/90 leading-relaxed max-w-sm"
            >
              Create your parent account to securely complete and manage enrollment packets, upload physical records, and stay connected with classroom coordinators.
            </motion.p>
          </div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3.5 max-w-sm pt-2"
          >
            {[
              { text: 'Verify, sign, and submit documents securely', icon: ShieldCheck, color: 'text-cyan-400' },
              { text: 'Direct messaging channel with teachers & staff', icon: Sparkles, color: 'text-amber-400' },
              { text: 'Automated milestone and learning progress logs', icon: CheckCircle2, color: 'text-emerald-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-200/90 font-medium">
                <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                </span>
                {item.text}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer info */}
        <p className="relative z-10 text-[11px] text-slate-400/60">
          © {new Date().getFullYear()} The Goddard School. All rights reserved. Registered education partner.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <img src="./images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-12 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-lg">
          <div className="mb-6 space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
            <p className="text-sm text-slate-500 leading-normal">Fill in your details to get started with Goddard.</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-8 sm:p-10"
          >
            {/* Displaying selected school context */}
            {selectedSchool && (
              <div className="mb-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#EFF5FB] border border-[#EFF5FB]/80">
                <div className="w-6 h-6 rounded-md bg-[#0F2D52] flex items-center justify-center flex-shrink-0">
                  <SchoolIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-[#0F2D52] truncate">
                  School: <strong className="font-bold">{selectedSchool.name}</strong> {selectedSchool.location ? `(${selectedSchool.location})` : ''}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">First Name</label>
                  <FieldInput id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" icon={User} required />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Name</label>
                  <FieldInput id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" required />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <FieldInput id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" icon={Mail} required />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <FieldInput id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" icon={Phone} required />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
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
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
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

              {/* Custom styled Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      required
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 ${
                      formData.agreeToTerms 
                        ? 'bg-[#0F2D52] border-[#0F2D52] shadow-sm shadow-[#0F2D52]/20' 
                        : 'border-slate-200 bg-white group-hover:border-slate-300'
                    }`}>
                      {formData.agreeToTerms && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I agree to the{' '}
                    <Link to="/terms" className="text-[#1a6fc4] hover:underline font-semibold">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-[#1a6fc4] hover:underline font-semibold">Privacy Policy</Link>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <motion.div
                whileHover={formData.agreeToTerms ? { scale: 1.015 } : {}}
                whileTap={formData.agreeToTerms ? { scale: 0.985 } : {}}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={!formData.agreeToTerms}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-sm font-bold hover:from-[#091629] hover:to-[#0F2D52] active:scale-[0.98] border-none shadow-md shadow-[#0F2D52]/10 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                >
                  Create Account
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="relative my-2 py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3.5 text-xs text-slate-400 font-medium">Already have an account?</span>
                </div>
              </div>

              <Link to="/login" className="block w-full">
                <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  Sign In
                </Button>
              </Link>
            </form>
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
        </div>
      </div>

      <AlertModal open={alertState.open} onClose={hideAlert} type={alertState.type} title={alertState.title} message={alertState.message} />
    </div>
  );
}
