import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, CheckCircle, Plus, Trash2, GripVertical,
  Radio, CheckSquare, AlignLeft, Star, ChevronDown, ChevronUp,
  Eye, Send, AlertCircle, UserCheck, EyeOff, Copy, BookmarkCheck, Search
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { listTemplates, createSurvey, getSurvey, updateSurvey, type QuestionType, type SurveyAudience, type SurveyDetail } from '../../services/api/surveys';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────
interface DraftQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: string[];
  ratingMax: 5 | 10;
}

const QUESTION_TYPES: { type: QuestionType; icon: React.ReactNode; label: string; description: string }[] = [
  { type: 'single_choice', icon: <Radio className="h-5 w-5" />, label: 'Single Choice', description: 'One answer from a list' },
  { type: 'multiple_choice', icon: <CheckSquare className="h-5 w-5" />, label: 'Multiple Choice', description: 'Multiple answers allowed' },
  { type: 'text', icon: <AlignLeft className="h-5 w-5" />, label: 'Open Text', description: 'Written free-form answer' },
  { type: 'rating', icon: <Star className="h-5 w-5" />, label: 'Rating', description: '1–5 star scale' },
];

const AUDIENCE_OPTIONS: { value: SurveyAudience; label: string }[] = [
  { value: 'parents', label: 'Parents Only' },
  { value: 'employees', label: 'Employees Only' },
  { value: 'all_staff', label: 'All Staff (Admins + Employees)' },
  { value: 'everyone', label: 'Everyone (Parents + Employees + Admins)' },
  { value: 'classroom', label: 'Specific Classroom' },
];

function newQuestion(type: QuestionType, index: number): DraftQuestion {
  return {
    id: `q-new-${Date.now()}-${index}`,
    type,
    text: '',
    required: true,
    options: type === 'single_choice' || type === 'multiple_choice' ? ['Option 1', 'Option 2'] : [],
    ratingMax: 5,
  };
}

