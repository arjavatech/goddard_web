import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { App } from './App';
import SelectSchool from './SelectSchool';

import { UserProvider } from './contexts/UserContext';
import { ToastProvider } from './contexts/ToastContext';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { SetPassword } from './pages/SetPassword';
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

import { FormView } from './pages/admin/FormView';
// Admin Management
import { AdminManagement } from './pages/superadmin/AdminManagement';
import ProtectedRoute from './routes/security/ProtectedRoute';
export function AppRouter() {
  return <UserProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<SelectSchool />} />
          <Route path="/dashboard" element={<ProtectedRoute>
                <App />
              </ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Admin Routes (protected parent) */}
          <Route element={<ProtectedRoute>
                <Outlet />
              </ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/classrooms" element={<ClassroomManagement />} />
            <Route path="/admin/classrooms/:classroomId" element={<ClassroomDetails />} />
            <Route path="/admin/forms" element={<FormsManagement />} />
            <Route path="/admin/forms/view/:formId" element={<FormView />} />
            <Route path="/admin/form-assignments" element={<ClassroomFormAssignment />} />
            <Route path="/admin/parents" element={<ParentManagement />} />
            <Route path="/admin/parents/:parentId" element={<ParentDetails />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/admins" element={<AdminManagement />} />

          </Route>

        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </UserProvider>;
}