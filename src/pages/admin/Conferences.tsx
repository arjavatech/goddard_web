import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays, Plus, Eye, Pencil, Trash2, ChevronRight, ChevronLeft, ChevronDown,
  Search, Calendar, Users, LayoutGrid, List, Clock, AlertCircle, Image as ImageIcon, X,
  Copy, Check,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useUserContext } from '../../contexts/UserContext';
import { cn } from '../../lib/utils';
import {
  listConferences, getConferenceStats, createConference, updateConference,
  deleteConference, type ConferenceListItem, type ConferenceStats,
  type CreateConferencePayload, type ClassroomSlotsInput,
} from '../../services/api/conferences';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISOLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

async function resizeImage(file: File, maxBytes = 500 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX_DIM = 1200;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      const compress = () => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          if (blob.size <= maxBytes || quality <= 0.3) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else { quality = Math.round((quality - 0.1) * 10) / 10; compress(); }
        }, 'image/jpeg', quality);
      };
      compress();
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read image')); };
    img.src = objectUrl;
  });
}

// ── Create Conference wizard ───────────────────────────────────────────────────

interface WizardState {
  title: string;
  description: string;
  conference_date: string;
  image_url: string;
  booking_close_at: string;
  classrooms: ClassroomSlotsInput[];
}

const defaultWizard = (): WizardState => ({
  title: '', description: '', conference_date: '', image_url: '',
  booking_close_at: '', classrooms: [],
});

interface CreateWizardProps {
  onClose: () => void;
  onCreated: () => void;
  schoolId: string;
  schoolSubdomain: string;
  editData?: ConferenceListItem | null;
}

