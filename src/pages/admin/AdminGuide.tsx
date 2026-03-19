import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  LayoutDashboard, Users, GraduationCap, FileText, Calendar, School,
  ChevronRight, BookOpen, Settings, Download, Bell, Search, Filter,
  CheckCircle, Clock, AlertTriangle, Eye, Mail
} from 'lucide-react';

const sections = [
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
      'Click a student\'s name to view their full parent details page.',
      'Toggle a student\'s Active / Archived status by clicking the status pill.',
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
      'Click a parent\'s name to view their full profile, children, and form statuses.',
      'Resend confirmation emails to parents who haven\'t verified their account.',
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

export function AdminGuide() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amazon-teal/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-amazon-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Guide</h1>
            <p className="text-sm text-muted-foreground">Everything you need to manage your school portal</p>
          </div>
        </div>

        {/* Quick nav */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Navigation</p>
            <div className="flex flex-wrap gap-2">
              {sections.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amazon-teal/10 text-amazon-teal hover:bg-amazon-teal hover:text-white transition-colors"
                >
                  {s.icon}
                  {s.title}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status legend */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-amazon-teal" />
              Form Status Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {statusGuide.map(s => (
                <div key={s.label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="mt-0.5 flex-shrink-0">{s.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {sections.map(section => (
          <Card key={section.id} id={section.id} className="glass-card scroll-mt-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {section.icon}
                {section.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amazon-teal/10 text-amazon-teal text-xs font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        {/* Contact support */}
        <Card className="glass-card border-amazon-teal/30 bg-amazon-teal/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-amazon-teal flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Need more help?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Contact support at{' '}
                <a href="mailto:support@goddardschool.com" className="text-amazon-teal hover:underline">
                  support@goddardschool.com
                </a>{' '}
                or call <a href="tel:+18000000000" className="text-amazon-teal hover:underline">+1 (800) 000-0000</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
