import { BookOpen, ClipboardList, UserCheck, Bell, FileText, HelpCircle } from 'lucide-react';
import { useUserContext } from '../contexts/UserContext';

const staticSections = [
  {
    icon: UserCheck,
    title: 'Getting Started',
    items: [
      'Log in to the Parent Portal using your registered email and password.',
      'Your dashboard shows all enrolled children and their enrollment progress.',
      'Use the child selector at the top to switch between children.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Completing Enrollment Forms',
    items: [
      'Navigate to "Forms & Documents" to see all assigned forms.',
      'Click on any form card or use the "Continue" button to open and fill out a form.',
      'Forms are saved automatically — you can return and complete them later.',
      'Once submitted, a form status will update to "Submitted" or "Approved".',
    ],
  },
  {
    icon: FileText,
    title: 'Downloading & Printing Forms',
    items: [
      'Approved forms can be downloaded as PDF using the download icon on the form card.',
      'Use the print icon to print an approved form directly from your browser.',
      'Use "Download All" to get a ZIP of all approved forms at once.',
    ],
  },
  {
    icon: Bell,
    title: 'Form Statuses Explained',
    items: [
      'Draft — Form has been started but not yet submitted.',
      'In Progress — Form is partially completed.',
      'Submitted — Form has been submitted and is awaiting review.',
      'Needs Revision — School has requested changes. Please review and resubmit.',
      'Approved — Form has been reviewed and approved by the school.',
    ],
  },
];

export function ParentGuideContent() {
  const { schoolEmail } = useUserContext();

  const sections = [
    ...staticSections,
    {
      icon: HelpCircle,
      title: 'Need Help?',
      items: [
        'Contact your school administrator if you cannot find a form or have questions.',
        ...(schoolEmail ? [`For technical issues, email ${schoolEmail}.`] : []),
        'Visit the Help Center for answers to common enrollment questions.',
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-amazon-teal/5 border border-amazon-teal/20">
        <BookOpen className="h-5 w-5 text-amazon-teal shrink-0" />
        <p className="text-sm text-slate-500">
          This guide walks you through everything you need to complete your child's enrollment at The Goddard School.
        </p>
      </div>
      {sections.map(({ icon: Icon, title, items }) => (
        <div key={title}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4 text-amazon-teal shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <ul className="space-y-1.5 pl-6">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amazon-teal/50 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
