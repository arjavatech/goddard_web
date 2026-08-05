import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ShieldOff } from 'lucide-react';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';

export function SchoolNotFound() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoHome = async () => {
    setIsLoading(true);
    await signOut();
    window.location.replace('/');
  };
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">

      {/* ── Left brand panel — mirrors Login layout ── */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#091629] via-[#0F2D52] to-[#1E4B83] p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <img
            src="/images/gs_logo_lynnwood.png"
            alt="The Goddard School"
            className="h-10 w-auto object-contain brightness-0 invert opacity-95"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 space-y-6 my-auto max-w-md mt-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <ShieldOff className="w-7 h-7 text-cyan-300" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              Access <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Restricted</span>
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              This portal is secured and only accessible to authorized users from the correct school location.
            </p>
          </div>
        </motion.div>

        <div className="relative z-10 border-t border-white/10 pt-6 mt-8 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <p className="text-[11px] text-slate-400/60 font-medium">
            © {new Date().getFullYear()} The Goddard School. All rights reserved.
          </p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-slate-300 font-bold tracking-wider uppercase">Registered Education Partner</span>
          </div>
        </div>
      </div>

      {/* ── Right content panel — mirrors Login layout ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:px-8 bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="lg:hidden mb-8 text-center">
          <img src="/images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-10 w-auto mx-auto" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm sm:max-w-md text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F2D52]/5 border border-[#0F2D52]/10 text-[#0F2D52] text-[10px] font-bold tracking-wider uppercase">
            <GraduationCap className="w-3.5 h-3.5" />
            Goddard School Portal
          </div>

          <div className="space-y-2">
            <h1 className="text-7xl sm:text-8xl font-extrabold text-[#0F2D52] leading-none">404</h1>
            <h2 className="text-xl font-semibold text-gray-800 mt-3">Page Not Found</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              This page doesn't exist or you don't have permission to access it.
            </p>
          </div>

          <button
            onClick={handleGoHome}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F2D52] hover:bg-[#1E4B83] text-white text-sm font-semibold rounded-xl transition-colors duration-200 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isLoading ? 'Redirecting...' : 'Go to Login Page'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export function SubdomainGuard() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { userData, schoolSubdomain, isReady } = useUserContext();

  if (authLoading || !isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // userData not yet hydrated for this session — wait
  if (isAuthenticated && !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (schoolSlug !== schoolSubdomain) {
    return <SchoolNotFound />;
  }

  const role = userData?.role?.toLowerCase();

  // Check if trying to access admin routes without admin role
  const isAdminRoute = location.pathname.includes('/admin');
  if (isAdminRoute && role !== 'admin' && role !== 'superadmin') {
    return <Navigate to={`/${schoolSubdomain}/dashboard`} replace />;
  }

  // Check if trying to access employee routes without employee role
  // Use exact segment match to avoid false positives like /admin/employees
  const pathSegments = location.pathname.split('/');
  const isEmployeeRoute = pathSegments.includes('employee');
  if (isEmployeeRoute && !isAdminRoute && role !== 'employee') {
    const fallback = (role === 'admin' || role === 'superadmin')
      ? `/${schoolSubdomain}/admin`
      : `/${schoolSubdomain}/dashboard`;
    return <Navigate to={fallback} replace />;
  }

  // Prevent employee users from accessing parent dashboard
  const isParentDashboard = location.pathname === `/${schoolSubdomain}/dashboard`;
  // if (isParentDashboard && role === 'employee') {
  //   return <Navigate to={`/${schoolSubdomain}/employee/dashboard`} replace />;
  // }

  return <Outlet />;
}
