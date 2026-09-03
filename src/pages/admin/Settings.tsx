import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Tag, Trash2, MapPin, Settings2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import {
  fetchRequestSettings,
  updateRequestSettings,
  type RequestSetting,
  type RequestSettingOption,
} from '../../services/api/settings';

type ListEditorProps = {
  title: string;
  icon: React.ReactNode;
  setting: RequestSetting;
  items: RequestSettingOption[];
  loading: boolean;
  onAdd: (setting: RequestSetting, label: string) => Promise<void>;
  onUpdate: (setting: RequestSetting, item: RequestSettingOption, label: string) => Promise<void>;
  onDelete: (setting: RequestSetting, item: RequestSettingOption) => Promise<void>;
  placeholder: string;
};

function SkeletonRows() {
  return (
    <ul className="space-y-2">
      {[1, 2, 3].map(i => (
        <li key={i} className="h-9 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </ul>
  );
}

function ListEditor({ title, icon, setting, items, loading, onAdd, onUpdate, onDelete, placeholder }: ListEditorProps) {
  const { showToast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RequestSettingOption | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const add = async () => {
    const label = newItem.trim();
    if (!label) return;
    setSaving(true);
    try {
      await onAdd(setting, label);
      setNewItem('');
      showToast('success', `Added to ${title}.`, 'Added');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to add item.', 'Error');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing || !editLabel.trim()) return;
    setSaving(true);
    try {
      await onUpdate(setting, editing, editLabel.trim());
      setEditing(null);
      showToast('success', 'Item updated.', 'Updated');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update item.', 'Error');
    } finally { setSaving(false); }
  };

  const remove = async (item: RequestSettingOption) => {
    setDeletingId(item.id);
    try {
      await onDelete(setting, item);
      showToast('success', 'Item removed and matching request values cleared.', 'Removed');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to remove item.', 'Error');
    } finally { setDeletingId(null); }
  };

  return (
    <>
      <Card className="min-w-0 rounded-2xl border border-slate-200 shadow-sm bg-white">
        <CardHeader className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0F2D52]/8 text-[#0F2D52]">{icon}</span>
              {title}
            </CardTitle>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full tabular-nums">
              {loading ? '—' : items.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder={placeholder}
              disabled={saving}
              className="min-w-0 flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 focus:border-[#0F2D52] transition-all placeholder:text-slate-400 disabled:opacity-50"
            />
            <Button
              type="button"
              onClick={add}
              disabled={!newItem.trim() || saving}
              className="h-9 shrink-0 px-4 rounded-xl bg-[#0F2D52] text-white text-xs font-semibold hover:bg-[#1E4B83] transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving
                ? <span className="animate-spin rounded-full border-2 border-white border-t-transparent h-3.5 w-3.5" />
                : <Plus className="w-3.5 h-3.5" />}
              Add
            </Button>
          </div>

          {loading ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-2xl mb-2 opacity-30">📭</span>
              <p className="text-xs text-slate-400 italic">No items yet. Add one above.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map(item => (
                <li key={item.id} className="group flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-white transition-all">
                  <span className="min-w-0 truncate text-sm text-slate-700">{item.label}</span>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(item); setEditLabel(item.label); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F2D52] hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      {deletingId === item.id
                        ? <span className="animate-spin rounded-full border-2 border-slate-400 border-t-transparent h-3.5 w-3.5 inline-block" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">Edit {title}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Update this value for future and matching existing requests.</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), saveEdit())}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 focus:border-[#0F2D52] transition-all"
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row pt-1">
            <Button variant="outline" onClick={() => setEditing(null)} className="w-full sm:w-auto rounded-xl">Cancel</Button>
            <Button onClick={saveEdit} disabled={!editLabel.trim() || saving} className="w-full sm:w-auto rounded-xl bg-[#0F2D52] text-white hover:bg-[#1E4B83] flex items-center gap-2">
              {saving && <span className="animate-spin rounded-full border-2 border-white border-t-transparent h-3.5 w-3.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Settings() {
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const schoolId = userData?.schoolId ?? '';
  const [categories, setCategories] = useState<RequestSettingOption[]>([]);
  const [locations, setLocations] = useState<RequestSettingOption[]>([]);
  const [loading, setLoading] = useState(true);

  const applySettings = (settings: Awaited<ReturnType<typeof fetchRequestSettings>>) => {
    setCategories(settings.requestCategories);
    setLocations(settings.location);
  };

  const loadSettings = async () => {
    if (!schoolId) return;
    setLoading(true);
    try { applySettings(await fetchRequestSettings(schoolId)); }
    catch (error) { showToast('error', error instanceof Error ? error.message : 'Failed to load request settings.', 'Error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSettings(); }, [schoolId]);
  const mutate = async (operation: Parameters<typeof updateRequestSettings>[1][number]) => {
    applySettings(await updateRequestSettings(schoolId, [operation]));
  };

  return (
    <AdminLayout>
      <div className="mx-auto mt-4 w-full max-w-7xl space-y-6 px-2 py-4 sm:mt-6 sm:px-4 sm:py-6">
        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0F2D52]/8 text-[#0F2D52]">
              <Settings2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Settings</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage procurement categories and campus locations.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ListEditor
            title="Procurement Categories"
            icon={<Tag className="w-4 h-4" />}
            setting="request_categories"
            items={categories}
            loading={loading}
            placeholder="e.g. Art Supplies"
            onAdd={(setting, label) => mutate({ operation: 'add', setting, label })}
            onUpdate={(setting, item, label) => mutate({ operation: 'update', setting, optionId: item.id, label })}
            onDelete={(setting, item) => mutate({ operation: 'delete', setting, optionId: item.id })}
          />
          <ListEditor
            title="Campus Locations"
            icon={<MapPin className="w-4 h-4" />}
            setting="location"
            items={locations}
            loading={loading}
            placeholder="e.g. Library"
            onAdd={(setting, label) => mutate({ operation: 'add', setting, label })}
            onUpdate={(setting, item, label) => mutate({ operation: 'update', setting, optionId: item.id, label })}
            onDelete={(setting, item) => mutate({ operation: 'delete', setting, optionId: item.id })}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
