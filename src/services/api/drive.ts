import { authedFetch, z } from './common';

// ── Schemas ──────────────────────────────────────────────────────────────────

const driveItemSchema = z.object({
  id: z.string(),
  folder_id: z.string().nullable().optional(),
  user_id: z.string(),
  name: z.string(),
  item_type: z.enum(['folder', 'file']),
  mime_type: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

const driveItemsSchema = z.array(driveItemSchema);

const uploadUrlSchema = z.object({
  upload_url: z.string(),
  s3_key: z.string(),
});

const downloadUrlSchema = z.object({
  url: z.string(),
});

const driveAdminSchema = z.object({
  user_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  item_count: z.number(),
});

const driveAdminsSchema = z.array(driveAdminSchema);

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriveItem = z.infer<typeof driveItemSchema>;
export type DriveAdminSummary = z.infer<typeof driveAdminSchema>;

// ── API calls ─────────────────────────────────────────────────────────────────

export interface DriveListParams {
  folder_id?: string;
  user_id?: string;
  sort_by?: string;
  sort_order?: string;
}

export async function listDriveItems(params: DriveListParams = {}): Promise<DriveItem[]> {
  const searchParams = new URLSearchParams();
  if (params.folder_id) searchParams.set('folder_id', params.folder_id);
  if (params.user_id) searchParams.set('user_id', params.user_id);
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.sort_order) searchParams.set('sort_order', params.sort_order);
  const qs = searchParams.toString();
  return authedFetch({ method: 'GET', url: `/drive/items${qs ? `?${qs}` : ''}` }, driveItemsSchema);
}

export async function getDriveUploadUrl(payload: {
  file_name: string;
  content_type: string;
  file_size: number;
  folder_id?: string;
  user_id?: string;
}): Promise<{ upload_url: string; s3_key: string }> {
  return authedFetch({ method: 'POST', url: '/drive/upload-url', body: payload }, uploadUrlSchema);
}

export async function registerDriveFile(payload: {
  folder_id?: string;
  name: string;
  s3_key: string;
  mime_type: string;
  file_size: number;
  user_id?: string;
}): Promise<DriveItem> {
  return authedFetch({ method: 'POST', url: '/drive/items/file', body: payload }, driveItemSchema);
}

export async function createDriveFolder(payload: {
  folder_id?: string;
  name: string;
  user_id?: string;
}): Promise<DriveItem> {
  return authedFetch({ method: 'POST', url: '/drive/items/folder', body: payload }, driveItemSchema);
}

export async function getDriveDownloadUrl(id: string, download = false): Promise<{ url: string }> {
  return authedFetch(
    { method: 'GET', url: `/drive/items/${id}/url${download ? '?download=true' : ''}` },
    downloadUrlSchema,
  );
}

export async function renameDriveItem(id: string, name: string): Promise<DriveItem> {
  return authedFetch({ method: 'PATCH', url: `/drive/items/${id}`, body: { name } }, driveItemSchema);
}

export async function deleteDriveItem(id: string): Promise<void> {
  await authedFetch({ method: 'DELETE', url: `/drive/items/${id}` }, z.any());
}

export async function listDriveAdmins(): Promise<DriveAdminSummary[]> {
  return authedFetch({ method: 'GET', url: '/drive/admins' }, driveAdminsSchema);
}

export async function moveDriveItem(id: string, folderId: string | null): Promise<DriveItem> {
  return authedFetch(
    { method: 'PATCH', url: `/drive/items/${id}/move`, body: { folder_id: folderId } },
    driveItemSchema,
  );
}

export async function copyDriveItem(id: string): Promise<DriveItem> {
  return authedFetch({ method: 'POST', url: `/drive/items/${id}/copy` }, driveItemSchema);
}

// ── S3 direct upload with progress ───────────────────────────────────────────

export interface UploadTask {
  promise: Promise<void>;
  abort: () => void;
}

export function uploadToS3(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
  contentType?: string,
): UploadTask {
  let xhr: XMLHttpRequest;
  const ct = contentType || file.type || 'application/octet-stream';
  const promise = new Promise<void>((resolve, reject) => {
    xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', ct);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('S3 upload network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });
  return {
    promise,
    abort: () => xhr?.abort(),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(mimeType: string | null | undefined): string {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'sheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slide';
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') return 'text';
  if (
    mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed' ||
    mimeType === 'application/x-rar-compressed' || mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/gzip' || mimeType === 'application/x-tar'
  ) return 'zip';
  return 'file';
}
