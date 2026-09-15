import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Bell, CalendarDays, Check, ChevronDown, Clock, Edit, Grid2X2, List, Plus, Search, Settings2, Trash2, X, Mail, AlertCircle } from 'lucide-react';

const frequencies = ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Bimonthly'];
const viewFrequencies = frequencies.filter(value => value !== 'Daily');
const flags: Record<string, string> = { Daily: 'is_daily_report_active', Weekly: 'is_weekly_report_active', Biweekly: 'is_bi_weekly_report_active', Monthly: 'is_monthly_report_active', Bimonthly: 'is_bi_monthly_report_active' };
const selected = (item: any) => frequencies.filter(value => item[flags[value]]);
const primaryButton = 'bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white border-none shadow-xs';

export function ReportSettings() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'email'|'consolidated'|'notifications'|'company'|'checkout'>('email');

  // Email report settings
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [sortAsc, setSortAsc] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'view' | 'deleteRecipient' | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [recipientToDelete, setRecipientToDelete] = useState<{id: string, email: string, type: 'companyCC' | 'checkinTo' | 'checkinCC'} | null>(null);
  const [email, setEmail] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [viewFrequency, setViewFrequency] = useState('');
  const [saving, setSaving] = useState(false);
  const [biweeklyStartDate, setBiweeklyStartDate] = useState('');

  // Weekly notifications
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [companyCC, setCompanyCC] = useState<any[]>([]);
  const [ccEmail, setCCEmail] = useState('');

  // Check-in reminders
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [checkinRecipients, setCheckinRecipients] = useState<{ to: {id:string,email:string}[]; cc: {id:string,email:string}[] }>({ to: [], cc: [] });
  const [checkToEmail, setCheckToEmail] = useState('');
  const [checkCCEmail, setCheckCCEmail] = useState('');

  // Auto Checkout
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState(false);
  const [autoCheckoutTime, setAutoCheckoutTime] = useState('');
  const [showEnableAutoCheckoutModal, setShowEnableAutoCheckoutModal] = useState(false);
  const [showDisableAutoCheckoutModal, setShowDisableAutoCheckoutModal] = useState(false);
  const [modalAutoCheckoutTime, setModalAutoCheckoutTime] = useState('');
  const [isTogglingAutoCheckout, setIsTogglingAutoCheckout] = useState(false);
  const [isSavingAutoCheckoutTime, setIsSavingAutoCheckoutTime] = useState(false);
  const [autoCheckoutError, setAutoCheckoutError] = useState('');
  const [autoCheckoutSuccess, setAutoCheckoutSuccess] = useState('');

  // Recovery Tracker
  const [recoveryTrackerEnabled, setRecoveryTrackerEnabled] = useState(false);
  const [recoveryRecipients, setRecoveryRecipients] = useState<{ to: {id:string,email:string}[]; cc: {id:string,email:string}[] }>({ to: [], cc: [] });
  const [showEnableRecoveryModal, setShowEnableRecoveryModal] = useState(false);
  const [showDisableRecoveryModal, setShowDisableRecoveryModal] = useState(false);
  const [showAddRecoveryModal, setShowAddRecoveryModal] = useState(false);
  const [showDeleteRecoveryModal, setShowDeleteRecoveryModal] = useState(false);
  const [recoveryRecipientType, setRecoveryRecipientType] = useState<'to'|'cc'>('to');
  const [newRecoveryEmail, setNewRecoveryEmail] = useState('');
  const [recoveryEmailChips, setRecoveryEmailChips] = useState<string[]>([]);
  const [recoveryEmailError, setRecoveryEmailError] = useState('');
  const [deletingRecoveryId, setDeletingRecoveryId] = useState<string | null>(null);
  const [deletingRecoveryEmail, setDeletingRecoveryEmail] = useState('');
  const [isTogglingRecovery, setIsTogglingRecovery] = useState(false);
  const [isAddingRecoveryRecipient, setIsAddingRecoveryRecipient] = useState(false);
  const [isDeletingRecoveryRecipient, setIsDeletingRecoveryRecipient] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Load all data
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [recipients, frequency, weekly, cc, checkin, recipients2, autoCheckout, recoveryTracker, recoveryRecipients] = await Promise.all([
        TapTimeService.recipients(),
        TapTimeService.viewFrequency().catch(() => ({ frequency: '' })),
        TapTimeService.weeklyNotifications().catch(() => ({ enabled: false })),
        TapTimeService.companyCC().catch(() => ({ items: [] })),
        TapTimeService.checkinReminder().catch(() => ({ enabled: false })),
        TapTimeService.checkinRecipients().catch(() => ({ to: [], cc: [] })),
        TapTimeService.autoCheckout().catch(() => ({ is_auto_checkout_enabled: false, auto_checkout_time: null })),
        TapTimeService.recoveryTracker().catch(() => ({ enabled: false })),
        TapTimeService.recoveryTrackerRecipients().catch(() => ({ to: [], cc: [] }))
      ]);

      setItems(recipients.items);
      setViewFrequency(frequency.frequency || '');
      setBiweeklyStartDate(frequency.salary_report_start_date || '');
      setWeeklyEnabled(weekly.enabled);
      setCompanyCC(cc.items || []);
      setCheckinEnabled(checkin.enabled);
      setCheckinRecipients(recipients2);
      setAutoCheckoutEnabled(autoCheckout.is_auto_checkout_enabled);
      setAutoCheckoutTime(autoCheckout.auto_checkout_time || '');
      setRecoveryTrackerEnabled(recoveryTracker.enabled);
      setRecoveryRecipients(recoveryRecipients);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() =>
    items
      .filter(item => item.company_reporter_email.toLowerCase().includes(query.toLowerCase()) || selected(item).join(' ').toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (sortAsc ? 1 : -1) * a.company_reporter_email.localeCompare(b.company_reporter_email)),
    [items, query, sortAsc]
  );

  const open = (kind: 'add' | 'edit' | 'delete' | 'view', item?: any) => {
    setModal(kind);
    setEditing(item || null);
    setEmail(item?.company_reporter_email || '');
    setChosen(item ? selected(item) : []);
    if (kind === 'view') {
      setError('');
    }
  };

  const toggle = (value: string) => setChosen(current => current.includes(value) ? current.filter(x => x !== value) : current.length < 2 ? [...current, value] : current);
  const toggleFrequency = (value: string) => {
    setViewFrequency(value);
    if (value !== 'Biweekly') {
      setBiweeklyStartDate('');
    }
  };

  const save = async () => {
    if (!email || !chosen.length) return;
    setSaving(true);
    try {
      if (modal === 'add')
        await TapTimeService.createRecipient({ email, frequencies: chosen });
      else
        await TapTimeService.updateRecipient(editing.company_reporter_email, { email, frequencies: chosen });
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await TapTimeService.deleteRecipient(editing.company_reporter_email);
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveView = async () => {
    if (!viewFrequency) return;
    if (viewFrequency === 'Biweekly' && !biweeklyStartDate) {
      setError('Start date is required for Biweekly frequency');
      return;
    }
    setSaving(true);
    try {
      await TapTimeService.updateViewFrequency(viewFrequency, viewFrequency === 'Biweekly' ? biweeklyStartDate : undefined);
      setModal(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekly = async () => {
    setIsSaving(true);
    try {
      await TapTimeService.setWeeklyNotifications(!weeklyEnabled);
      setWeeklyEnabled(!weeklyEnabled);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCheckin = async () => {
    setIsSaving(true);
    try {
      await TapTimeService.setCheckinReminder(!checkinEnabled);
      setCheckinEnabled(!checkinEnabled);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAutoCheckout = async () => {
    if (autoCheckoutEnabled) {
      setShowDisableAutoCheckoutModal(true);
    } else {
      setShowEnableAutoCheckoutModal(true);
      setModalAutoCheckoutTime(autoCheckoutTime);
    }
  };

  const confirmEnableAutoCheckout = async () => {
    if (!modalAutoCheckoutTime) {
      setAutoCheckoutError('Please set a time');
      return;
    }
    setIsTogglingAutoCheckout(true);
    try {
      await TapTimeService.setAutoCheckout(true, modalAutoCheckoutTime);
      setAutoCheckoutEnabled(true);
      setAutoCheckoutTime(modalAutoCheckoutTime);
      setAutoCheckoutSuccess('Auto Checkout enabled');
      setShowEnableAutoCheckoutModal(false);
      setTimeout(() => setAutoCheckoutSuccess(''), 3000);
    } catch (e: any) {
      setAutoCheckoutError(e.message);
    } finally {
      setIsTogglingAutoCheckout(false);
    }
  };

  const confirmDisableAutoCheckout = async () => {
    setIsTogglingAutoCheckout(true);
    try {
      await TapTimeService.setAutoCheckout(false);
      setAutoCheckoutEnabled(false);
      setAutoCheckoutSuccess('Auto Checkout disabled');
      setShowDisableAutoCheckoutModal(false);
      setTimeout(() => setAutoCheckoutSuccess(''), 3000);
    } catch (e: any) {
      setAutoCheckoutError(e.message);
    } finally {
      setIsTogglingAutoCheckout(false);
    }
  };

  const toggleRecoveryTracker = async () => {
    if (recoveryTrackerEnabled) {
      setShowDisableRecoveryModal(true);
    } else {
      setShowEnableRecoveryModal(true);
    }
  };

  const confirmEnableRecoveryTracker = async () => {
    setIsTogglingRecovery(true);
    try {
      await TapTimeService.setRecoveryTracker(true);
      setRecoveryTrackerEnabled(true);
      setShowEnableRecoveryModal(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsTogglingRecovery(false);
    }
  };

  const confirmDisableRecoveryTracker = async () => {
    setIsTogglingRecovery(true);
    try {
      await TapTimeService.setRecoveryTracker(false);
      setRecoveryTrackerEnabled(false);
      setShowDisableRecoveryModal(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsTogglingRecovery(false);
    }
  };

  const addRecoveryEmailChip = () => {
    const email = newRecoveryEmail.trim();
    if (!email) {
      setRecoveryEmailError('Email cannot be empty');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setRecoveryEmailError('Invalid email format');
      return;
    }
    if (recoveryEmailChips.includes(email)) {
      setRecoveryEmailError('Email already added');
      return;
    }
    setRecoveryEmailChips([...recoveryEmailChips, email]);
    setNewRecoveryEmail('');
    setRecoveryEmailError('');
  };

  const removeRecoveryEmailChip = (email: string) => {
    setRecoveryEmailChips(recoveryEmailChips.filter(e => e !== email));
  };

  const handleAddRecoveryRecipient = async () => {
    if (recoveryEmailChips.length === 0) {
      setRecoveryEmailError('Please add at least one email');
      return;
    }
    setIsAddingRecoveryRecipient(true);
    try {
      for (const email of recoveryEmailChips) {
        await TapTimeService.addRecoveryTrackerRecipient(email, recoveryRecipientType);
      }
      setShowAddRecoveryModal(false);
      setNewRecoveryEmail('');
      setRecoveryEmailChips([]);
      setRecoveryEmailError('');
      await load();
    } catch (e: any) {
      setRecoveryEmailError(e.message);
    } finally {
      setIsAddingRecoveryRecipient(false);
    }
  };

  const handleRemoveRecoveryRecipient = async (recipientId: string) => {
    setDeletingRecoveryId(recipientId);
    setDeletingRecoveryEmail('');
    setShowDeleteRecoveryModal(true);
  };

  const confirmDeleteRecoveryRecipient = async () => {
    if (!deletingRecoveryId) return;
    setIsDeletingRecoveryRecipient(true);
    try {
      await TapTimeService.removeRecoveryTrackerRecipient(deletingRecoveryId);
      setShowDeleteRecoveryModal(false);
      setDeletingRecoveryId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDeletingRecoveryRecipient(false);
    }
  };

  const addNotifRecipient = async (section: 'employeeCC' | 'checkinTo' | 'checkinCC') => {
    const emailMap = { employeeCC: ccEmail, checkinTo: checkToEmail, checkinCC: checkCCEmail };
    const setEmailMap = { employeeCC: setCCEmail, checkinTo: setCheckToEmail, checkinCC: setCheckCCEmail };
    const emailToAdd = emailMap[section];
    if (!emailToAdd) return;
    setIsSaving(true);
    try {
      if (section === 'employeeCC') {
        await TapTimeService.addCompanyCC(emailToAdd);
      } else {
        await TapTimeService.addCheckinRecipient(emailToAdd, section === 'checkinTo' ? 'to' : 'cc');
      }
      setEmailMap[section]('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteRecipientConfirm = (id: string, email: string, type: 'companyCC' | 'checkinTo' | 'checkinCC') => {
    setRecipientToDelete({id, email, type});
    setModal('deleteRecipient');
  };

  const confirmDeleteRecipient = async () => {
    if (!recipientToDelete) return;
    setIsSaving(true);
    try {
      if (recipientToDelete.type === 'companyCC') {
        await TapTimeService.removeCompanyCC(recipientToDelete.id);
      } else {
        // For checkin recipients, we need to find the actual recipient ID
        const type = recipientToDelete.type === 'checkinTo' ? 'to' : 'cc';
        const recipients = type === 'to' ? checkinRecipients.to : checkinRecipients.cc;
        const recipient = recipients.find(r => r.email === recipientToDelete.email);
        if (recipient) {
          await TapTimeService.removeCheckinRecipient(recipient.id);
        }
      }
      setModal(null);
      setRecipientToDelete(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const editor = modal === 'add' || modal === 'edit';

  return (
    <AdminLayout>
      <main className="min-h-full bg-[#f6f9fd] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                <Settings2 className="h-5 w-5 text-[#0F2D52]" />
                Report Settings
              </h1>
              <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">Configure email notifications and report frequencies</p>
            </div>
            {activeTab === 'email' && <Button className={primaryButton} onClick={() => open('add')}><Plus className="mr-2 h-4 w-4" />Add Setting</Button>}
          </header>

          {/* Tab Navigation */}
          <div className="border-b mb-6 bg-white rounded-t-lg shadow-sm">
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto px-4">
              {[
                { key: 'email', label: 'Email Reports', short: 'Reports', icon: Mail },
                { key: 'consolidated', label: 'Report Schedule', short: 'Schedule', icon: CalendarDays },
                { key: 'notifications', label: 'Notifications', short: 'Notifs', icon: Bell },
                { key: 'company', label: 'Company Settings', short: 'Company', icon: Settings2 },
                { key: 'checkout', label: 'Auto Checkout', short: 'Checkout', icon: Clock },
              ].map(({ key, label, short, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-colors ${
                    activeTab === key
                      ? 'border-[#0F2D52] text-[#0F2D52]'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Email Reports Tab */}
          {activeTab === 'email' && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Email Report Settings</h2>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">{rows.length} configured recipient{rows.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <span className="text-[#0F2D52]">{sortAsc ? '↑' : '↓'}</span>
                          <span className="ml-1.5">Sort</span>
                          <ChevronDown className="ml-3 h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                        <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setSortAsc(true)}>Email: A–Z</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => setSortAsc(false)}>Email: Z–A</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ViewToggle value={view} onChange={setView} />
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${query ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                  <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email settings..." className="pl-9" />
                </div>
              </div>
              {loading ? (
                <div className="py-20"><Loading size="md" message="Loading report settings…" /></div>
              ) : (
                <>
                  {error && <p className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                  {rows.length === 0 ? (
                    <div className="py-14 text-center text-sm text-slate-400">No email settings found.</div>
                  ) : view === 'grid' ? (
                    <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                      {rows.map(item => <RecipientCard key={item.company_reporter_email} item={item} onEdit={() => open('edit', item)} onDelete={() => open('delete', item)} />)}
                    </div>
                  ) : (
                    <RecipientTable rows={rows} onEdit={item => open('edit', item)} onDelete={item => open('delete', item)} />
                  )}
                </>
              )}
            </section>
          )}

          {/* Report Schedule Tab */}
          {activeTab === 'consolidated' && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-[#0F2D52]" />Email Consolidated Report Settings</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Configure the default report viewing frequency</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="border-y border-slate-200/85 px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Current Frequency</th>
                      <th className="border-y border-slate-200/85 px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-50 hover:bg-[#F8FAFC]">
                      <td className="px-5 py-4">
                        {viewFrequency ? (
                          <div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{viewFrequency}</span>
                            {viewFrequency === 'Biweekly' && biweeklyStartDate && (
                              <p className="text-xs text-slate-500 mt-2">
                                Start date: <span className="font-semibold">{new Date(`${biweeklyStartDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Not configured</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => open('view')}><Edit className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bell className="h-4 w-4 text-[#0F2D52]" />Employee Notifications</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Manage weekly reports and CC recipients</p>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">Weekly Notifications</p>
                    <p className={`text-xs mt-0.5 ${weeklyEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>{weeklyEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <Button className={weeklyEnabled ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white border-none' : primaryButton} onClick={toggleWeekly} disabled={isSaving}>
                    {isSaving ? 'Saving…' : weeklyEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-slate-900">CC Recipients</p>
                    <div className="flex gap-2 items-center">
                      <Input type="email" placeholder="recipient@company.com" value={ccEmail} onChange={e => setCCEmail(e.target.value)} onKeyPress={e => e.key === 'Enter' && addNotifRecipient('employeeCC')} className="border-slate-900" />
                      <Button variant="outline" onClick={() => addNotifRecipient('employeeCC')} disabled={isSaving || !ccEmail} className="border-slate-900 h-10"><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/80">
                        <tr>
                          <th className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                          <th className="border-b border-slate-100 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyCC.length === 0 ? (
                          <tr><td colSpan={2} className="px-4 py-4 text-center text-xs italic text-slate-400">No CC recipients configured.</td></tr>
                        ) : (
                          companyCC.map((item: any) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8FAFC]">
                              <td className="px-4 py-3 text-slate-900">{item.email}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => openDeleteRecipientConfirm(item.id, item.email, 'companyCC')} className="text-[#0F2D52] hover:text-[#1E4B83]"><Trash2 className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Company Settings Tab */}
          {activeTab === 'company' && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Settings2 className="h-4 w-4 text-[#0F2D52]" />Company Settings</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Configure check-in reminders and recovery tracker</p>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Check-In Reminders */}
                <div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">Check-In Reminders</p>
                      <p className={`text-xs mt-0.5 ${checkinEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>{checkinEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <Button className={checkinEnabled ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white border-none' : primaryButton} onClick={toggleCheckin} disabled={isSaving}>
                      {isSaving ? 'Saving…' : checkinEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                  {checkinEnabled && (
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-900">To Recipients</p>
                          <div className="flex gap-2 items-center">
                            <Input type="email" placeholder="recipient@company.com" value={checkToEmail} onChange={e => setCheckToEmail(e.target.value)} onKeyPress={e => e.key === 'Enter' && addNotifRecipient('checkinTo')} className="border-slate-900" />
                            <Button variant="outline" onClick={() => addNotifRecipient('checkinTo')} disabled={isSaving || !checkToEmail} className="border-slate-900 h-10"><Plus className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {checkinRecipients.to.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center text-xs italic text-slate-400">No To recipients configured.</td></tr>
                              ) : (
                                checkinRecipients.to.map((item: any) => (
                                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8FAFC]">
                                    <td className="px-4 py-3 text-slate-900">{item.email}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => openDeleteRecipientConfirm(item.id, item.email, 'checkinTo')} className="text-[#0F2D52] hover:text-[#1E4B83]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-900">CC Recipients</p>
                          <div className="flex gap-2 items-center">
                            <Input type="email" placeholder="recipient@company.com" value={checkCCEmail} onChange={e => setCheckCCEmail(e.target.value)} onKeyPress={e => e.key === 'Enter' && addNotifRecipient('checkinCC')} className="border-slate-900" />
                            <Button variant="outline" onClick={() => addNotifRecipient('checkinCC')} disabled={isSaving || !checkCCEmail} className="border-slate-900 h-10"><Plus className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {checkinRecipients.cc.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center text-xs italic text-slate-400">No CC recipients configured.</td></tr>
                              ) : (
                                checkinRecipients.cc.map((item: any) => (
                                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8FAFC]">
                                    <td className="px-4 py-3 text-slate-900">{item.email}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => openDeleteRecipientConfirm(item.id, item.email, 'checkinCC')} className="text-[#0F2D52] hover:text-[#1E4B83]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recovery Tracker */}
                <div>
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">Recovery Tracker</p>
                      <p className={`text-xs mt-0.5 ${recoveryTrackerEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>{recoveryTrackerEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <Button className={recoveryTrackerEnabled ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white border-none' : primaryButton} onClick={toggleRecoveryTracker} disabled={isTogglingRecovery}>
                      {isTogglingRecovery ? 'Saving…' : recoveryTrackerEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                  {recoveryTrackerEnabled && (
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-900">To Recipients</p>
                          <Button size="sm" variant="outline" onClick={() => { setRecoveryRecipientType('to'); setShowAddRecoveryModal(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recoveryRecipients.to.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center text-xs italic text-slate-400">No To recipients configured.</td></tr>
                              ) : (
                                recoveryRecipients.to.map((item: any) => (
                                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8FAFC]">
                                    <td className="px-4 py-3 text-slate-900">{item.email}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleRemoveRecoveryRecipient(item.id)} className="text-[#0F2D52] hover:text-[#1E4B83]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-900">CC Recipients (Optional)</p>
                          <Button size="sm" variant="outline" onClick={() => { setRecoveryRecipientType('cc'); setShowAddRecoveryModal(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                                <th className="border-b border-slate-100 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recoveryRecipients.cc.length === 0 ? (
                                <tr><td colSpan={2} className="px-4 py-4 text-center text-xs italic text-slate-400">No CC recipients configured.</td></tr>
                              ) : (
                                recoveryRecipients.cc.map((item: any) => (
                                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-[#F8FAFC]">
                                    <td className="px-4 py-3 text-slate-900">{item.email}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleRemoveRecoveryRecipient(item.id)} className="text-[#0F2D52] hover:text-[#1E4B83]"><Trash2 className="h-4 w-4" /></button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Auto Checkout Tab */}
          {activeTab === 'checkout' && (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Clock className="h-4 w-4 text-[#0F2D52]" />Auto Checkout</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">Automatically check out employees at the configured time</p>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">Auto Checkout</p>
                    <p className={`text-xs mt-0.5 ${autoCheckoutEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>{autoCheckoutEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <Button className={autoCheckoutEnabled ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white border-none' : primaryButton} onClick={toggleAutoCheckout} disabled={isTogglingAutoCheckout}>
                    {isTogglingAutoCheckout ? 'Saving…' : autoCheckoutEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                {autoCheckoutEnabled && (
                  <div className="px-5 py-4">
                    {autoCheckoutSuccess && (
                      <div className="mb-4 p-3 rounded-md flex items-start gap-2 bg-green-50 border border-green-200">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-600">{autoCheckoutSuccess}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Checkout Time</label>
                        <p className="text-sm text-slate-600 mt-1">{autoCheckoutTime || 'Not set'}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setShowEnableAutoCheckoutModal(true); setModalAutoCheckoutTime(autoCheckoutTime); }}><Edit className="h-4 w-4 mr-1" />Change Time</Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Email Settings Modal */}
      <Dialog open={!!modal} onOpenChange={() => !isSaving && setModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editor ? <Edit className="h-5 w-5 text-[#0F2D52]" /> : modal === 'view' ? <CalendarDays className="h-5 w-5 text-[#0F2D52]" /> : <Trash2 className="h-5 w-5 text-red-500" />}
              {modal === 'add' ? 'Add Email Setting' : modal === 'edit' ? 'Edit Email Setting' : modal === 'view' ? 'Edit View Settings' : modal === 'deleteRecipient' ? 'Delete Recipient' : 'Delete Email Setting'}
            </DialogTitle>
            <DialogDescription>
              {editor ? 'Configure email notification settings.' : modal === 'view' ? 'Configure default report viewing frequency.' : modal === 'deleteRecipient' ? 'This action cannot be undone.' : `Delete the setting for ${editing?.company_reporter_email}?`}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-5">
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                Email Address *
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
              </label>
              <FrequencyButtons values={chosen} toggle={toggle} />
            </div>
          )}
          {modal === 'view' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {viewFrequencies.map(value => (
                  <Button key={value} variant={viewFrequency === value ? 'default' : 'outline'} className={viewFrequency === value ? primaryButton : ''} onClick={() => toggleFrequency(value)}>
                    {value}
                  </Button>
                ))}
              </div>
              {viewFrequency === 'Biweekly' && (
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Biweekly Start Date *
                  <Input type="date" value={biweeklyStartDate} onChange={e => setBiweeklyStartDate(e.target.value)} />
                </label>
              )}
            </div>
          )}
          {modal === 'deleteRecipient' && (
            <div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold">{recipientToDelete?.email}</span> from the recipient list?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)} disabled={isSaving || saving}>Cancel</Button>
            <Button className={modal === 'delete' ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white' : primaryButton} disabled={isSaving || saving || (editor && (!email || !chosen.length))} onClick={modal === 'deleteRecipient' ? confirmDeleteRecipient : modal === 'delete' ? remove : modal === 'view' ? saveView : save}>
              {modal === 'deleteRecipient' ? 'Delete Recipient' : isSaving || saving ? 'Saving…' : modal === 'delete' ? 'Delete Setting' : modal === 'view' ? 'Update Settings' : modal === 'edit' ? 'Update Setting' : 'Save Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable Auto Checkout Modal */}
      <Dialog open={showEnableAutoCheckoutModal} onOpenChange={setShowEnableAutoCheckoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-[#0F2D52]" />Set Auto Checkout Time</DialogTitle>
            <DialogDescription>Configure the time when employees will be automatically checked out</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {autoCheckoutError && (
              <div className="p-3 rounded-md flex items-start gap-2 bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{autoCheckoutError}</p>
              </div>
            )}
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Checkout Time *
              <Input type="time" value={modalAutoCheckoutTime} onChange={(e) => { setModalAutoCheckoutTime(e.target.value); setAutoCheckoutError(''); }} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnableAutoCheckoutModal(false)} disabled={isTogglingAutoCheckout}>Cancel</Button>
            <Button className={primaryButton} onClick={confirmEnableAutoCheckout} disabled={isTogglingAutoCheckout}>
              {isTogglingAutoCheckout ? 'Enabling...' : 'Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Auto Checkout Modal */}
      <Dialog open={showDisableAutoCheckoutModal} onOpenChange={setShowDisableAutoCheckoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" />Disable Auto Checkout</DialogTitle>
            <DialogDescription>Are you sure you want to disable auto checkout?</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600">Employees will no longer be automatically checked out.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableAutoCheckoutModal(false)} disabled={isTogglingAutoCheckout}>Cancel</Button>
            <Button className="bg-red-500 text-white hover:bg-red-600 hover:text-white" onClick={confirmDisableAutoCheckout} disabled={isTogglingAutoCheckout}>
              {isTogglingAutoCheckout ? 'Disabling...' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable Recovery Tracker Modal */}
      <Dialog open={showEnableRecoveryModal} onOpenChange={setShowEnableRecoveryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#0F2D52]" />Enable Recovery Tracker</DialogTitle>
            <DialogDescription>Configure escalation emails for unresolved auto-checkouts</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600">Add recipients after enabling the recovery tracker.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnableRecoveryModal(false)} disabled={isTogglingRecovery}>Cancel</Button>
            <Button className={primaryButton} onClick={confirmEnableRecoveryTracker} disabled={isTogglingRecovery}>
              {isTogglingRecovery ? 'Enabling...' : 'Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Recovery Tracker Modal */}
      <Dialog open={showDisableRecoveryModal} onOpenChange={setShowDisableRecoveryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" />Disable Recovery Tracker</DialogTitle>
            <DialogDescription>Are you sure you want to disable recovery tracker?</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600">No escalation emails will be sent for unresolved auto-checkouts.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableRecoveryModal(false)} disabled={isTogglingRecovery}>Cancel</Button>
            <Button className="bg-red-500 text-white hover:bg-red-600 hover:text-white" onClick={confirmDisableRecoveryTracker} disabled={isTogglingRecovery}>
              {isTogglingRecovery ? 'Disabling...' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Recovery Recipient Modal */}
      <Dialog open={showAddRecoveryModal} onOpenChange={setShowAddRecoveryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-[#0F2D52]" />Add Recovery Tracker Recipient</DialogTitle>
            <DialogDescription>Add a {recoveryRecipientType === 'to' ? 'To' : 'CC'} recipient for recovery tracker escalations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Recipient Type</label>
              <div className="flex gap-2">
                <Button variant={recoveryRecipientType === 'to' ? 'default' : 'outline'} size="sm" onClick={() => setRecoveryRecipientType('to')} className={recoveryRecipientType === 'to' ? primaryButton : ''}>To</Button>
                <Button variant={recoveryRecipientType === 'cc' ? 'default' : 'outline'} size="sm" onClick={() => setRecoveryRecipientType('cc')} className={recoveryRecipientType === 'cc' ? primaryButton : ''}>CC</Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address(es) *</label>
              {recoveryEmailChips.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md min-h-12">
                  {recoveryEmailChips.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-[#0F2D52] text-white rounded-full text-sm">
                      <span>{email}</span>
                      <button type="button" onClick={() => removeRecoveryEmailChip(email)} className="hover:bg-[#1E4B83] rounded-full w-5 h-5 flex items-center justify-center" title="Remove email">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input id="recoveryEmail" type="email" value={newRecoveryEmail} onChange={(e) => { setNewRecoveryEmail(e.target.value); setRecoveryEmailError(''); }} onKeyPress={(e) => e.key === 'Enter' && addRecoveryEmailChip()} placeholder="Enter email address" className="flex-1 text-sm" />
                <Button variant="outline" onClick={addRecoveryEmailChip} className="px-3 bg-[#0F2D52] hover:bg-[#1E4B83] text-white" title="Add email"><Plus className="w-4 h-4" /></Button>
              </div>
              {recoveryEmailError && <p className="text-sm text-red-600">{recoveryEmailError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddRecoveryModal(false); setNewRecoveryEmail(''); setRecoveryEmailChips([]); setRecoveryEmailError(''); }} disabled={isAddingRecoveryRecipient}>Cancel</Button>
            <Button className={primaryButton} onClick={handleAddRecoveryRecipient} disabled={isAddingRecoveryRecipient || recoveryEmailChips.length === 0}>
              {isAddingRecoveryRecipient ? 'Adding...' : 'Add Recipient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Recovery Recipient Modal */}
      <Dialog open={showDeleteRecoveryModal} onOpenChange={setShowDeleteRecoveryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-600" />Remove Recipient</DialogTitle>
            <DialogDescription>Are you sure you want to remove this recipient?</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRecoveryModal(false)} disabled={isDeletingRecoveryRecipient}>Cancel</Button>
            <Button className="bg-red-500 text-white hover:bg-red-600 hover:text-white" onClick={confirmDeleteRecoveryRecipient} disabled={isDeletingRecoveryRecipient}>
              {isDeletingRecoveryRecipient ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function ViewToggle({ value, onChange }: { value: 'table' | 'grid'; onChange: (value: 'table' | 'grid') => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200/50 bg-slate-100/80 p-1">
      <button type="button" onClick={() => onChange('table')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${value === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
        <List className="h-3.5 w-3.5" />Table
      </button>
      <button type="button" onClick={() => onChange('grid')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${value === 'grid' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
        <Grid2X2 className="h-3.5 w-3.5" />Cards
      </button>
    </div>
  );
}

function Chips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(value => (
        <span key={value} className="rounded-full bg-[#EFF5FB] px-2.5 py-1 text-xs font-bold text-[#0F2D52]">{value}</span>
      ))}
    </div>
  );
}

function RecipientTable({ rows, onEdit, onDelete }: { rows: any[]; onEdit: (item: any) => void; onDelete: (item: any) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            {['Email Address', 'Frequency', 'Actions'].map((header, index) => (
              <th key={header} className={`border-y border-slate-200/85 px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 ${index === 2 ? 'text-right' : ''}`}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(item => (
            <tr key={item.company_reporter_email} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
              <td className="px-5 py-4 font-bold text-[#0F2D52]">{item.company_reporter_email}</td>
              <td className="px-5 py-4"><Chips values={selected(item)} /></td>
              <td className="px-5 py-4 text-right">
                <div className="inline-flex gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit email setting" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete email setting" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecipientCard({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-[#0F2D52]">{item.company_reporter_email}</p>
          <div className="mt-3"><Chips values={selected(item)} /></div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit email setting" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete email setting" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function FrequencyButtons({ values, toggle }: { values: string[]; toggle: (value: string) => void }) {
  const frequencies = ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Bimonthly'];
  const primaryButton = 'bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white border-none shadow-xs';
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Report Frequency * (Max 2)</p>
      <div className="grid grid-cols-2 gap-2">
        {frequencies.map(value => (
          <Button key={value} variant={values.includes(value) ? 'default' : 'outline'} className={values.includes(value) ? primaryButton : ''} disabled={!values.includes(value) && values.length >= 2} onClick={() => toggle(value)}>
            {values.includes(value) && <Check className="mr-1 h-3 w-3" />}{value}
          </Button>
        ))}
      </div>
    </div>
  );
}