function CreateWizard({ onClose, onCreated, schoolId, schoolSubdomain, editData }: CreateWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardState>(() => {
    if (editData) {
      return {
        title: editData.title,
        description: editData.description,
        conference_date: editData.conference_date,
        image_url: editData.image_url || '',
        booking_close_at: editData.booking_close_at ? editData.booking_close_at.slice(0, 10) : '',
        classrooms: [],
      };
    }
    return defaultWizard();
  });
  const [classroomList, setClassroomList] = useState<Classroom[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const [selectedClassrooms, setSelectedClassrooms] = useState<Set<string>>(
    new Set(editData?.classroom_tags?.map(t => t.classroom_id) ?? [])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    fetchClassrooms(schoolId).then(setClassroomList).catch(() => {});
  }, [schoolId]);

  function ensureClassroomInSlots(classroomId: string) {
    setForm(f => {
      if (f.classrooms.find(c => c.classroom_id === classroomId)) return f;
      return { ...f, classrooms: [...f.classrooms, { classroom_id: classroomId, slots: [{ start_time: '09:00', end_time: '09:30', capacity: 1 }] }] };
    });
  }

  function removeClassroomFromSlots(classroomId: string) {
    setForm(f => ({ ...f, classrooms: f.classrooms.filter(c => c.classroom_id !== classroomId) }));
  }

  function toggleClassroom(id: string) {
    setSelectedClassrooms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        removeClassroomFromSlots(id);
      } else {
        next.add(id);
        ensureClassroomInSlots(id);
      }
      return next;
    });
  }

  function addSlot(classroomId: string) {
    setForm(f => ({
      ...f,
      classrooms: f.classrooms.map(c =>
        c.classroom_id === classroomId
          ? { ...c, slots: [...c.slots, { start_time: '09:00', end_time: '09:30', capacity: 1 }] }
          : c
      ),
    }));
  }

  function removeSlot(classroomId: string, idx: number) {
    setForm(f => ({
      ...f,
      classrooms: f.classrooms.map(c =>
        c.classroom_id === classroomId
          ? { ...c, slots: c.slots.filter((_, i) => i !== idx) }
          : c
      ),
    }));
  }

  function updateSlot(classroomId: string, idx: number, field: string, value: string | number) {
    setForm(f => ({
      ...f,
      classrooms: f.classrooms.map(c =>
        c.classroom_id === classroomId
          ? { ...c, slots: c.slots.map((s, i) => i === idx ? { ...s, [field]: value } : s) }
          : c
      ),
    }));
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      let imageData: string | null = null;
      if (pendingImageFile) {
        try {
          const resized = await resizeImage(pendingImageFile);
          imageData = await fileToBase64(resized);
        } catch (uploadErr: any) {
          setError(uploadErr?.message || 'Image processing failed. Please try again.');
          return;
        }
      }

      const payload: CreateConferencePayload = {
        school_id: schoolId,
        school_subdomain: schoolSubdomain || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        conference_date: form.conference_date,
        image_url: form.image_url.trim() || null,
        image_data: imageData || undefined,
        booking_close_at: form.booking_close_at ? new Date(form.booking_close_at + 'T23:59:59').toISOString() : null,
        classrooms: form.classrooms,
      };
      if (editData) {
        await updateConference(editData.id, payload);
      } else {
        await createConference(payload);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save conference');
    } finally {
      setSubmitting(false);
    }
  }

  const deadlineAfterConference =
    !!form.booking_close_at &&
    !!form.conference_date &&
    form.booking_close_at.slice(0, 10) > form.conference_date;

  const canGoNext = () => {
    if (step === 1) {
      const basicOk = !!(form.title.trim() && form.description.trim() && form.conference_date >= todayString());
      if (!basicOk) return false;
      if (deadlineAfterConference) return false;
      return true;
    }
    if (step === 2) return selectedClassrooms.size > 0;
    if (step === 3) {
      if (!form.classrooms.every(c => c.slots.length > 0)) return false;
      if (!form.classrooms.every(c => c.slots.every(s => s.end_time > s.start_time))) return false;
      return true;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">{editData ? 'Edit Conference' : 'Create Conference'}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-[#0F2D52]' : 'bg-slate-200')} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">Step {step} of 4 — {['Basic Info', 'Select Classrooms', 'Time Slots', 'Review'][step - 1]}</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Conference Title <span className="text-red-500">*</span></label>
                <Input
                  placeholder="e.g., Fall Parent-Teacher Conferences"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date <span className="text-red-500">*</span></label>
                <Input type="date" min={todayString()} value={form.conference_date}
                  onChange={e => setForm(f => ({ ...f, conference_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 focus:border-[#0F2D52] resize-none"
                  placeholder="Describe the purpose and details of this conference..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Booking Deadline <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input
                  type="date"
                  value={form.booking_close_at}
                  min={todayString()}
                  max={form.conference_date || undefined}
                  onChange={e => setForm(f => ({ ...f, booking_close_at: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 focus:border-[#0F2D52]"
                />
                {deadlineAfterConference ? (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" /> Deadline must be on or before the conference date
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Parents cannot book after the end of this day</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Conference Image <span className="text-slate-400 font-normal">(Optional)</span></label>
                {(() => {
                  const displayImage = previewUrl || form.image_url;
                  return displayImage ? (
                    <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl bg-slate-50">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-100 bg-white flex-shrink-0">
                        <img src={displayImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {pendingImageFile?.name || 'Conference image'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {pendingImageFile
                            ? `${(pendingImageFile.size / 1024).toFixed(0)} KB · will be resized to ≤500 KB`
                            : 'Saved image'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewUrl) URL.revokeObjectURL(previewUrl);
                            setPendingImageFile(null);
                            setPreviewUrl('');
                            setForm(f => ({ ...f, image_url: '' }));
                            setUploadError('');
                          }}
                          className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0F2D52]/40 hover:bg-slate-50 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const accepted = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                          if (!accepted.includes(file.type)) {
                            setUploadError('Unsupported format. Use JPEG, PNG, or WEBP.');
                            e.target.value = '';
                            return;
                          }
                          setUploadError('');
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setPendingImageFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                          setForm(f => ({ ...f, image_url: '' }));
                          e.target.value = '';
                        }}
                      />
                      <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                      <p className="text-xs text-slate-500 font-medium">Click to upload image</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WEBP · max 500 KB (auto-resized)</p>
                      {uploadError && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {uploadError}
                        </p>
                      )}
                    </label>
                  );
                })()}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-slate-600 mb-4">Select which classrooms will participate in this conference.</p>
              <button
                ref={dropdownTriggerRef}
                type="button"
                onClick={() => {
                  if (!dropdownOpen && dropdownTriggerRef.current) {
                    setDropdownRect(dropdownTriggerRef.current.getBoundingClientRect());
                  }
                  setDropdownOpen(o => !o);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm hover:border-[#0F2D52]/40 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20"
              >
                <span className={selectedClassrooms.size === 0 ? 'text-slate-400' : 'text-slate-900'}>
                  {selectedClassrooms.size === 0
                    ? 'Select classrooms...'
                    : `${selectedClassrooms.size} classroom${selectedClassrooms.size > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', dropdownOpen && 'rotate-180')} />
              </button>
              {dropdownOpen && dropdownRect && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setDropdownOpen(false)} />
                  <div
                    style={{ position: 'fixed', top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width, zIndex: 61 }}
                    className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                  >
                    {classroomList.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">No classrooms found.</p>
                    ) : classroomList.map(cl => {
                      const selected = selectedClassrooms.has(cl.id);
                      return (
                        <button
                          key={cl.id}
                          type="button"
                          onClick={() => toggleClassroom(cl.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0',
                            selected ? 'bg-[#0F2D52]/5' : 'hover:bg-slate-50'
                          )}
                        >
                          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                            selected ? 'border-[#0F2D52] bg-[#0F2D52]' : 'border-slate-300')}>
                            {selected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{cl.name}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{cl.studentsCount ?? 0} students</span>
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{cl.parentCount ?? 0} parents</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {selectedClassrooms.size > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {classroomList.filter(cl => selectedClassrooms.has(cl.id)).map(cl => (
                    <span key={cl.id} className="flex items-center gap-1.5 bg-[#0F2D52]/10 text-[#0F2D52] text-xs font-medium px-2.5 py-1 rounded-full">
                      {cl.name}
                      <button type="button" onClick={() => toggleClassroom(cl.id)} className="hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">Add time slots for each selected classroom.</p>
              {form.classrooms.map(cr => {
                const cl = classroomList.find(c => c.id === cr.classroom_id);
                return (
                  <div key={cr.classroom_id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <p className="font-semibold text-slate-800 text-sm">{cl?.name || cr.classroom_id}</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {cr.slots.map((slot, idx) => {
                        const timeInvalid = !!slot.end_time && !!slot.start_time && slot.end_time <= slot.start_time;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input type="time" value={slot.start_time}
                                onChange={e => updateSlot(cr.classroom_id, idx, 'start_time', e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 focus:border-[#0F2D52]" />
                              <span className="text-slate-400 text-sm flex-shrink-0">to</span>
                              <input type="time" value={slot.end_time}
                                onChange={e => updateSlot(cr.classroom_id, idx, 'end_time', e.target.value)}
                                className={cn('flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2',
                                  timeInvalid
                                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                                    : 'border-slate-200 focus:border-[#0F2D52] focus:ring-[#0F2D52]/20')} />
                              {cr.slots.length > 1 && (
                                <button onClick={() => removeSlot(cr.classroom_id, idx)}
                                  className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">&times;</button>
                              )}
                            </div>
                            {timeInvalid && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 flex-shrink-0" /> End time must be after start time
                              </p>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => addSlot(cr.classroom_id)}
                        className="text-[#0F2D52] text-sm font-medium hover:underline flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add Time Slot
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-[#0F2D52] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">{form.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{form.description}</p>
                    <p className="text-sm text-slate-600 mt-1"><strong>Date:</strong> {formatDate(form.conference_date)}</p>
                    {form.booking_close_at && <p className="text-sm text-slate-600"><strong>Booking Deadline:</strong> {new Date(form.booking_close_at).toLocaleDateString()}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {form.classrooms.map(cr => {
                  const cl = classroomList.find(c => c.id === cr.classroom_id);
                  return (
                    <div key={cr.classroom_id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <p className="font-medium text-slate-800 text-sm">{cl?.name || cr.classroom_id}</p>
                        <span className="text-xs text-slate-500">{cr.slots.length} slot{cr.slots.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {cr.slots.map((s, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                            {s.start_time} – {s.end_time} <span className="text-blue-400">· {s.capacity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button disabled={step === 1} onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-0">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-slate-400">Step {step} of 4</span>
          {step < 4 ? (
            <Button disabled={!canGoNext()} onClick={() => setStep(s => s + 1)}
              className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={submitting} onClick={handleSubmit}
              className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white min-w-[120px]">
              {submitting ? 'Saving...' : editData ? 'Save Changes' : 'Create Conference'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminConferences() {
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { userData, schoolSubdomain } = useUserContext();
  const schoolPrefix = `/${schoolSlug || schoolSubdomain || userData?.schoolId || 'goddard'}`;
  const schoolId = userData?.schoolId || '';

  const [tab, setTab] = useState<'active' | 'expired'>('active');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [conferences, setConferences] = useState<ConferenceListItem[]>([]);
  const [stats, setStats] = useState<ConferenceStats>({ total_conferences: 0, total_slots: 0, booked_slots: 0, available_slots: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ConferenceListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const conferenceBookingUrl = `${window.location.origin}/${schoolSubdomain || schoolSlug}/dashboard/conferences`;

  function copyConferenceLink(id: string) {
    navigator.clipboard.writeText(conferenceBookingUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }
  const PER_PAGE = 10;

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [list, s] = await Promise.all([listConferences(schoolId), getConferenceStats(schoolId)]);
      setConferences(list);
      setStats(s);
    } catch { } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const filtered = conferences.filter(c => {
    if (c.status !== tab) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleDelete() {
    if (!deleteId) return;
    try { await deleteConference(deleteId); setDeleteId(null); load(); } catch { }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pt-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2D52]/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-[#0F2D52]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Conferences</h1>
              <p className="text-sm text-slate-500">Manage parent-teacher conferences and booking schedules</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white gap-2">
            <Plus className="h-4 w-4" /> Create Conference
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Conferences', sub: 'Total created', value: stats.total_conferences, icon: <CalendarDays className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50', border: 'border-t-blue-400' },
            { label: 'Time Slots', sub: 'Across all conferences', value: stats.total_slots, icon: <Clock className="h-5 w-5 text-violet-500" />, color: 'bg-violet-50', border: 'border-t-violet-400' },
            { label: 'Booked Slots', sub: 'Parent bookings', value: stats.booked_slots, icon: <Users className="h-5 w-5 text-green-500" />, color: 'bg-green-50', border: 'border-t-green-400' },
            { label: 'Available Slots', sub: 'Still open to book', value: stats.available_slots, icon: <Calendar className="h-5 w-5 text-orange-500" />, color: 'bg-orange-50', border: 'border-t-orange-400' },
          ].map(s => (
            <div key={s.label} className={cn('bg-white rounded-xl border border-slate-100 border-t-2 p-5 shadow-sm flex flex-col gap-3', s.border)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{s.label}</p>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.color)}>{s.icon}</div>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table / list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search conferences..." className="pl-9" />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(['active', 'expired'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setPage(1); }}
                  className={cn('px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                    tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('table')}
                className={cn('p-2 rounded-lg', viewMode === 'table' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('grid')}
                className={cn('p-2 rounded-lg', viewMode === 'grid' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading...</div>
          ) : paged.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No {tab} conferences</p>
              <p className="text-slate-400 text-sm mt-1">
                {tab === 'active' ? 'Create your first conference to get started.' : 'Past conferences will appear here.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['CONFERENCE', 'CLASSROOMS', 'RESPONSE', 'STATUS', 'DATE', 'ACTIONS'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(conf => (
                      <tr key={conf.id} onClick={() => navigate(`${schoolPrefix}/admin/conferences/${conf.id}`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {conf.image_url ? (
                              <img src={conf.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0F2D52] to-[#1e4b83] flex-shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 text-sm leading-tight">{conf.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{conf.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {conf.classroom_tags.slice(0, 2).map(t => (
                              <span key={t.classroom_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.classroom_name}</span>
                            ))}
                            {conf.classroom_tags.length > 2 && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{conf.classroom_tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{conf.booked_slots}/{conf.total_slots}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: conf.total_slots > 0 ? `${(conf.booked_slots / conf.total_slots) * 100}%` : '0%' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                            conf.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                            {conf.status === 'active' ? 'Active' : 'Expired'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(conf.conference_date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button title="View Report" onClick={() => navigate(`${schoolPrefix}/admin/conferences/${conf.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F2D52] hover:bg-blue-50 transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button title="Copy parent booking link" onClick={() => copyConferenceLink(conf.id)}
                              className={cn('p-1.5 rounded-lg transition-colors', copiedId === conf.id ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-[#0F2D52] hover:bg-blue-50')}>
                              {copiedId === conf.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button title="Edit" onClick={() => { setEditItem(conf); setShowCreate(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <div className="relative group">
                              <button
                                disabled={conf.booked_slots > 0}
                                onClick={() => setDeleteId(conf.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none">
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {conf.booked_slots > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                                  <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                    {conf.booked_slots} booking(s) — cancel all before deleting
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <span>{page}/{totalPages || 1}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              </div>
            </>
          ) : (
            /* Grid view */
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map(conf => (
                <div key={conf.id} className="border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-24 relative">
                    {conf.image_url ? (
                      <img src={conf.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0F2D52] to-[#1e4b83]" />
                    )}
                    <span className={cn('absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full',
                      conf.status === 'active' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white')}>
                      {conf.status === 'active' ? 'Active' : 'Expired'}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-slate-900 text-sm truncate">{conf.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(conf.conference_date)}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Booked</span><span>{conf.booked_slots}/{conf.total_slots}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: conf.total_slots > 0 ? `${(conf.booked_slots / conf.total_slots) * 100}%` : '0%' }} /></div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => navigate(`${schoolPrefix}/admin/conferences/${conf.id}`)}>Report</Button>
                      <button title="Copy parent booking link" onClick={e => { e.stopPropagation(); copyConferenceLink(conf.id); }}
                        className={cn('p-1.5 rounded transition-colors', copiedId === conf.id ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-[#0F2D52]')}>
                        {copiedId === conf.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button onClick={() => { setEditItem(conf); setShowCreate(true); }} className="p-1.5 rounded text-slate-400 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                      <div className="relative group">
                        <button
                          disabled={conf.booked_slots > 0}
                          onClick={() => setDeleteId(conf.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {conf.booked_slots > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              {conf.booked_slots} booking(s) — cancel all before deleting
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit wizard */}
      {showCreate && (
        <CreateWizard
          schoolId={schoolId}
          schoolSubdomain={schoolSubdomain || schoolSlug || ''}
          editData={editItem}
          onClose={() => { setShowCreate(false); setEditItem(null); }}
          onCreated={load}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Delete Conference</p>
                <p className="text-sm text-slate-500">This will permanently delete all slots and bookings.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
