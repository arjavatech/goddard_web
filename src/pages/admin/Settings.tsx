import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, MapPin, Save } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../contexts/ToastContext';

const STORAGE_KEY_CATEGORIES = 'procurement_categories';
const STORAGE_KEY_LOCATIONS = 'procurement_locations';

const DEFAULT_CATEGORIES = [
  'Classroom Supplies',
  'STEM & Toys',
  'Books & Learning',
  'Office & Equipment',
  'Play & Outdoor',
];

const DEFAULT_LOCATIONS = [
  'General / Office',
  'Kitchen',
  'Playground',
  'Parking Lot',
  'Hallways / Corridors',
  'Restrooms',
  'Other',
];

function loadList(key: string, defaults: string[]): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  } catch {
    return defaults;
  }
}

function saveList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

function ListEditor({
  title,
  icon,
  items,
  onSave,
  placeholder,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  onSave: (items: string[]) => void;
  placeholder: string;
}) {
  const [list, setList] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');
  const [dirty, setDirty] = useState(false);
  const { showToast } = useToast();

  useEffect(() => { setList(items); setDirty(false); }, [items]);

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (list.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      showToast('error', 'This item already exists.', 'Duplicate');
      return;
    }
    setList(prev => [...prev, trimmed]);
    setNewItem('');
    setDirty(true);
  };

  const remove = (idx: number) => {
    setList(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(list);
    setDirty(false);
    showToast('success', `${title} saved successfully.`, 'Saved');
  };

  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {list.length}
            </span>
          </CardTitle>
          {dirty && (
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 rounded-xl bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1E4B83] flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Add new */}
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
            disabled={!newItem.trim()}
            className="h-9 px-3 rounded-xl bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1E4B83] flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        {/* List */}
        {list.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 italic">No items yet. Add one above.</p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group"
              >
                <span className="text-xs font-medium text-slate-700">{item}</span>
                <button
                  onClick={() => remove(idx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!dirty && list.length > 0 && (
          <p className="text-[10px] text-slate-400 text-right">Hover an item to remove it</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Settings() {
  const [categories, setCategories] = useState<string[]>(() => loadList(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES));
  const [locations, setLocations] = useState<string[]>(() => loadList(STORAGE_KEY_LOCATIONS, DEFAULT_LOCATIONS));

  const handleSaveCategories = (list: string[]) => {
    saveList(STORAGE_KEY_CATEGORIES, list);
    setCategories(list);
  };

  const handleSaveLocations = (list: string[]) => {
    saveList(STORAGE_KEY_LOCATIONS, list);
    setLocations(list);
  };

  return (
    <AdminLayout>
      <div className="mx-auto space-y-6 px-4 sm:px-6 py-6 mt-14">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ListEditor
            title="Procurement Categories"
            icon={<Tag className="w-4 h-4 text-[#0F2D52]" />}
            items={categories}
            onSave={handleSaveCategories}
            placeholder="e.g. Art Supplies"
          />
          <ListEditor
            title="Campus Locations"
            icon={<MapPin className="w-4 h-4 text-[#0F2D52]" />}
            items={locations}
            onSave={handleSaveLocations}
            placeholder="e.g. Library"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

// Export helpers so request forms can read the live lists
export function getProcurementCategories(): string[] {
  return loadList(STORAGE_KEY_CATEGORIES, DEFAULT_CATEGORIES);
}

export function getProcurementLocations(): string[] {
  return loadList(STORAGE_KEY_LOCATIONS, DEFAULT_LOCATIONS);
}
