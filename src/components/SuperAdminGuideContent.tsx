import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { UserCog, ShieldCheck, Users, Settings, Eye, AlertTriangle, Mail, LayoutDashboard, Key } from 'lucide-react';

const sections = [
  {
    id: 'overview',
    icon: <LayoutDashboard className="h-5 w-5 text-amazon-teal" />,
    title: 'SuperAdmin Overview',
    description: 'As a SuperAdmin, you have full access to all school data and system configuration.',
    steps: [
      'Your portal header displays "SuperAdmin Portal" to distinguish your session from regular admins.',
      'You can access every section: Dashboard, Classrooms, Students, Forms, Due Forms, Parents, and Admin Management.',
      'Actions you take are logged and visible in the audit trail for accountability.',
      'Use your elevated access responsibly — changes you make affect all admins and parents.',
    ],
  },
  {
    id: 'admin-management',
    icon: <UserCog className="h-5 w-5 text-amazon-teal" />,
    title: 'Admin Management',
    description: 'Create, edit, and deactivate admin accounts from the Admins section.',
    steps: [
      'Navigate to Admins via the sidebar — this menu item is only visible to SuperAdmins.',
      'Click "Invite Admin" to send an invitation email to a new administrator.',
      'Each admin is assigned a role: Admin or SuperAdmin. Choose carefully — SuperAdmin grants full system access.',
      'Deactivate an admin account to revoke their access without deleting their history.',
      'Reactivate a deactivated admin at any time from the actions menu.',
      'You cannot delete your own SuperAdmin account while logged in.',
    ],
  },
  {
    id: 'roles',
    icon: <ShieldCheck className="h-5 w-5 text-amazon-teal" />,
    title: 'Roles & Permissions',
    description: 'Understand the difference between Admin and SuperAdmin roles.',
    steps: [
      'Admin: Can manage students, classrooms, forms, parents, and due forms. Cannot access Admin Management.',
      'SuperAdmin: Full access including Admin Management, role assignment, and system-level settings.',
      'Only SuperAdmins can promote an Admin to SuperAdmin or demote a SuperAdmin to Admin.',
      'There must always be at least one active SuperAdmin account in the system.',
      'Role changes take effect immediately — the affected admin will see updated access on their next action.',
    ],
  },
  {
    id: 'oversight',
    icon: <Eye className="h-5 w-5 text-amazon-teal" />,
    title: 'Oversight & Audit',
    description: 'Monitor admin activity and ensure data integrity across the school portal.',
    steps: [
      'Review recent admin actions from the audit log to track who made changes and when.',
      'All form approvals, student transfers, and parent invitations are attributed to the acting admin.',
      'If you notice unexpected changes, use the audit log to identify the source.',
      'Contact system support if you suspect unauthorized access or a security incident.',
    ],
  },
  {
    id: 'bulk-ops',
    icon: <Users className="h-5 w-5 text-amazon-teal" />,
    title: 'Bulk Operations',
    description: 'Perform school-wide actions efficiently using bulk tools.',
    steps: [
      'Bulk transfer students between classrooms using the checkbox selection in Student Management.',
      'Send reminders to all Pending or Overdue forms at once via the bulk Remind dropdown in Due Forms.',
      'Export full student or form data as CSV or PDF for reporting purposes.',
      'When performing bulk actions, review the confirmation dialog carefully before proceeding.',
    ],
  },
  {
    id: 'security',
    icon: <Key className="h-5 w-5 text-amazon-teal" />,
    title: 'Security Best Practices',
    description: 'Keep the school portal secure with these recommended practices.',
    steps: [
      'Never share your SuperAdmin credentials. Each administrator should have their own account.',
      'Deactivate admin accounts immediately when a staff member leaves the school.',
      'Regularly review the active admin list to ensure only current staff have access.',
      'Use a strong, unique password and enable multi-factor authentication if available.',
      'Log out of the portal when using shared or public devices.',
    ],
  },
  {
    id: 'escalation',
    icon: <AlertTriangle className="h-5 w-5 text-amazon-teal" />,
    title: 'Escalation & Support',
    description: 'Know when and how to escalate issues beyond the admin portal.',
    steps: [
      'For technical issues that cannot be resolved in the portal, contact system support directly.',
      'For data privacy concerns or suspected breaches, escalate immediately to your school director.',
      'Document the issue with screenshots and timestamps before reaching out to support.',
      'For billing or licensing questions, contact the Goddard School corporate office.',
    ],
  },
];

export function SuperAdminGuideContent() {
  return (
    <div className="space-y-4 py-1 px-1 sm:px-0">
      {/* Quick nav */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {sections.map(s => (
          <a
            key={s.id}
            href={`#saguide-${s.id}`}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amazon-orange/10 text-amazon-orange hover:bg-amazon-orange/20 hover:shadow-sm transition-all duration-200"
          >
            {s.icon}
            <span className="hidden sm:inline">{s.title}</span>
            <span className="sm:hidden">{s.title.split(' ')[0]}</span>
          </a>
        ))}
      </div>

      {/* Role badge */}
      <Card className="glass-card border-amazon-orange/30 bg-amazon-orange/5">
        <CardContent className="p-3 sm:p-4 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-orange flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-foreground">You are logged in as SuperAdmin</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This guide covers SuperAdmin-exclusive features and responsibilities. For general admin features, refer to the Admin Guide.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.map(section => (
        <Card key={section.id} id={`saguide-${section.id}`} className="glass-card scroll-mt-4">
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
                  <span className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amazon-orange/10 text-amazon-orange text-xs font-semibold">
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
            <p className="text-xs sm:text-sm font-medium text-foreground">Need system-level support?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contact support at{' '}
              <a href="mailto:support@goddardschool.com" className="text-amazon-teal hover:underline break-all">
                support@goddardschool.com
              </a>{' '}
              or call <a href="tel:+18000000000" className="text-amazon-teal hover:underline">+1 (800) 000-0000</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
