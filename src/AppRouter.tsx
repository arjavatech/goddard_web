import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { App } from './App';
import SelectSchool from './SelectSchool';

import { UserProvider, useUserContext } from './contexts/UserContext';
import { AuthProvider } from './services/auth/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { AuthErrorBoundary } from './components/AuthErrorBoundary';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { SetPassword } from './pages/SetPassword';
import { ResetPassword } from './pages/ResetPassword';
import { ForgotPassword } from './pages/ForgotPassword';
// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClassroomManagement } from './pages/admin/ClassroomManagement';
import { ClassroomDetails } from './pages/admin/ClassroomDetails';
import { FormsManagement } from './pages/admin/FormsManagement';
import { ClassroomFormAssignment } from './pages/admin/ClassroomFormAssignment';
import { ParentManagement } from './pages/admin/ParentManagement';
import { ParentDetails } from './pages/admin/ParentDetails';
import { StudentManagement } from './pages/admin/StudentManagement';
import { DueForms } from './pages/admin/StudentDueForms';
import { FormsPendingApproval } from './pages/admin/FormsPendingApproval';
import { FormView } from './pages/admin/FormView';
import { HelpCenter } from './pages/admin/HelpCenter';
import { ParentHelpCenter } from './pages/ParentHelpCenter';
import { ParentFormView } from './pages/ParentFormView';
import { CSVUploadPage as AdminCSVUploadPage } from './pages/admin/CSVUploadPage';
import { NotFound } from './pages/NotFound';
// SuperAdmin pages
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { SchoolManagement } from './pages/superadmin/SchoolManagement';
import { UserManagement } from './pages/superadmin/UserManagement';
import { SubscriptionManagement } from './pages/superadmin/SubscriptionManagement';
// Admin Management
import { AdminManagement } from './pages/superadmin/AdminManagement';
import { SuperAdminManagement } from './pages/superadmin/SuperAdminManagement';
import { ClientManagement } from './pages/superadmin/ClientManagement';
import { CSVUploadPage as SuperAdminCSVUploadPage } from './pages/superadmin/CSVUploadPage';
import ProtectedRoute from './routes/security/ProtectedRoute';
import { SubdomainGuard } from './routes/security/SubdomainGuard';

// Employee pages
import { EmployeeManagement } from './pages/employee/EmployeeManagement';
import { EmployeeDetails } from './pages/employee/EmployeeDetails';
import { EmployeeFormsManagement } from './pages/employee/EmployeeFormsManagement';
import { EmployeeDueForms } from './pages/employee/EmployeeDueForms';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeFormView } from './pages/employee/EmployeeFormView';
import { ProfilePage } from './pages/ProfilePage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function NavigateToAdmin() {
  const { schoolSubdomain, loading } = useUserContext();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F2D52]"></div>
      </div>
    );
  }
  
  const targetPath = location.pathname.replace(/^\/admin/, `/${schoolSubdomain || 'goddard'}/admin`);
  return <Navigate to={targetPath} replace state={location.state} />;
}

export function AppRouter() {
  return <AuthErrorBoundary>
      <AuthProvider>
        <UserProvider>
          <NotificationsProvider>
          <ToastProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute>
                  <App />
                </ProtectedRoute>} />
            <Route element={<SubdomainGuard />}>
              <Route path="/:schoolSlug/dashboard" element={<App />} />
              <Route path="/:schoolSlug/dashboard/form/:formId" element={<ParentFormView />} />
              <Route path="/:schoolSlug/employee/form/:formId" element={<EmployeeFormView />} />
            </Route>
            {/* Dev-accessible employee dashboard (no auth guard) */}
            <Route path="/:schoolSlug/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            {/* Profile routes */}
            <Route path="/:schoolSlug/profile" element={<ProfilePage />} />
            <Route path="/:schoolSlug/admin/profile" element={<ProfilePage />} />
            <Route path="/help" element={<ProtectedRoute>
                  <ParentHelpCenter />
                </ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Fallback Admin Routes (redirecting to school-scoped paths) */}
            <Route element={<ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>}>
              <Route path="/admin" element={<NavigateToAdmin />} />
              <Route path="/admin/*" element={<NavigateToAdmin />} />
            </Route>

            {/* School-Scoped Admin Routes */}
            <Route element={<SubdomainGuard />}>
              <Route path="/:schoolSlug/admin" element={<AdminDashboard />} />
              <Route path="/:schoolSlug/admin/classrooms" element={<ClassroomManagement />} />
              <Route path="/:schoolSlug/admin/classrooms/:classroomId" element={<ClassroomDetails />} />
              <Route path="/:schoolSlug/admin/forms" element={<FormsManagement />} />
              <Route path="/:schoolSlug/admin/forms/due" element={<DueForms />} />
              <Route path="/:schoolSlug/admin/forms/pending-approval" element={<FormsPendingApproval />} />
              <Route path="/:schoolSlug/admin/forms/view/:formId" element={<FormView />} />
              <Route path="/:schoolSlug/admin/form-assignments" element={<ClassroomFormAssignment />} />
              <Route path="/:schoolSlug/admin/parents" element={<ParentManagement />} />
              <Route path="/:schoolSlug/admin/parents/:parentId" element={<ParentDetails />} />
              <Route path="/:schoolSlug/admin/students" element={<StudentManagement />} />
              <Route path="/:schoolSlug/admin/employees" element={<EmployeeManagement />} />
              <Route path="/:schoolSlug/admin/employees/:employeeId" element={<EmployeeDetails />} />
              <Route path="/:schoolSlug/admin/employee-forms" element={<EmployeeFormsManagement />} />
              <Route path="/:schoolSlug/admin/employee-forms/due" element={<EmployeeDueForms />} />
              <Route path="/:schoolSlug/admin/admin-management" element={<AdminManagement />} />
              <Route path="/:schoolSlug/admin/super-admin-management" element={<SuperAdminManagement />} />
              <Route path="/:schoolSlug/admin/users" element={<UserManagement />} />
              <Route path="/:schoolSlug/admin/csv-upload" element={<AdminCSVUploadPage />} />
              <Route path="/:schoolSlug/admin/help" element={<HelpCenter />} />
            </Route>

            {/* SuperAdmin Routes */}
            <Route element={<ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>}>
              <Route path="/superadmin-arjava" element={<SuperAdminDashboard />} />
              <Route path="/superadmin-arjava/schools" element={<SchoolManagement />} />
              <Route path="/superadmin-arjava/clients" element={<ClientManagement />} />
              <Route path="/superadmin-arjava/csv-upload" element={<SuperAdminCSVUploadPage />} />
              <Route path="/superadmin-arjava/subscription" element={<SubscriptionManagement />} />
              
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<NotFound />} />

          </Routes>
            </BrowserRouter>
          </ToastProvider>
          </NotificationsProvider>
        </UserProvider>
      </AuthProvider>
    </AuthErrorBoundary>;
}
