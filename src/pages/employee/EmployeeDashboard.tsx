import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Card, CardContent } from '../../components/ui/card';
import { FileText, Clock, CheckCircle } from 'lucide-react';
import { EmployeeService, type EmployeeFormAssignment } from '../../services/api/employee';
import { useUserContext } from '../../contexts/UserContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';

type EnrichedAssignment = EmployeeFormAssignment & {
  formTitle: string;
  formDescription: string;
};

export function EmployeeDashboard() {
  const { userData, schoolSubdomain } = useUserContext();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real scenario, this ID would come from the auth context for the logged-in employee.
  // We'll use a mocked employeeId for demo purposes, or fallback to userData.id
  const employeeId = userData?.id || 'mock-employee-1'; 

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!userData?.schoolId) return;
        setLoading(true);

        const [rawAssignments, templates] = await Promise.all([
          EmployeeService.fetchEmployeeFormAssignments(employeeId),
          fetchFormTemplates(userData.schoolId).catch(() => [])
        ]);

        if (!isMounted) return;

        const enriched = rawAssignments.map(assignment => {
          const template = templates.find((t: any) => t.id === assignment.formId);
          return {
            ...assignment,
            formTitle: template?.formName || 'Employee Form',
            formDescription: template?.formType || 'Required documentation'
          };
        });

        setAssignments(enriched);
      } catch (error) {
        console.error('Failed to load employee dashboard', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userData?.schoolId, employeeId]);

  const handleOpenForm = (assignment: EnrichedAssignment) => {
    navigate(`/${schoolSubdomain}/employee/form/${assignment.id}`, {
      state: { assignment }
    });
  };

  const totalForms = assignments.length;
  const completedForms = assignments.filter(a => a.status === 'Approved' || a.status === 'Submitted').length;
  const progress = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 mt-16 sm:mt-24 mb-12 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Employee Dashboard</h1>
          <p className="text-slate-500 mt-2">Welcome back. Complete your assigned forms below.</p>
        </div>

        {/* Progress Overview */}
        <Card className="border-slate-200 shadow-sm rounded-2xl mb-8 overflow-hidden bg-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Form Completion Progress</h2>
                <p className="text-sm text-slate-500 mt-1">You have completed {completedForms} of {totalForms} assigned forms.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-3xl font-black tracking-tight text-[#0F2D52]">{progress}%</span>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 relative flex items-center justify-center">
                  <svg className="w-full h-full absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="46" 
                      className="text-[#0F2D52] stroke-current transition-all duration-1000 ease-out" 
                      strokeWidth="8" fill="none" 
                      strokeDasharray="289" 
                      strokeDashoffset={289 - (289 * progress) / 100} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <CheckCircle className={`w-6 h-6 ${progress === 100 ? 'text-emerald-500' : 'text-slate-300'}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms List */}
        <h3 className="text-lg font-bold text-slate-900 mb-4">Assigned Forms</h3>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">No forms assigned</h4>
            <p className="text-slate-500 text-sm mt-1">You are all caught up.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-[#0F2D52]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{assignment.formTitle}</h4>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{assignment.formDescription}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={assignment.status} />
                        <span className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Clock className="w-3 h-3 mr-1" /> Assigned: {new Date(assignment.assignedOn).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto shrink-0">
                    <Button 
                      className="w-full sm:w-auto bg-[#0F2D52] hover:bg-[#1c477c] text-white font-semibold rounded-xl"
                      onClick={() => handleOpenForm(assignment)}
                    >
                      {assignment.status === 'Assigned' || assignment.status === 'Rejected' ? 'Fill Form' : 'View Form'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
