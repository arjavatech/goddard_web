import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import { App } from './App';
import SelectSchool from './SelectSchool';

import { UserProvider, useUserContext } from './contexts/UserContext';
import { AuthProvider } from './services/auth/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { NavCountsProvider } from './contexts/NavCountsContext';
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
import { FormReviewQueue } from './pages/admin/FormReviewQueue';
import { DocumentWorkspace } from './pages/admin/DocumentWorkspace';
import { DocumentRequestAssignments } from './pages/admin/DocumentRequestAssignments';
import { FormAssignmentsDetail } from './pages/admin/FormAssignmentsDetail';
import { DocumentDueWorkspace } from './pages/admin/DocumentDueWorkspace';
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
import { RequestsRouter, SuperAdminOnly } from './routes/security/ProcurementGuards';
import { FeatureRoute } from './routes/security/FeatureRoute';
import { PermissionRoute } from './routes/security/PermissionRoute';

// Conference pages
import { AdminConferences } from './pages/admin/Conferences';
import { AdminConferenceDetail } from './pages/admin/ConferenceDetail';
import { ParentConferences } from './pages/parent/Conferences';
import { ParentConferenceDetail } from './pages/parent/ConferenceDetail';

// Survey pages
import { SurveyManagement } from './pages/admin/SurveyManagement';
import { SurveyCreate } from './pages/admin/SurveyCreate';
import { SurveyReport } from './pages/admin/SurveyReport';
import { AdminSurveys } from './pages/admin/AdminSurveys';
import { EmployeeSurveys } from './pages/employee/EmployeeSurveys';
import { ParentSurveys } from './pages/surveys/ParentSurveys';
import { SurveyRespond } from './pages/surveys/SurveyRespond';
// Employee pages
import { EmployeeManagement } from './pages/employee/EmployeeManagement';
import { EmployeeDetails } from './pages/employee/EmployeeDetails';
import { EmployeeFormsManagement } from './pages/employee/EmployeeFormsManagement';
import { EmployeeDueForms } from './pages/employee/EmployeeDueForms';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeFormView } from './pages/employee/EmployeeFormView';
import { EmployeeRequests } from './pages/employee/EmployeeRequests';
import { AttendanceReports } from './pages/employee/AttendanceReports';
import { ProfilePage } from './pages/ProfilePage';
import { MyDocuments } from './pages/MyDocuments';

// SuperAdmin Requests & Expense analytics pages
import { SuperAdminRequests } from './pages/superadmin/SuperAdminRequests';
import { SuperAdminExpenses } from './pages/superadmin/SuperAdminExpenses';
import { Settings } from './pages/admin/Settings';
import { TimeTracking } from './pages/admin/TimeTracking';
import { ReportSettings } from './pages/admin/ReportSettings';
import { SalaryReport } from './pages/admin/SalaryReport';
import { WeeklyReport } from './pages/admin/WeeklyReport';
import { EmployeeWeeklyReport } from './pages/employee/EmployeeWeeklyReport';
import { TapTimeIntegration } from './pages/admin/TapTimeIntegration';

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

function RoleHomeRedirect() {
  const { userData, schoolSubdomain, isReady } = useUserContext();

  if (!isReady || !userData) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F2D52]" /></div>;
  }

  const role = userData.role.toLowerCase();
  const home = role === 'admin' || role === 'superadmin'
    ? `/${schoolSubdomain || 'goddard'}/admin`
    : role === 'employee'
      ? `/${schoolSubdomain || 'goddard'}/employee/dashboard`
      : `/${schoolSubdomain || 'goddard'}/dashboard`;
  return <Navigate to={home} replace />;
}

