import { useState, useEffect, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, CheckCircle, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getSurvey, getPublicSurvey, submitSurveyResponse, submitAnonymousResponse, type SurveyDetail, type SurveyQuestion } from '../../services/api/surveys';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useNavCounts } from '../../contexts/NavCountsContext';
import { cn } from '../../lib/utils';
import { AdminLayout } from '../admin/AdminLayout';
import { EmployeeLayout } from '../employee/EmployeeLayout';
import { ParentLayout } from '../parent/ParentLayout';

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center">
        <img src="/images/gs_logo_lynnwood.png" alt="The Goddard School" className="h-8 w-auto object-contain" />
      </div>
      <div className="py-6">{children}</div>
    </div>
  );
}

type Answer = string | string[];

function StarRating({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-3 justify-center py-4">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform duration-100 hover:scale-110"
          >
            <Star className={cn('h-12 w-12 transition-colors duration-150', filled ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100')} />
          </button>
        );
      })}
    </div>
  );
}

function QuestionDisplay({
  question,
  answer,
  onChange,
}: {
  question: SurveyQuestion;
  answer: Answer;
  onChange: (value: Answer) => void;
}) {
  if (question.question_type === 'single_choice') {
    const val = typeof answer === 'string' ? answer : '';
    return (
      <div className="space-y-3">
        {(question.options ?? []).map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150',
              val === opt
                ? 'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                val === opt ? 'border-[#0F2D52]' : 'border-slate-300'
              )}>
                {val === opt && <div className="w-2.5 h-2.5 rounded-full bg-[#0F2D52]" />}
              </div>
              {opt}
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (question.question_type === 'multiple_choice') {
    const vals = Array.isArray(answer) ? answer : [];
    return (
      <div className="space-y-3">
        {(question.options ?? []).map(opt => {
          const checked = vals.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onChange(checked ? vals.filter(v => v !== opt) : [...vals, opt])}
              className={cn(
                'w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150',
                checked
                  ? 'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all',
                  checked ? 'border-[#0F2D52] bg-[#0F2D52]' : 'border-slate-300'
                )}>
                  {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                {opt}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.question_type === 'rating') {
    const val = typeof answer === 'string' ? parseInt(answer) || 0 : 0;
    return (
      <div className="py-4">
        <StarRating value={val} onChange={v => onChange(String(v))} max={question.rating_max ?? 5} />
        {val > 0 && (
          <p className="text-center text-sm font-semibold text-slate-600 mt-2">
            {val} out of {question.rating_max ?? 5} stars
          </p>
        )}
      </div>
    );
  }

  if (question.question_type === 'text') {
    const val = typeof answer === 'string' ? answer : '';
    const MAX = 500;
    return (
      <div className="space-y-2">
        <textarea
          value={val}
          onChange={e => {
            if (e.target.value.length <= MAX) onChange(e.target.value);
          }}
          placeholder="Type your answer here..."
          rows={5}
          className="w-full text-sm border-2 border-slate-200 focus:border-[#0F2D52] rounded-2xl p-4 resize-none text-slate-700 placeholder:text-slate-300 focus:outline-none transition-colors"
        />
        <p className={cn('text-xs text-right', val.length > MAX * 0.9 ? 'text-amber-600' : 'text-slate-400')}>
          {val.length}/{MAX}
        </p>
      </div>
    );
  }

  return null;
}

function ThankYou({ title, onBack }: { title: string; onBack: () => void }) {
  const now = new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-12 space-y-6">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center shadow-lg">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-extrabold text-[#0F2D52]">Thank you!</h2>
        <p className="text-slate-600 text-base">Your response to <span className="font-semibold">{title}</span> has been submitted.</p>
        <p className="text-sm text-slate-400">Submitted {now}</p>
      </div>
      <Button onClick={onBack} className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white px-8 shadow-sm mt-4">
        Back to My Surveys
      </Button>
    </div>
  );
}

export function SurveyRespond() {
  const navigate = useNavigate();
  const { schoolSlug, surveyId } = useParams<{ schoolSlug: string; surveyId: string }>();
  const { userData, schoolSubdomain } = useUserContext();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCounts } = useNavCounts();
  const schoolPrefix = `/${schoolSlug || schoolSubdomain || userData?.schoolId || 'goddard'}`;

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [audienceMismatch, setAudienceMismatch] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!surveyId || authLoading) return;
    setNotFound(false);
    setRequiresLogin(false);
    setAudienceMismatch(false);
    setSurvey(null);

    const fetchSurvey = isAuthenticated ? getSurvey : getPublicSurvey;
    fetchSurvey(surveyId)
      .then(data => {
        if (isAuthenticated && userData) {
          const userRole = userData.role?.toLowerCase() ?? '';
          const audience = data.audience;
          const allowed =
            data.is_anonymous ||
            audience === 'everyone' ||
            audience === 'classroom' ||
            (audience === 'parents' && userRole === 'parent') ||
            ((audience === 'employees' || audience === 'all_staff') &&
              (userRole === 'employee' || userRole === 'admin' || userRole === 'superadmin'));
          if (!allowed) {
            setAudienceMismatch(true);
            return;
          }
        }
        setSurvey(data);
      })
      .catch(() => {
        if (!isAuthenticated) {
          setRequiresLogin(true);
        } else {
          setNotFound(true);
        }
      });
  }, [surveyId, isAuthenticated, authLoading, userData]);

  const role = userData?.role?.toLowerCase() ?? 'parent';
  const surveysUrl = role === 'admin' || role === 'superadmin'
    ? `${schoolPrefix}/admin/my-surveys`
    : role === 'employee'
      ? `${schoolPrefix}/employee/surveys`
      : `${schoolPrefix}/dashboard/surveys`;

  const Layout = (!isAuthenticated
    ? PublicLayout
    : role === 'admin' || role === 'superadmin'
      ? AdminLayout
      : role === 'employee'
        ? EmployeeLayout
        : ParentLayout) as ComponentType<{ children: ReactNode }>;

  if (authLoading || (!survey && !notFound && !requiresLogin && !audienceMismatch)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">
          Loading survey…
        </div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">
          Survey not found.
        </div>
      </Layout>
    );
  }

  if (requiresLogin) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EFF5FB] flex items-center justify-center">
            <Lock className="h-8 w-8 text-[#0F2D52]" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h2 className="text-lg font-extrabold text-[#0F2D52]">Login required</h2>
            <p className="text-sm text-slate-500">This survey requires you to be logged in. Please sign in with your Goddard account to continue.</p>
          </div>
          <Button
            className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white px-8 shadow-sm"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </div>
      </PublicLayout>
    );
  }

  if (audienceMismatch) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h2 className="text-lg font-extrabold text-[#0F2D52]">Survey not available</h2>
            <p className="text-sm text-slate-500">This survey is not intended for your account type.</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout>
        <ThankYou title={survey!.title} onBack={() => isAuthenticated ? navigate(surveysUrl) : navigate('/')} />
      </Layout>
    );
  }

  const questions = survey!.questions;
  const current = questions[currentIndex];
  const currentAnswer = answers[current?.id ?? ''] ?? '';
  const isAnswered = (() => {
    if (!current?.is_required) return true;
    if (!currentAnswer) return false;
    if (Array.isArray(currentAnswer)) return currentAnswer.length > 0;
    return currentAnswer !== '';
  })();
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: Answer) => {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      return;
    }
    // Last question — submit
    setSubmitting(true);
    try {
      const builtAnswers = questions.map(q => {
        const ans = answers[q.id];
        if (q.question_type === 'multiple_choice' && Array.isArray(ans)) {
          return { question_id: q.id, values: ans };
        }
        return { question_id: q.id, value: typeof ans === 'string' ? ans : undefined };
      });
      const schoolId = userData?.schoolId ?? '';
      if (survey!.is_anonymous) {
        await submitAnonymousResponse(survey!.id, { answers: builtAnswers });
      } else {
        await submitSurveyResponse(survey!.id, { school_id: schoolId, answers: builtAnswers });
      }
      setSubmitted(true);
      refreshCounts();
    } catch {
      // stay on page; user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
    else navigate(-1);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 pt-16 sm:pt-6 pb-8 space-y-6">
        {/* Anonymous banner */}
        {survey!.is_anonymous && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-800 text-xs font-medium">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            Anonymous survey — your identity is not recorded
          </div>
        )}
        {/* Survey Title Card */}
        <div className="bg-gradient-to-br from-[#0F2D52] to-[#1a4a80] rounded-2xl p-5 text-white">
          <div className="font-extrabold text-lg leading-snug text-white">{survey!.title}</div>
          <p className="text-sm opacity-75 mt-1">{survey!.description}</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-white shadow-inner overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1a6fc4] to-[#0F2D52] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5 min-h-[300px]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentIndex + 1}</span>
            <h2 className="text-base font-extrabold text-slate-900 leading-snug">
              {current.question_text}
              {current.is_required && <span className="text-red-500 ml-1">*</span>}
            </h2>
          </div>
          <QuestionDisplay question={current} answer={currentAnswer} onChange={handleAnswer} />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="rounded-xl text-slate-600 gap-1.5"
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4" />
            {currentIndex === 0 ? 'Exit' : 'Back'}
          </Button>
          <Button
            className={cn(
              'flex-1 rounded-xl gap-1.5 font-bold shadow-sm transition-all',
              isAnswered && !submitting
                ? 'bg-[#0F2D52] hover:bg-[#1a3a6b] text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
            disabled={!isAnswered || submitting}
            onClick={handleNext}
          >
            {currentIndex === questions.length - 1 ? (
              submitting ? <>Submitting…</> : <>Submit Survey <CheckCircle className="h-4 w-4" /></>
            ) : (
              <>Next <ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>

        {/* Skip optional */}
        {!current.is_required && currentAnswer === '' && (
          <button
            onClick={handleNext}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
            disabled={submitting}
          >
            Skip this question →
          </button>
        )}
      </div>
    </Layout>
  );
}
