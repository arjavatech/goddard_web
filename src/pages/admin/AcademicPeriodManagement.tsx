import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Calendar, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => ({
  value: `${y}-${y + 1}`,
  label: `${y}–${y + 1}`,
}));

interface AcademicPeriod {
  id: string;
  name: string;
  startMonth: string;
  endMonth: string;
  academicYear: string;
}

const DUMMY: AcademicPeriod[] = [
  { id: '1', name: 'Spring Term',  startMonth: 'January',   endMonth: 'March',    academicYear: '2024-2025' },
  { id: '2', name: 'Summer Term',  startMonth: 'April',     endMonth: 'June',     academicYear: '2024-2025' },
  { id: '3', name: 'Fall Term',    startMonth: 'September', endMonth: 'December', academicYear: '2024-2025' },
];

export function AcademicPeriodManagement() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>(DUMMY);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicPeriod | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // form state
  const [name, setName] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [academicYear, setAcademicYear] = useState(YEAR_OPTIONS[1].value);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { showToast } = useToast();

  const openAdd = () => {
    setEditingPeriod(null);
    setName(''); setStartMonth(''); setEndMonth('');
    setAcademicYear(YEAR_OPTIONS[1].value);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEdit = (p: AcademicPeriod) => {
    setEditingPeriod(p);
    setName(p.name);
    setStartMonth(p.startMonth);
    setEndMonth(p.endMonth);
    setAcademicYear(p.academicYear);
    setErrors({});
    setIsDialogOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Period name is required';
    if (!startMonth) e.startMonth = 'Start month is required';
    if (!endMonth) e.endMonth = 'End month is required';
    if (startMonth && endMonth && MONTHS.indexOf(startMonth) > MONTHS.indexOf(endMonth))
      e.endMonth = 'End month must be after start month';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingPeriod) {
      setPeriods(prev => prev.map(p => p.id === editingPeriod.id
        ? { ...p, name: name.trim(), startMonth, endMonth, academicYear }
        : p
      ));
      showToast('success', `Period "${name.trim()}" updated`);
    } else {
      const newPeriod: AcademicPeriod = {
        id: Date.now().toString(),
        name: name.trim(),
        startMonth,
        endMonth,
        academicYear,
      };
      setPeriods(prev => [...prev, newPeriod]);
      showToast('success', `Period "${name.trim()}" created`);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const p = periods.find(x => x.id === id);
    setPeriods(prev => prev.filter(x => x.id !== id));
    setDeleteId(null);
    showToast('success', `Period "${p?.name}" deleted`);
  };

  const shortMonth = (m: string) => m.slice(0, 3);

  // Group by academic year for display
  const grouped = YEAR_OPTIONS.map(y => ({
    year: y,
    items: periods.filter(p => p.academicYear === y.value),
  })).filter(g => g.items.length > 0);

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">
              Academic Periods
            </h1>
            <p className="text-sm text-muted-foreground">
              Create and manage custom academic periods for your school
            </p>
          </div>
          <Button onClick={openAdd} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Period
          </Button>
        </div>

        {/* Grouped by year */}
        {periods.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No academic periods yet. Click "Add Period" to create one.
            </CardContent>
          </Card>
        ) : (
          grouped.map(group => (
            <div key={group.year.value} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amazon-teal" />
                <h2 className="text-sm font-semibold text-foreground">Academic Year {group.year.label}</h2>
                <Badge variant="secondary" className="text-xs">{group.items.length} period{group.items.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map(p => (
                  <Card key={p.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-xs gap-1 text-amazon-teal border-amazon-teal/40">
                              <Calendar className="h-3 w-3" />
                              {shortMonth(p.startMonth)} – {shortMonth(p.endMonth)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {p.startMonth} to {p.endMonth}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amazon-teal" onClick={() => openEdit(p)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Also show periods not in YEAR_OPTIONS */}
        {periods.filter(p => !YEAR_OPTIONS.find(y => y.value === p.academicYear)).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amazon-teal" /> Other
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {periods.filter(p => !YEAR_OPTIONS.find(y => y.value === p.academicYear)).map(p => (
                <Card key={p.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <Badge variant="outline" className="text-xs gap-1 mt-1.5 text-amazon-teal border-amazon-teal/40">
                          <Calendar className="h-3 w-3" />
                          {shortMonth(p.startMonth)} – {shortMonth(p.endMonth)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{p.academicYear.replace('-', '–')}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amazon-teal" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle>{editingPeriod ? 'Edit Period' : 'Add Academic Period'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Period Name</label>
              <Input
                placeholder="e.g. Spring Term, Q1, First Half"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Start / End month */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Month</label>
                <Select value={startMonth} onValueChange={v => { setStartMonth(v); setErrors(p => ({ ...p, startMonth: '', endMonth: '' })); }}>
                  <SelectTrigger className={`h-10 text-sm ${errors.startMonth ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="From" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.startMonth && <p className="text-xs text-red-600">{errors.startMonth}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Month</label>
                <Select value={endMonth} onValueChange={v => { setEndMonth(v); setErrors(p => ({ ...p, endMonth: '' })); }}>
                  <SelectTrigger className={`h-10 text-sm ${errors.endMonth ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="To" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.endMonth && <p className="text-xs text-red-600">{errors.endMonth}</p>}
              </div>
            </div>

            {/* Preview */}
            {startMonth && endMonth && (
              <div className="flex items-center gap-2 p-2 bg-amazon-teal/5 rounded-lg border border-amazon-teal/20">
                <Calendar className="h-4 w-4 text-amazon-teal flex-shrink-0" />
                <span className="text-sm text-amazon-teal font-medium">
                  {name.trim() || 'Period'}: {startMonth} – {endMonth}
                </span>
              </div>
            )}

            {/* Academic Year */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map(y => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="bg-amazon-teal hover:bg-amazon-teal/90" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              {editingPeriod ? 'Save Changes' : 'Add Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="w-[95vw] max-w-sm" preventClose>
          <DialogHeader>
            <DialogTitle>Delete Period</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete "<span className="font-medium text-foreground">{periods.find(p => p.id === deleteId)?.name}</span>"? This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
