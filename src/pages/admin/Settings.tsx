import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, MapPin } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import {
  fetchCategories, createCategory, deleteCategory,
  fetchLocations, createLocation, deleteLocation,
  type SettingItem,
} from '../../services/api/settings';

const DEFAULT_CATEGORIES = [
  'Classroom Supplies', 'STEM & Toys', 'Books & Learning', 'Office & Equipment', 'Play & Outdoor',
];

const DEFAULT_LOCATIONS = [
  'General / Office', 'Kitchen', 'Playground', 'Parking Lot', 'Hallways / Corridors', 'Restrooms', 'Other',
];

function ListEditor({
  title,
  icon,
  items,
  onAdd,
  onDelete,
  placeholder,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  items: SettingItem[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  placeholder: string;
  loading: boolean;
}) {
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const add = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('error', 'This item already exists.', 'Duplicate');
      return;
    }
    setSaving(true);
    try {
      await onAdd(trimmed);
      setNewItem('');
      showToast('success', `Added to ${title}.`, 'Added');
    } catch {
      showToast('error', 'Failed to add item.', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      showToast('success', 'Item removed.', 'Removed');
    } catch {
      showToast('error', 'Failed to remove item.', 'Error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-50">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {icon}
          {title}
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] text-slate-800 placeholder:text-slate-400"
          />
          <Button
            type="button"
            onClick={add}
            disabled={!newItem.trim() || saving}
            className="h-9 px-3 rounded-xl bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1E4B83] flex items-center gap-1.5 disabled:opacity-40"
          >
            {saving ? <span className="animate-spin rounded-full border-2 border-white border-t-transparent h-3 w-3" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 italic">No items yet. Add one above.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group"
              >
                <span className="text-xs font-medium text-slate-700">{item.name}</span>
                <button
                  onClick={() => remove(item.id)}
                  disabled={deletingId === item.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  title="Remove"
                >
                  {deletingId === item.id
                    ? <span className="animate-spin rounded-full border-2 border-slate-400 border-t-transparent h-3 w-3 inline-block" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && items.length > 0 && (
          <p className="text-[10px] text-slate-400 text-right">Hover an item to remove it</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const schoolId = userData?.schoolId ?? '';

  const [categories, setCategories] = useState<SettingItem[]>([]);
  const [locations, setLocations] = useState<SettingItem[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [loadingLoc, setLoadingLoc] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    setLoadingCat(true);
    fetchCategories(schoolId)
      .then(setCategories)
      .catch(() => {
        showToast('error', 'Failed to load categories.', 'Error');
        setCategories(DEFAULT_CATEGORIES.map((name, i) => ({ id: String(i), name, schoolId })));
      })
      .finally(() => setLoadingCat(false));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    setLoadingLoc(true);
    fetchLocations(schoolId)
      .then(setLocations)
      .catch(() => {
        showToast('error', 'Failed to load locations.', 'Error');
        setLocations(DEFAULT_LOCATIONS.map((name, i) => ({ id: String(i), name, schoolId })));
      })
      .finally(() => setLoadingLoc(false));
  }, [schoolId]);

  const handleAddCategory = async (name: string) => {
    const item = await createCategory(schoolId, name);
    setCategories(prev => [...prev, item]);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleAddLocation = async (name: string) => {
    const item = await createLocation(schoolId, name);
    setLocations(prev => [...prev, item]);
  };

  const handleDeleteLocation = async (id: string) => {
    await deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <AdminLayout>
      <div className="mx-auto space-y-6 px-4 sm:px-6 py-6 mt-14">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ListEditor
            title="Procurement Categories"
            icon={<Tag className="w-4 h-4 text-[#0F2D52]" />}
            items={categories}
            onAdd={handleAddCategory}
            onDelete={handleDeleteCategory}
            placeholder="e.g. Art Supplies"
            loading={loadingCat}
          />
          <ListEditor
            title="Campus Locations"
            icon={<MapPin className="w-4 h-4 text-[#0F2D52]" />}
            items={locations}
            onAdd={handleAddLocation}
            onDelete={handleDeleteLocation}
            placeholder="e.g. Library"
            loading={loadingLoc}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

// Export helpers so request forms can read the live lists (localStorage fallback)
export function getProcurementCategories(): string[] {
  try {
    const stored = localStorage.getItem('procurement_categories');
    return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function getProcurementLocations(): string[] {
  try {
    const stored = localStorage.getItem('procurement_locations');
    return stored ? JSON.parse(stored) : DEFAULT_LOCATIONS;
  } catch {
    return DEFAULT_LOCATIONS;
  }
}
