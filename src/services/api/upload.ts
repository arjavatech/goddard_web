import { getAuthToken } from '../auth/session';
import { apiBaseUrl } from '../../config/env';

export async function uploadProductImage(file: File): Promise<string> {
  const token = await getAuthToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${apiBaseUrl}/uploads/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.s3_url as string;
}
