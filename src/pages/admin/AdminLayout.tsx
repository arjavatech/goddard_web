import React, { ReactNode, useState } from 'react';
import { Home, School, FileText, Users, LogOut, GraduationCap, Menu, X, User, Settings, UserCog, Calendar, Phone, Mail, Globe, MapPin, BookOpen, LayoutDashboard, Download, CheckCircle, Clock, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Loading } from '../../components/ui/loading';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { HelpCenterContent } from '../../components/HelpCenterContent';
import { SuperAdminGuideContent } from '../../components/SuperAdminGuideContent';
interface AdminLayoutProps {
  children: ReactNode;
}
export function AdminLayout({
  children
}: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSuperGuideModal, setShowSuperGuideModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const { userData, schoolName, schoolPhone, schoolEmail, schoolAddress, isReady } = useUserContext();

  const isSuperAdmin = userData?.role === 'SuperAdmin';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/', {
        replace: true
      });
    } catch (err) {
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };
  const currentPath = location.pathname;
  const isParentDetailsPage = currentPath.includes('/admin/parents/') && currentPath !== '/admin/parents';
  const navigationItems = [{
    icon: <Home className="w-5 h-5" />,
    label: 'Dashboard',
    path: '/admin'
  }, {
    icon: <School className="w-5 h-5" />,
    label: 'Classrooms',
    path: '/admin/classrooms'
  }, {
    icon: <GraduationCap className="w-5 h-5" />,
    label: 'Students',
    path: '/admin/students'
  }, {
    icon: <FileText className="w-5 h-5" />,
    label: 'Forms',
    path: '/admin/forms'
  }, {
    icon: <Calendar className="w-5 h-5" />,
    label: 'Due Forms',
    path: '/admin/forms/due'
  }, {
    icon: <Users className="w-5 h-5" />,
    label: 'Parents',
    path: '/admin/parents'
  }];

  // Add Admins menu only for SuperAdmin
  if (isSuperAdmin) {
    navigationItems.push({
      icon: <UserCog className="w-5 h-5" />,
      label: 'Admins',
      path: '/admin/admin-management'
    });
  }
  React.useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  const footerRef = React.useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = React.useState(0);
  React.useEffect(() => {
    const update = () => {
      if (!footerRef.current) return;
      const rect = footerRef.current.getBoundingClientRect();
      const visible = Math.max(0, window.innerHeight - rect.top);
      setFooterHeight(visible);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    if (footerRef.current) observer.observe(footerRef.current);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="md" message="" />
      </div>
    );
  }

  return <div className="min-h-screen bg-background flex flex-col">
    {/* Mobile Overlay */}
    {isSidebarOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
        onClick={() => setIsSidebarOpen(false)}
      />
    )}

    {/* Sidebar + Main wrapper */}
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ bottom: footerHeight }}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <img src="/gs_logo_lynnwood.png" alt="App Logo" className="h-18 w-auto max-h-none shrink-0 max-w-[200px]" />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <nav className="flex-1 p-6 overflow-y-auto min-h-0">

          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={index}>
                <Link
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center space-x-4 px-4 py-3.5 rounded-lg transition-all duration-200 ${currentPath === item.path ? 'bg-amazon-teal text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:text-amazon-teal'}`}
                >
                  <span className={`${currentPath === item.path ? 'text-white' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header - Only show after role is fetched */}
        {userData?.role && (
          <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white shadow-sm border-b border-gray-100 py-3 px-4 lg:px-6 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg lg:text-xl font-semibold text-foreground">
                  {isSuperAdmin ? 'SuperAdmin Portal' : 'Admin Portal'}
                </h1>
                <p className="text-xs text-gray-500">Role: {userData?.role}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {userData?.firstName && userData?.lastName
                      ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
                      : 'AD'}
                  </div>

                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-0 bg-white shadow-lg border border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {userData?.firstName && userData?.lastName
                          ? `${userData.firstName} ${userData.lastName}`
                          : 'Administrator'}
                      </p>
                      <p className="text-xs text-gray-500">System Administrator</p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full flex items-center justify-center px-4 py-2.5 bg-amazon-teal hover:bg-amazon-teal/90 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
        )}
        {/* Page content */}
        <main className={`flex-1 sm:p-6 ${isParentDetailsPage ? 'p-2' : 'p-0'} ${userData?.role ? 'sm:pt-20 pt-20' : 'sm:pt-0 pt-0'} bg-gray-50`}>{children}</main>
      </div>
    </div>

    {/* Footer */}
    <footer ref={footerRef} className="relative z-40 bg-amazon-teal">
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6">
        {/* Main grid — stacks on mobile, 3-col on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-5 sm:gap-6 pb-4 sm:pb-5 border-b border-white/20">

          {/* Brand */}
          <div className="sm:col-span-1 lg:col-span-5 flex flex-col gap-3">
            <img src="/gs_logo_lynnwood.png" alt="The Goddard School" className="h-7 w-auto object-contain brightness-0 invert opacity-90 self-start" />
            <p className="text-xs text-white/70 leading-relaxed max-w-xs hidden sm:block">
              Nurturing children through play-based learning and quality early childhood education.
            </p>
            <div className="flex items-center gap-2">
              {schoolPhone && (
                <a href={`tel:${schoolPhone}`} aria-label="Call us"
                  className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              {schoolEmail && (
                <a href={`mailto:${schoolEmail}`} aria-label="Email us"
                  className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
              <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" aria-label="Website"
                className="w-7 h-7 rounded-md border border-white/30 bg-white/10 hover:bg-white hover:border-white flex items-center justify-center text-white hover:text-amazon-teal transition-all duration-200">
                <Globe className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="sm:col-span-1 lg:col-span-4 flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">Contact</p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
              {schoolPhone && (
                <li>
                  <a href={`tel:${schoolPhone}`} className="flex items-center gap-2 text-xs text-white/80 hover:text-white transition-colors">
                    <Phone className="h-3 w-3 text-white/60 shrink-0" />
                    {schoolPhone}
                  </a>
                </li>
              )}
              {schoolEmail && (
                <li>
                  <a href={`mailto:${schoolEmail}`} className="flex items-center gap-2 text-xs text-white/80 hover:text-white transition-colors">
                    <Mail className="h-3 w-3 text-white/60 shrink-0" />
                    <span className="truncate">{schoolEmail}</span>
                  </a>
                </li>
              )}
              {schoolAddress && (
                <li className="flex items-start gap-2 text-xs text-white/80">
                  <MapPin className="h-3 w-3 text-white/60 shrink-0 mt-0.5" />
                  <span>{schoolAddress}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Resources */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em]">Resources</p>
            <ul className="flex flex-col gap-1.5 sm:gap-2">
              {
                !isSuperAdmin && (
                  <li>
                    <button onClick={() => setShowHelpModal(true)} className="text-xs text-white/80 hover:text-white transition-colors text-left">
                      Help Center
                    </button>
                  </li>
                )
              }
              {!isSuperAdmin && (
                <li>
                  <button onClick={() => setShowGuideModal(true)} className="text-xs text-white/80 hover:text-white transition-colors text-left">
                    Admin Guide
                  </button>
                </li>
              )}

              {isSuperAdmin && (
                <li>
                  <button onClick={() => setShowSuperGuideModal(true)} className="text-xs text-white/80 hover:text-white transition-colors text-left">
                    SuperAdmin Guide
                  </button>
                </li>
              )}


              <li>
                <a href="https://goddardschool.com" target="_blank" rel="noopener noreferrer" className="text-xs text-white/80 hover:text-white transition-colors">
                  Goddard School
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs text-white/50 text-center sm:text-left">© {new Date().getFullYear()} {schoolName}. All rights reserved.</p>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/20 bg-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-amazon-orange" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
              {isSuperAdmin ? 'SuperAdmin Portal' : 'Admin Portal'}
            </span>
          </div>
        </div>
      </div>
    </footer>

    {/* SuperAdmin Guide Modal */}
    <Dialog open={showSuperGuideModal} onOpenChange={setShowSuperGuideModal}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amazon-orange" />
            SuperAdmin Guide
          </DialogTitle>
          <DialogDescription>SuperAdmin-exclusive features, roles, and responsibilities</DialogDescription>
        </DialogHeader>
        <SuperAdminGuideContent />
      </DialogContent>
    </Dialog>

    {/* Help Center Modal */}
    <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amazon-teal" />
            Help Center
          </DialogTitle>
          <DialogDescription>Find answers to common admin questions</DialogDescription>
        </DialogHeader>
        <HelpCenterContent role="admin" />
      </DialogContent>
    </Dialog>

    {/* Admin Guide Modal */}
    <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amazon-teal" />
            Admin Guide
          </DialogTitle>
          <DialogDescription>Everything you need to manage your school portal</DialogDescription>
        </DialogHeader>
        <AdminGuideContent isSuperAdmin={isSuperAdmin} />
      </DialogContent>
    </Dialog>

    {/* Logout Confirmation Modal */}
    <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogDescription>
            Are you sure you want to logout? You will need to sign in again to access the admin portal.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut}>
            Cancel
          </Button>
          <AsyncButton variant="destructive" onClick={handleLogout}>
            Logout
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

const guidesections = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="h-5 w-5 text-amazon-teal" />,
    title: 'Dashboard',
    description: 'The admin dashboard gives you a high-level overview of your school.',
    steps: [
      'View total students, classrooms, and form completion rates at a glance.',
      'Monitor class-wise enrollment progress with the metrics chart.',
      'Use the quick-action cards to navigate to any section instantly.',
    ],
  },
  {
    id: 'students',
    icon: <GraduationCap className="h-5 w-5 text-amazon-teal" />,
    title: 'Student Management',
    description: 'Manage all enrolled students, their forms, and classroom assignments.',
    steps: [
      'Search and filter students by name, classroom, status, or year.',
      'Click the ⋯ actions menu on any row to Manage Forms, Transfer Class, or Download All Forms.',
      'Use the checkbox column to select multiple students for bulk class transfers.',
      "Click a student's name to view their full parent details page.",
      "Toggle a student's Active / Archived status by clicking the status pill.",
    ],
  },
  {
    id: 'classrooms',
    icon: <School className="h-5 w-5 text-amazon-teal" />,
    title: 'Classroom Management',
    description: 'Create and manage classrooms, assign forms, and track enrollment.',
    steps: [
      'Create a new classroom using the "Add Classroom" button.',
      'Click a classroom name to view its students and assigned forms.',
      'Assign form templates to a classroom so all students receive them automatically.',
      'Rename or delete classrooms from the actions menu.',
    ],
  },
  {
    id: 'forms',
    icon: <FileText className="h-5 w-5 text-amazon-teal" />,
    title: 'Forms Management',
    description: 'Create, edit, and assign form templates to students or classrooms.',
    steps: [
      'Add a new form template with a name, Fillout form ID, and optional due date.',
      'Assign a form to all students in the school or to a specific classroom.',
      'Edit or delete existing form templates from the forms list.',
      'View individual form submissions via the View action.',
    ],
  },
  {
    id: 'due-forms',
    icon: <Calendar className="h-5 w-5 text-amazon-teal" />,
    title: 'Due Forms Tracking',
    description: 'Monitor form completion status and send reminders to parents.',
    steps: [
      'Filter by status: Pending, Pending Approval, Overdue, or Completed.',
      'Use the Remind button to send an email reminder to a parent for a specific form.',
      'Use the bulk Remind dropdown to send reminders to all Pending or Overdue forms at once.',
      'Export the current view as CSV or PDF using the Export button.',
      'Status meanings: Pending = not started, Pending Approval = submitted by parent, Overdue = past due date, Completed = admin approved.',
    ],
  },
  {
    id: 'parents',
    icon: <Users className="h-5 w-5 text-amazon-teal" />,
    title: 'Parent Management',
    description: 'Invite, manage, and communicate with parents.',
    steps: [
      'Invite a new parent using the "Invite Parent" button — this sends them a signup email.',
      "Click a parent's name to view their full profile, children, and form statuses.",
      "Resend confirmation emails to parents who haven't verified their account.",
      'Deactivate or reactivate parent accounts from the actions menu.',
    ],
  },
  {
    id: 'downloads',
    icon: <Download className="h-5 w-5 text-amazon-teal" />,
    title: 'Downloading Forms',
    description: 'Download individual or all forms for a student.',
    steps: [
      'To download a single approved form: go to Student Management → ⋯ menu → the form card shows Download (↓) and Print icons.',
      'To download all forms for a student at once: Student Management → ⋯ menu → "Download All Forms" — this downloads a ZIP file.',
      'In the parent dashboard, the "Download All" button in Forms & Documents also downloads a ZIP of all approved forms.',
    ],
  },
];

const statusGuide = [
  { icon: <CheckCircle className="h-4 w-4 text-green-600" />, label: 'Completed – Admin Approved', desc: 'Form reviewed and approved by admin.' },
  { icon: <Clock className="h-4 w-4 text-blue-600" />, label: 'Pending Approval', desc: 'Parent submitted the form, awaiting admin review.' },
  { icon: <Clock className="h-4 w-4 text-yellow-600" />, label: 'Pending', desc: 'Form assigned but not yet started by parent.' },
  { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, label: 'Overdue', desc: 'Form not completed past its due date.' },
  { icon: <Eye className="h-4 w-4 text-gray-500" />, label: 'Draft', desc: 'Form started but not submitted.' },
];

function AdminGuideContent({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { schoolPhone, schoolEmail } = useUserContext();
  return (
    <div className="space-y-4 py-1 px-1 sm:px-0">
      {/* Quick nav */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {guidesections.map(s => (
          <a
            key={s.id}
            href={`#guide-${s.id}`}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amazon-teal/10 text-amazon-teal hover:bg-amazon-teal/20 hover:shadow-sm transition-all duration-200"
          >
            {s.icon}
            <span className="hidden sm:inline">{s.title}</span>
            <span className="sm:hidden">{s.title.split(' ')[0]}</span>
          </a>
        ))}
      </div>

      {/* Status legend */}
      <Card className="glass-card">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-amazon-teal" />
            Form Status Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {statusGuide.map(s => (
              <div key={s.label} className="flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg bg-gray-50">
                <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {guidesections.map(section => (
        <Card key={section.id} id={`guide-${section.id}`} className="glass-card scroll-mt-4">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">{section.description}</p>
          </CardHeader>
          <CardContent className="pt-0 px-3 sm:px-6">
            <ul className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 sm:gap-3">
                  <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amazon-teal/10 text-amazon-teal text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-xs sm:text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Contact support */}
      <Card className="glass-card border-amazon-teal/30 bg-amazon-teal/5">
        <CardContent className="p-3 sm:p-4 flex items-start gap-3">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-teal flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-medium text-foreground">Need more help?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {schoolEmail && <>Contact support at{' '}
                <a href={`mailto:${schoolEmail}`} className="text-amazon-teal hover:underline break-all">
                  {schoolEmail}
                </a>{' '}</>}
              {schoolPhone && <>or call <a href={`tel:${schoolPhone}`} className="text-amazon-teal hover:underline">{schoolPhone}</a>.</>}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