export function AppRouter() {
  return <AuthErrorBoundary>
    <AuthProvider>
      <UserProvider>
        <ToastProvider>
          <NotificationsProvider>
            <NavCountsProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute>
                  <RoleHomeRedirect />
                </ProtectedRoute>} />
                <Route element={<SubdomainGuard />}>
                  <Route path="/:schoolSlug/dashboard" element={<App />} />
                  <Route path="/:schoolSlug/dashboard/form/:formId" element={<FeatureRoute feature="parentManagementEnabled"><ParentFormView /></FeatureRoute>} />
                  <Route path="/:schoolSlug/dashboard/documents" element={<FeatureRoute feature="parentManagementEnabled"><MyDocuments audience="student" /></FeatureRoute>} />
                  <Route path="/:schoolSlug/dashboard/surveys" element={<FeatureRoute feature="surveyEnabled"><ParentSurveys /></FeatureRoute>} />
                  <Route path="/:schoolSlug/dashboard/conferences" element={<FeatureRoute feature="conferenceEnabled"><ParentConferences /></FeatureRoute>} />
                  <Route path="/:schoolSlug/dashboard/conferences/:id" element={<FeatureRoute feature="conferenceEnabled"><ParentConferenceDetail /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/dashboard" element={<FeatureRoute feature="employeeManagementEnabled"><EmployeeDashboard /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/form/:formId" element={<FeatureRoute feature="employeeManagementEnabled"><EmployeeFormView /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/requests" element={<FeatureRoute feature="expenseManagementEnabled"><EmployeeRequests /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/documents" element={<FeatureRoute feature="employeeManagementEnabled"><MyDocuments audience="employee" /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/surveys" element={<FeatureRoute feature="surveyEnabled"><EmployeeSurveys /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/attendance" element={<FeatureRoute feature="taptimeEnabled"><AttendanceReports /></FeatureRoute>} />
                  <Route path="/:schoolSlug/employee/weekly-report" element={<FeatureRoute feature="taptimeEnabled"><EmployeeWeeklyReport /></FeatureRoute>} />
                </Route>
                {/* Public survey respond — no auth required for anonymous surveys */}
                <Route path="/:schoolSlug/surveys/:surveyId/respond" element={<SurveyRespond />} />
                <Route path="/employee/dashboard" element={<Navigate to="/" replace />} />
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
                  <Route path="/:schoolSlug/admin/classrooms" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><ClassroomManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/classrooms/:classroomId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><ClassroomDetails /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/forms" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><FormsManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/forms/due" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DueForms /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/forms/review" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><FormReviewQueue kind="student" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/documents" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DocumentWorkspace audience="student" mode="manage" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/documents/due" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DocumentDueWorkspace audience="student" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/documents/review" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DocumentWorkspace audience="student" mode="review" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/documents/review/:documentId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DocumentWorkspace audience="student" mode="review" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/documents/:requestId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><DocumentRequestAssignments audience="student" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/forms/view/:formId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><FormView /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/form-assignments" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><ClassroomFormAssignment /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/parents" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><ParentManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/parents/:parentId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><ParentDetails /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/students" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><StudentManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employees" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><EmployeeManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/time-tracking" element={<FeatureRoute feature="taptimeEnabled"><PermissionRoute permission="manage_taptime"><TimeTracking /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/salary-report" element={<FeatureRoute feature="taptimeEnabled"><PermissionRoute permission="manage_taptime"><SalaryReport /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/weekly-report" element={<FeatureRoute feature="taptimeEnabled"><PermissionRoute permission="manage_taptime"><WeeklyReport /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/report-settings" element={<FeatureRoute feature="taptimeEnabled"><SuperAdminOnly><ReportSettings /></SuperAdminOnly></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/taptime-integration" element={<FeatureRoute feature="taptimeEnabled"><SuperAdminOnly><TapTimeIntegration /></SuperAdminOnly></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employees/:employeeId" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><EmployeeDetails /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-forms" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><EmployeeFormsManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-forms/due" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><EmployeeDueForms /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-forms/review" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><FormReviewQueue kind="employee" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/forms/:formId" element={<FeatureRoute feature="parentManagementEnabled"><PermissionRoute permission="manage_parents"><FormAssignmentsDetail audience="student" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-forms/:formId" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><FormAssignmentsDetail audience="employee" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-documents" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><DocumentWorkspace audience="employee" mode="manage" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-documents/due" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><DocumentDueWorkspace audience="employee" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-documents/review" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><DocumentWorkspace audience="employee" mode="review" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-documents/review/:documentId" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><DocumentWorkspace audience="employee" mode="review" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/employee-documents/:requestId" element={<FeatureRoute feature="employeeManagementEnabled"><PermissionRoute permission="manage_employees"><DocumentRequestAssignments audience="employee" /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/admin-management" element={<AdminManagement />} />
                  <Route path="/:schoolSlug/admin/super-admin-management" element={<SuperAdminManagement />} />
                  <Route path="/:schoolSlug/admin/users" element={<UserManagement />} />
                  <Route path="/:schoolSlug/admin/csv-upload" element={<AdminCSVUploadPage />} />
                  <Route path="/:schoolSlug/admin/requests" element={<FeatureRoute feature="expenseManagementEnabled"><PermissionRoute permission="manage_expenses"><RequestsRouter /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/surveys" element={<FeatureRoute feature="surveyEnabled"><PermissionRoute permission="manage_surveys"><SurveyManagement /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/surveys/create" element={<FeatureRoute feature="surveyEnabled"><PermissionRoute permission="manage_surveys"><SurveyCreate /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/my-surveys" element={<FeatureRoute feature="surveyEnabled"><PermissionRoute permission="manage_surveys"><AdminSurveys /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/surveys/:surveyId" element={<FeatureRoute feature="surveyEnabled"><PermissionRoute permission="manage_surveys"><SurveyReport /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/conferences" element={<FeatureRoute feature="conferenceEnabled"><PermissionRoute permission="manage_conferences"><AdminConferences /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/conferences/:id" element={<FeatureRoute feature="conferenceEnabled"><PermissionRoute permission="manage_conferences"><AdminConferenceDetail /></PermissionRoute></FeatureRoute>} />
                  <Route path="/:schoolSlug/admin/settings" element={<Settings />} />
                  <Route path="/:schoolSlug/admin/expenses" element={<FeatureRoute feature="expenseManagementEnabled">
                    <PermissionRoute permission="manage_expenses"><SuperAdminExpenses /></PermissionRoute>
                  </FeatureRoute>} />
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
                  <Route path="/superadmin-arjava/requests" element={<SuperAdminRequests />} />
                  <Route path="/superadmin-arjava/expenses" element={<SuperAdminExpenses />} />
                  <Route path="/superadmin-arjava/settings" element={<Settings />} />
                </Route>

                {/* 404 Catch-all */}
                <Route path="*" element={<NotFound />} />

              </Routes>
            </BrowserRouter>
            </NavCountsProvider>
          </NotificationsProvider>
        </ToastProvider>
      </UserProvider>
    </AuthProvider>
  </AuthErrorBoundary>;
}
