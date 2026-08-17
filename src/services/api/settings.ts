import { authedFetch, z } from './common';

export type SettingItem = {
  id: string;
  name: string;
  schoolId: string;
};

const settingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  school_id: z.string(),
});

const settingListSchema = z.array(settingItemSchema);

function mapItem(r: any): SettingItem {
  return {
    id: r.id,
    name: r.name,
    schoolId: r.school_id,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(schoolId: string): Promise<SettingItem[]> {
  const data = await authedFetch(
    { method: 'GET', url: `/settings/categories?school_id=${encodeURIComponent(schoolId)}` },
    settingListSchema
  );
  return data.map(mapItem);
}

export async function createCategory(schoolId: string, name: string): Promise<SettingItem> {
  const data = await authedFetch(
    {
      method: 'POST',
      url: '/settings/categories',
      body: { school_id: schoolId, name },
    },
    settingItemSchema
  );
  return mapItem(data);
}

export async function deleteCategory(id: string): Promise<void> {
  await authedFetch(
    { method: 'DELETE', url: `/settings/categories/${encodeURIComponent(id)}` },
    z.any()
  );
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function fetchLocations(schoolId: string): Promise<SettingItem[]> {
  const data = await authedFetch(
    { method: 'GET', url: `/settings/locations?school_id=${encodeURIComponent(schoolId)}` },
    settingListSchema
  );
  return data.map(mapItem);
}

export async function createLocation(schoolId: string, name: string): Promise<SettingItem> {
  const data = await authedFetch(
    {
      method: 'POST',
      url: '/settings/locations',
      body: { school_id: schoolId, name },
    },
    settingItemSchema
  );
  return mapItem(data);
}

export async function deleteLocation(id: string): Promise<void> {
  await authedFetch(
    { method: 'DELETE', url: `/settings/locations/${encodeURIComponent(id)}` },
    z.any()
  );
}