// ── Step Indicator ────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = ['Survey Details', 'Build Questions', 'Preview & Publish'];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200',
                done ? 'bg-emerald-500 text-white' : active ? 'bg-[#0F2D52] text-white shadow-md' : 'bg-slate-100 text-slate-400'
              )}>
                {done ? <CheckCircle className="h-4 w-4" /> : step}
              </div>
              <span className={cn(
                'text-xs font-semibold hidden sm:block',
                active ? 'text-[#0F2D52]' : done ? 'text-emerald-600' : 'text-slate-400'
              )}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('w-8 sm:w-12 h-0.5 mx-2', step < current ? 'bg-emerald-400' : 'bg-slate-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────
function QuestionCard({
  question, index, onChange, onDelete,
}: {
  question: DraftQuestion;
  index: number;
  onChange: (id: string, updates: Partial<DraftQuestion>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const typeInfo = QUESTION_TYPES.find(t => t.type === question.type)!;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 border-b border-slate-100">
        <div className="cursor-grab p-1 text-slate-300 hover:text-slate-400">
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Q{index + 1}</span>
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EFF5FB] text-[#0F2D52] text-xs font-semibold">
          {typeInfo.icon} {typeInfo.label}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={question.required}
              onChange={e => onChange(question.id, { required: e.target.checked })}
              className="accent-[#0F2D52]"
            />
            Required
          </label>
          <button onClick={() => onDelete(question.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Question text */}
          <Input
            placeholder="Enter your question here..."
            value={question.text}
            onChange={e => onChange(question.id, { text: e.target.value })}
            className="rounded-xl border-slate-200 focus:border-[#0F2D52] font-medium"
          />

          {/* Options for choice types */}
          {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
            <div className="space-y-2">
              {question.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <div className={cn(
                    'w-4 h-4 shrink-0 border-2 border-slate-300',
                    question.type === 'single_choice' ? 'rounded-full' : 'rounded'
                  )} />
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const opts = [...question.options];
                      opts[oi] = e.target.value;
                      onChange(question.id, { options: opts });
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 text-sm border-b border-slate-200 focus:border-[#0F2D52] outline-none py-1 bg-transparent text-slate-700 placeholder:text-slate-300"
                  />
                  {question.options.length > 2 && (
                    <button
                      onClick={() => onChange(question.id, { options: question.options.filter((_, j) => j !== oi) })}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => onChange(question.id, { options: [...question.options, `Option ${question.options.length + 1}`] })}
                className="text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold flex items-center gap-1 mt-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Option
              </button>
            </div>
          )}

          {/* Rating preview */}
          {question.type === 'rating' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Scale:</span>
              <div className="flex gap-1">
                {Array.from({ length: question.ratingMax }, (_, i) => (
                  <Star key={i} className="h-5 w-5 text-amber-300 fill-amber-300" />
                ))}
              </div>
              <span className="text-xs text-slate-400">(1–{question.ratingMax})</span>
            </div>
          )}

          {/* Text preview */}
          {question.type === 'text' && (
            <div className="h-16 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
              Respondents will type their answer here
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── X Icon placeholder ─────────────────────────────────────────────────────
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function defaultExpiryDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

// ── Survey Preview ─────────────────────────────────────────────────────────
function SurveyPreview({ title, description, questions }: {
  title: string; description: string; questions: DraftQuestion[];
}) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#0F2D52] to-[#1a4a80] rounded-2xl p-5 text-white">
        <h3 className="font-extrabold text-lg leading-snug">{title || 'Survey Title'}</h3>
        <p className="text-sm opacity-80 mt-1">{description || 'Survey description goes here.'}</p>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            {i + 1}. {q.text || <span className="italic text-slate-400">Question text...</span>}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {(q.type === 'single_choice') && q.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-[#0F2D52] transition-colors" />
              <span className="text-sm text-slate-700">{opt}</span>
            </label>
          ))}
          {(q.type === 'multiple_choice') && q.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-2.5 cursor-pointer group">
              <div className="w-4 h-4 rounded border-2 border-slate-300 group-hover:border-[#0F2D52] transition-colors" />
              <span className="text-sm text-slate-700">{opt}</span>
            </label>
          ))}
          {q.type === 'rating' && (
            <div className="flex gap-2">
              {Array.from({ length: q.ratingMax }, (_, i) => <Star key={i} className="h-7 w-7 text-slate-200 hover:text-amber-400 cursor-pointer transition-colors" />)}
            </div>
          )}
          {q.type === 'text' && (
            <textarea className="w-full h-20 text-sm border border-slate-200 rounded-xl p-3 resize-none text-slate-500 placeholder:text-slate-300 focus:outline-none focus:border-[#0F2D52]" placeholder="Type your answer here..." readOnly />
          )}
        </div>
      ))}
      {questions.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
          No questions added yet
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function SurveyCreate() {
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const schoolPrefix = `/${schoolSlug || userData?.schoolId || 'goddard'}`;
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [step, setStep] = useState(1);

  // Step 1 state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<SurveyAudience>('parents');
  const [classroomId, setClassroomId] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  // Step 2 state
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [publishedSurveyId, setPublishedSurveyId] = useState<string | null>(null);

  // Data state
  const [templates, setTemplates] = useState<SurveyDetail[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [editLoading, setEditLoading] = useState(() => !!editId);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const schoolId = userData?.schoolId;
    if (!schoolId) return;
    Promise.all([
      listTemplates(schoolId).then(setTemplates).catch(() => {}),
      fetchClassrooms(schoolId).then(setClassrooms).catch(() => {}),
    ]).finally(() => setPageLoading(false));
  }, [userData?.schoolId]);

  useEffect(() => {
    if (!editId) return;
    getSurvey(editId).then(data => {
      setTitle(data.title);
      setDescription(data.description ?? '');
      setAudience(data.audience);
      setClassroomId(data.classroom_id ?? '');
      setIsAnonymous(data.is_anonymous);
      setExpiresAt(data.expires_at ? data.expires_at.split('T')[0] : defaultExpiryDate());
      setQuestions(data.questions.map((q, i) => ({
        id: `q-edit-${i}`,
        type: q.question_type,
        text: q.question_text,
        required: q.is_required,
        options: q.options ?? [],
        ratingMax: (q.rating_max === 10 ? 10 : 5) as 5 | 10,
      })));
      setEditLoading(false);
    }).catch(() => {
      showToast('error', 'Failed to load survey for editing.');
      navigate(`${schoolPrefix}/admin/surveys`);
    });
  }, [editId]);

  const filteredTemplates = templates.filter(t =>
    !templateSearch || t.title.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(s => s.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    setTitle(tpl.title);
    setDescription(tpl.description ?? '');
    setAudience(tpl.audience);
    setClassroomId(tpl.classroom_id ?? '');
    setIsAnonymous(tpl.is_anonymous);
    setExpiresAt(defaultExpiryDate());
    setQuestions(tpl.questions.map((q, i) => ({
      id: `q-tpl-${Date.now()}-${i}`,
      type: q.question_type,
      text: q.question_text,
      required: q.is_required,
      options: q.options ?? [],
      ratingMax: (q.rating_max === 10 ? 10 : 5) as 5 | 10,
    })));
  };

  const clearTemplate = () => {
    setSelectedTemplateId('');
    setTitle('');
    setDescription('');
    setAudience('parents');
    setClassroomId('');
    setIsAnonymous(false);
    setExpiresAt(defaultExpiryDate());
    setQuestions([]);
  };

  const handleAddQuestion = (type: QuestionType) => {
    setQuestions(qs => [...qs, newQuestion(type, qs.length)]);
    setShowTypeSelector(false);
  };

  const handleQuestionChange = (id: string, updates: Partial<DraftQuestion>) => {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const buildPayload = (status: 'draft' | 'published') => ({
    school_id: userData?.schoolId ?? '',
    title,
    description: description || undefined,
    audience,
    classroom_id: audience === 'classroom' ? classroomId : undefined,
    is_anonymous: isAnonymous,
    is_template: false,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    status,
    questions: questions.map(q => ({
      question_type: q.type,
      question_text: q.text,
      is_required: q.required,
      options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options : undefined,
      rating_max: q.type === 'rating' ? q.ratingMax : undefined,
    })),
  });

  const buildUpdatePayload = () => ({
    id: editId ?? undefined,
    title,
    description: description || undefined,
    audience,
    classroom_id: audience === 'classroom' ? classroomId : null,
    is_anonymous: isAnonymous,
    is_template: false,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    questions: questions.map(q => ({
      question_type: q.type,
      question_text: q.text,
      is_required: q.required,
      options: (q.type === 'single_choice' || q.type === 'multiple_choice') ? q.options : undefined,
      rating_max: q.type === 'rating' ? q.ratingMax : undefined,
    })),
  });

  const handlePublish = () => {
    if (editId) {
      updateSurvey(editId, buildUpdatePayload()).then(() => {
        showToast('success', 'Survey updated successfully!');
        navigate(`${schoolPrefix}/admin/surveys`);
      }).catch(() => {
        showToast('error', 'Failed to update survey.');
      });
    } else {
      createSurvey(buildPayload('published')).then((result) => {
        setPublishedSurveyId(result.id);
        showToast('success', 'Survey published successfully!');
      }).catch(() => {
        showToast('error', 'Failed to publish survey.');
      });
    }
  };

  const handleSaveDraft = () => {
    if (editId) {
      updateSurvey(editId, buildUpdatePayload()).then(() => {
        showToast('success', 'Survey updated successfully!');
        navigate(`${schoolPrefix}/admin/surveys`);
      }).catch(() => {
        showToast('error', 'Failed to update survey.');
      });
    } else {
      createSurvey(buildPayload('draft')).then(() => {
        showToast('success', 'Survey saved as draft.');
        navigate(`${schoolPrefix}/admin/surveys`);
      }).catch(() => {
        showToast('error', 'Failed to save draft.');
      });
    }
  };

  const today = todayString();
  const step1Valid = title.trim().length > 0 && expiresAt !== '' && expiresAt >= today && (audience !== 'classroom' || classroomId !== '');
  const step2Valid = questions.length > 0;

  const copyLink = () => {
    if (!publishedSurveyId) return;
    const url = `${window.location.origin}${schoolPrefix}/surveys/${publishedSurveyId}/respond`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const selectedClassroom = classrooms.find(c => c.id === classroomId);
  const audienceLabel = audience === 'classroom' && selectedClassroom
    ? selectedClassroom.name
    : AUDIENCE_OPTIONS.find(a => a.value === audience)?.label ?? '';
  const targetCount = audience === 'classroom' && selectedClassroom
    ? selectedClassroom.studentsCount
    : audience === 'parents' ? 120 : audience === 'employees' ? 18 : audience === 'everyone' ? 276 : 138;

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mt-16 sm:mt-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <Button variant="outline" size="sm" onClick={() => step > 1 ? setStep(s => s - 1) : navigate(`${schoolPrefix}/admin/surveys`)} className="rounded-xl shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step > 1 ? 'Back' : 'Surveys'}
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-[#0F2D52] truncate">{editId ? 'Edit Survey' : 'Create Survey'}</h1>
            <p className="text-xs text-slate-400">{editId ? 'Update the survey details below' : 'Fill in the details below to create a new survey'}</p>
          </div>
        </div>

        {(pageLoading || editLoading) ? (
          <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
            {/* Step indicator skeleton */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                  <div className="h-3 w-20 bg-slate-200 rounded hidden sm:block" />
                  {i < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200 mx-2" />}
                </div>
              ))}
            </div>
            {/* Form card skeleton */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              {/* Title */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
              {/* Description */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-24 bg-slate-100 rounded-xl" />
              </div>
              {/* Audience */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-32" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
              {/* Expiry */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-10 bg-slate-100 rounded-xl w-64" />
              </div>
              {/* Privacy */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-slate-100 rounded-xl" />
                  <div className="h-20 bg-slate-100 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ) : (
        <>
        <StepIndicator current={step} />

        {/* ── Step 1: Survey Details ── */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* ── Template Picker ── */}
          {!editId && templates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Start from a Template</p>
                  <p className="text-xs text-slate-400 mt-0.5">Pre-fill the form from a previously saved template</p>
                </div>
                {selectedTemplateId && (
                  <button onClick={clearTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors bg-slate-100 hover:bg-red-50 px-2.5 py-1 rounded-full">
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              {templates.length >= 4 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search templates..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    className="pl-9 h-8 rounded-xl text-xs border-slate-200 bg-slate-50"
                  />
                  {templateSearch && (
                    <button
                      onClick={() => setTemplateSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => selectedTemplateId === tpl.id ? clearTemplate() : setPendingTemplateId(tpl.id)}
                    className={cn(
                      'text-left p-3.5 rounded-xl border-2 transition-all duration-150',
                      selectedTemplateId === tpl.id
                        ? 'border-[#0F2D52] bg-[#EFF5FB] ring-2 ring-[#0F2D52]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookmarkCheck className={cn('h-4 w-4 shrink-0', selectedTemplateId === tpl.id ? 'text-[#0F2D52]' : 'text-slate-400')} />
                      {selectedTemplateId === tpl.id && <span className="text-[10px] font-bold text-[#0F2D52] uppercase tracking-wide">Selected</span>}
                    </div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{tpl.title}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{tpl.question_count} questions</span>
                      {tpl.is_anonymous && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">Anonymous</span>}
                    </div>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400 text-center py-6">No templates match your search</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="font-extrabold text-slate-900">Survey Details</h2>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g. 2024–25 School Year Satisfaction Survey"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="rounded-xl border-slate-200 focus:border-[#0F2D52]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</label>
                <Textarea
                  placeholder="Briefly describe the purpose of this survey. This will be shown to respondents."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="rounded-xl border-slate-200 focus:border-[#0F2D52] resize-none h-24"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Target Audience <span className="text-red-500">*</span></label>
                <Select value={audience} onValueChange={v => setAudience(v as SurveyAudience)}>
                  <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0F2D52]/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {audience === 'classroom' && (
                  <div className="mt-4">
                    <Select value={classroomId} onValueChange={setClassroomId}>
                      <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0F2D52]/15">
                        <SelectValue placeholder="Select a classroom..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.studentsCount} students)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Expiry Date <span className="text-red-500">*</span></label>
                <Input
                  type="date"
                  value={expiresAt}
                  min={todayString()}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="rounded-xl border-slate-200 focus:border-[#0F2D52] w-full sm:w-64"
                />
                {expiresAt && expiresAt < todayString() ? (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Expiry date cannot be in the past.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">Survey closes automatically on this date.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Response Privacy</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(false)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150',
                      !isAnonymous ? 'border-[#0F2D52] bg-[#EFF5FB]' : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <UserCheck className={cn('h-5 w-5 mt-0.5 shrink-0', !isAnonymous ? 'text-[#0F2D52]' : 'text-slate-400')} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Identified</p>
                      <p className="text-xs text-slate-500 mt-0.5">Requires Goddard login. Respondent identity is known.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(true)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150',
                      isAnonymous ? 'border-[#0F2D52] bg-[#EFF5FB]' : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <EyeOff className={cn('h-5 w-5 mt-0.5 shrink-0', isAnonymous ? 'text-[#0F2D52]' : 'text-slate-400')} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Anonymous</p>
                      <p className="text-xs text-slate-500 mt-0.5">Anyone with the link can respond. No login needed.</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleSaveDraft} className="rounded-xl text-slate-600">
                Save as Draft
              </Button>
              <Button
                className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-1.5 shadow-sm"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Build Questions ── */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Build Questions</h2>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {questions.length === 0 && (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">No questions yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Add Question" below to get started</p>
              </div>
            )}

            {questions.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} onChange={handleQuestionChange} onDelete={handleDeleteQuestion} />
            ))}

            {/* Add Question Button */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              {!showTypeSelector ? (
                <button
                  onClick={() => setShowTypeSelector(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-[#0F2D52]/40 hover:text-[#0F2D52] hover:bg-[#EFF5FB]/50 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Question
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Select Question Type</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUESTION_TYPES.map(qt => (
                      <button
                        key={qt.type}
                        onClick={() => handleAddQuestion(qt.type)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-[#0F2D52]/40 hover:bg-[#EFF5FB]/60 text-slate-600 hover:text-[#0F2D52] transition-all text-center group"
                      >
                        <span className="p-2 rounded-lg bg-slate-100 group-hover:bg-[#EFF5FB] transition-colors text-slate-500 group-hover:text-[#0F2D52]">
                          {qt.icon}
                        </span>
                        <span className="text-xs font-semibold">{qt.label}</span>
                        <span className="text-[10px] text-slate-400">{qt.description}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowTypeSelector(false)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={handleSaveDraft} className="rounded-xl text-slate-600">Save as Draft</Button>
              <Button
                className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-1.5 shadow-sm"
                disabled={!step2Valid}
                onClick={() => setStep(3)}
              >
                Preview <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview & Publish ── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {/* Preview */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="font-extrabold text-slate-900">Survey Preview</h2>
              <p className="text-xs text-slate-500">This is how respondents will see the survey.</p>
              <SurveyPreview title={title} description={description} questions={questions} />
            </div>

            {/* Publish Panel */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-extrabold text-slate-900">Publish Settings</h2>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 sticky top-24">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Audience</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[160px] truncate">{audienceLabel}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Recipients</span>
                    <span className="font-semibold text-slate-900">~{targetCount} people</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Questions</span>
                    <span className="font-semibold text-slate-900">{questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Expires</span>
                    <span className="font-semibold text-slate-900">
                      {expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500 font-medium">Privacy</span>
                    <span className={cn('font-semibold text-xs px-2 py-0.5 rounded-full', isAnonymous ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                      {isAnonymous ? 'Anonymous' : 'Identified'}
                    </span>
                  </div>
                </div>

                {/* Share Link */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isAnonymous ? 'Public Share Link' : 'Sign-in Required Link'}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={publishedSurveyId
                        ? `${window.location.origin}${schoolPrefix}/surveys/${publishedSurveyId}/respond`
                        : 'Available after publishing'}
                      className={cn(
                        'flex-1 text-[11px] border border-slate-200 rounded-lg px-2.5 py-2 font-mono truncate',
                        publishedSurveyId ? 'bg-slate-50 text-slate-500' : 'bg-slate-100 text-slate-400 italic'
                      )}
                    />
                    <button
                      onClick={copyLink}
                      disabled={!publishedSurveyId}
                      className={cn('p-2 rounded-lg transition-all shrink-0', linkCopied ? 'bg-emerald-100 text-emerald-600' : publishedSurveyId ? 'bg-[#EFF5FB] text-[#0F2D52] hover:bg-[#0F2D52]/10' : 'bg-slate-100 text-slate-300 cursor-not-allowed')}
                      title="Copy link"
                    >
                      {linkCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isAnonymous
                      ? 'Anyone with this link can respond — no login required.'
                      : 'Respondents must sign in with their Goddard account.'}
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  {publishedSurveyId ? (
                    <Button
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                      onClick={() => navigate(`${schoolPrefix}/admin/surveys`)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Done — Go to Surveys
                    </Button>
                  ) : editId ? (
                    <Button
                      className="w-full rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-2 shadow-sm"
                      onClick={handlePublish}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Save Changes
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-2 shadow-sm"
                        onClick={handlePublish}
                      >
                        <Send className="h-4 w-4" />
                        Publish Survey
                      </Button>
                      <Button variant="ghost" className="w-full rounded-xl text-slate-600" onClick={handleSaveDraft}>
                        Save as Draft
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Once published, the survey will be immediately visible to the selected audience on their dashboards.
                </p>
              </div>
            </div>
          </div>
        )}
      </> )}
      </div>

      {/* ── Template confirmation dialog ── */}
      <Dialog open={!!pendingTemplateId} onOpenChange={open => { if (!open) setPendingTemplateId(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Apply Template?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This will replace your current survey details and questions with the selected template. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setPendingTemplateId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white"
                onClick={() => { applyTemplate(pendingTemplateId!); setPendingTemplateId(null); }}
              >
                Apply Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
