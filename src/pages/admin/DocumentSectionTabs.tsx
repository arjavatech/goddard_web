import { Link, useLocation, useParams } from 'react-router-dom';
import { useNavCounts } from '../../contexts/NavCountsContext';

type Audience = 'student' | 'employee';
type Section = 'documents' | 'due' | 'review';

export function DocumentSectionTabs({ audience, section }: { audience: Audience; section: Section }) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const location = useLocation();
  const { studentDocsDue, studentDocsReview, employeeDocsDue, employeeDocsReview } = useNavCounts();
  const basePath = `/${schoolSlug || 'goddard'}/admin/${audience === 'student' ? 'documents' : 'employee-documents'}`;
  const dueCount = audience === 'student' ? studentDocsDue : employeeDocsDue;
  const reviewCount = audience === 'student' ? studentDocsReview : employeeDocsReview;
  const tabs = [
    { key: 'documents' as const, label: 'Document Requests', description: 'Create and manage requests', path: basePath, count: 0 },
    { key: 'due' as const, label: 'Due Documents', description: 'Track outstanding uploads', path: `${basePath}/due`, count: dueCount },
    { key: 'review' as const, label: 'Review Submissions', description: 'Approve or request re-upload', path: `${basePath}/review`, count: reviewCount },
  ];

  const audienceLabel = audience === 'student' ? 'Student' : 'Employee';
  return <nav aria-label={`${audienceLabel} document sections`} className="overflow-x-auto border-b border-slate-200 bg-transparent">
      <div className="flex min-w-max gap-6 sm:gap-9">
      {tabs.map(tab => {
        const active = section === tab.key || (tab.key === 'review' && location.pathname.startsWith(`${basePath}/review/`));
        return <Link key={tab.key} to={tab.path} className={`relative flex flex-col py-3.5 text-left transition-colors ${active ? 'text-blue-700' : 'text-slate-500 hover:text-[#0F2D52]'}`}>
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            {tab.label}
            {tab.count > 0 && (
              <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </span>
          <span className={`mt-0.5 text-[11px] font-medium ${active ? 'text-blue-600' : 'text-slate-400'}`}>{tab.description}</span>
          {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-blue-600" />}
        </Link>;
      })}
      </div>
  </nav>;
}
