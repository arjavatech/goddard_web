import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive, ArrowLeft, CheckSquare, ChevronDown, ChevronRight, Copy, ExternalLink, File, FileText, Folder,
  FolderInput, FolderOpen, FolderPlus, Grid, Image, Info, List, MoreVertical, Music, Pencil,
  Search, Trash2, Upload, Users, Video, X, Download, Eye,
} from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import {
  DriveAdminSummary,
  DriveItem,
  copyDriveItem,
  createDriveFolder,
  deleteDriveItem,
  fileIcon,
  formatFileSize,
  getDriveDownloadUrl,
  getDriveUploadUrl,
  listDriveAdmins,
  listDriveItems,
  moveDriveItem,
  registerDriveFile,
  renameDriveItem,
  uploadToS3,
} from '../../services/api/drive';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BreadcrumbEntry {
  id: string | null;
  name: string;
  userId?: string;
}

interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
  done: boolean;
  error?: string;
  abort: () => void;
}

type SortBy = 'name' | 'file_size' | 'created_at';
type SortOrder = 'asc' | 'desc';

// ── Date grouping ─────────────────────────────────────────────────────────────

const GROUP_ORDER = ['Today', 'Yesterday', 'Last week', 'Last month', 'This year', 'Older'] as const;
type GroupLabel = typeof GROUP_ORDER[number];

function getDateGroup(dateStr: string): GroupLabel {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((todayStart.getTime() - itemDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last week';
  if (diffDays <= 30) return 'Last month';
  if (date.getFullYear() === now.getFullYear()) return 'This year';
  return 'Older';
}

// ── Card styling ──────────────────────────────────────────────────────────────

function cardStyle(item: DriveItem): { bg: string; iconEl: React.ReactNode } {
  if (item.item_type === 'folder') {
    return { bg: 'bg-blue-50', iconEl: <FolderOpen className="w-12 h-12 text-blue-400" /> };
  }
  const type = fileIcon(item.mime_type);
  if (type === 'image')  return { bg: 'bg-emerald-50', iconEl: <Image    className="w-12 h-12 text-emerald-500" /> };
  if (type === 'video')  return { bg: 'bg-purple-50',  iconEl: <Video    className="w-12 h-12 text-purple-500"  /> };
  if (type === 'audio')  return { bg: 'bg-pink-50',    iconEl: <Music    className="w-12 h-12 text-pink-500"    /> };
  if (type === 'pdf')    return { bg: 'bg-red-50',     iconEl: <FileText className="w-12 h-12 text-red-400"     /> };
  if (type === 'doc')    return { bg: 'bg-blue-50',    iconEl: <FileText className="w-12 h-12 text-blue-600"    /> };
  if (type === 'sheet')  return { bg: 'bg-green-50',   iconEl: <FileText className="w-12 h-12 text-green-600"   /> };
  if (type === 'slide')  return { bg: 'bg-orange-50',  iconEl: <FileText className="w-12 h-12 text-orange-500"  /> };
  if (type === 'text')   return { bg: 'bg-gray-50',    iconEl: <FileText className="w-12 h-12 text-gray-500"    /> };
  if (type === 'zip')    return { bg: 'bg-amber-50',   iconEl: <Archive  className="w-12 h-12 text-amber-500"   /> };
  return                        { bg: 'bg-slate-50',   iconEl: <File     className="w-12 h-12 text-slate-400"   /> };
}

function smallIcon(item: DriveItem) {
  if (item.item_type === 'folder') return <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  const type = fileIcon(item.mime_type);
  if (type === 'image')  return <Image    className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (type === 'video')  return <Video    className="w-4 h-4 text-purple-500  flex-shrink-0" />;
  if (type === 'audio')  return <Music    className="w-4 h-4 text-pink-500    flex-shrink-0" />;
  if (type === 'pdf')    return <FileText className="w-4 h-4 text-red-400     flex-shrink-0" />;
  if (type === 'doc')    return <FileText className="w-4 h-4 text-blue-600    flex-shrink-0" />;
  if (type === 'sheet')  return <FileText className="w-4 h-4 text-green-600   flex-shrink-0" />;
  if (type === 'slide')  return <FileText className="w-4 h-4 text-orange-500  flex-shrink-0" />;
  if (type === 'text')   return <FileText className="w-4 h-4 text-gray-500    flex-shrink-0" />;
  if (type === 'zip')    return <Archive  className="w-4 h-4 text-amber-500   flex-shrink-0" />;
  return <File className="w-4 h-4 text-slate-400 flex-shrink-0" />;
}

const GROUP_INITIAL = 20;

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminDrive() {
  const { userData } = useUserContext();
  const isSuperAdmin = userData?.role?.toLowerCase() === 'superadmin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation
  const [path, setPath] = useState<BreadcrumbEntry[]>([{ id: null, name: 'Drive' }]);
  const currentEntry = path[path.length - 1];
  const currentFolderId = currentEntry.id;
  const currentUserId = path.find(p => p.userId)?.userId;
  const isAtRoot = path.length === 1;
  const showingAdminFiles = !!currentUserId;

  // Content
  const [items, setItems] = useState<DriveItem[]>([]);
  const [admins, setAdmins] = useState<DriveAdminSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Search
  const [search, setSearch] = useState('');

  // Date group collapse state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupLabel>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<GroupLabel>>(new Set());

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [dismissedErrorIds, setDismissedErrorIds] = useState<Set<string>>(new Set());

  // Drag-drop state
  const [isDragActive, setIsDragActive] = useState(false);
  const [draggedOverFolderId, setDraggedOverFolderId] = useState<string | null>(null);

  // Multi-select
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preview overlay
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  // Dialogs
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderCreating, setIsFolderCreating] = useState(false);

  const [deleteItems, setDeleteItems] = useState<DriveItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [renameTarget, setRenameTarget] = useState<DriveItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [infoTarget, setInfoTarget] = useState<DriveItem | null>(null);

  // Move dialog (supports single + multi-select)
  const [moveItems, setMoveItems] = useState<DriveItem[]>([]);
  const [moveDestPath, setMoveDestPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }]);
  const [moveFolders, setMoveFolders] = useState<DriveItem[]>([]);
  const [isMoveLoading, setIsMoveLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [resetToRoot, setResetToRoot] = useState(false);

  const [isMultiDownloading, setIsMultiDownloading] = useState(false);
  const [multiDownloadProgress, setMultiDownloadProgress] = useState({ done: 0, total: 0 });

  const [dialogMode, setDialogMode] = useState<'move' | 'copy'>('move');
  const [isCopyingDialog, setIsCopyingDialog] = useState(false);
  const [isCreatingFolderInDialog, setIsCreatingFolderInDialog] = useState(false);
  const [newFolderNameInDialog, setNewFolderNameInDialog] = useState('');
  const [isDialogFolderCreating, setIsDialogFolderCreating] = useState(false);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const filteredItems = useMemo(() =>
    search.trim()
      ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : items,
    [items, search],
  );

  const groupedItems = useMemo(() => {
    const map = new Map<GroupLabel, DriveItem[]>();
    for (const item of filteredItems) {
      const g = getDateGroup(item.created_at);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return GROUP_ORDER.filter(g => map.has(g)).map(g => ({ label: g, items: map.get(g)! }));
  }, [filteredItems]);

  const totalItemCount = filteredItems.length + (isSuperAdmin && isAtRoot ? admins.length : 0);

  // ── Reset on navigation ───────────────────────────────────────────────────────

  useEffect(() => {
    setSearch('');
    setSelectedIds(new Set());
    setIsMultiSelect(false);
    setCollapsedGroups(new Set());
    setExpandedGroups(new Set());
  }, [currentFolderId, currentUserId]);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setItems([]);
    setIsLoading(true);
    try {
      const params: Parameters<typeof listDriveItems>[0] = { sort_by: sortBy, sort_order: sortOrder };
      if (currentFolderId) params.folder_id = currentFolderId;
      if (currentUserId) params.user_id = currentUserId;
      setItems(await listDriveItems(params));
    } catch { /* keep existing */ }
    finally { setIsLoading(false); }
  }, [currentFolderId, currentUserId, sortBy, sortOrder]);

  const fetchAdmins = useCallback(async () => {
    if (!isSuperAdmin || !isAtRoot) return;
    try { setAdmins(await listDriveAdmins()); } catch { setAdmins([]); }
  }, [isSuperAdmin, isAtRoot]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  useEffect(() => {
    if (previewItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [previewItem]);

  // ── Navigation ────────────────────────────────────────────────────────────────

  const navigateToFolder = (item: DriveItem) =>
    setPath(prev => [...prev, { id: item.id, name: item.name }]);

  const navigateToAdmin = (admin: DriveAdminSummary) =>
    setPath([
      { id: null, name: 'Drive' },
      { id: null, name: `${admin.first_name} ${admin.last_name}`, userId: admin.user_id },
    ]);

  const navigateToBreadcrumb = (index: number) =>
    setPath(prev => prev.slice(0, index + 1));

  // ── Card click ────────────────────────────────────────────────────────────────

  const handleCardClick = (item: DriveItem) => {
    if (isMultiSelect) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
      return;
    }
    if (item.item_type === 'folder') { navigateToFolder(item); return; }
    handlePreview(item);
  };

  // ── Preview ───────────────────────────────────────────────────────────────────

  const handlePreview = async (item: DriveItem) => {
    setPreviewItem(item);
    setPreviewUrl(null);
    setIsPreviewLoading(true);
    try {
      const { url } = await getDriveDownloadUrl(item.id, false);
      setPreviewUrl(url);
    } catch { /* leave url null — shows unsupported state */ }
    finally { setIsPreviewLoading(false); }
  };

  const closePreview = () => { setPreviewItem(null); setPreviewUrl(null); };

  const handleOpenTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFromPreview = async () => {
    if (!previewItem || isDownloadLoading) return;
    setIsDownloadLoading(true);
    try {
      const { url } = await getDriveDownloadUrl(previewItem.id, true);
      const a = document.createElement('a');
      a.href = url;
      a.download = previewItem.name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch { /* noop */ }
    finally { setIsDownloadLoading(false); }
  };

  // ── Upload ────────────────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';

    for (const file of files) {
      const uploadId = crypto.randomUUID();
      const resolvedContentType = file.type || 'application/octet-stream';
      let abortFn = () => {};
      setUploadQueue(q => [...q, { id: uploadId, name: file.name, progress: 0, done: false, abort: () => abortFn() }]);
      try {
        const { upload_url, s3_key } = await getDriveUploadUrl({
          file_name: file.name,
          content_type: resolvedContentType,
          file_size: file.size,
          folder_id: currentFolderId ?? undefined,
          user_id: currentUserId ?? undefined,
        });
        const task = uploadToS3(upload_url, file, pct =>
          setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, progress: pct } : u)),
          resolvedContentType,
        );
        abortFn = task.abort;
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, abort: task.abort } : u));
        await task.promise;
        await registerDriveFile({
          folder_id: currentFolderId ?? undefined,
          name: file.name, s3_key,
          mime_type: resolvedContentType,
          file_size: file.size,
          user_id: currentUserId ?? undefined,
        });
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, progress: 100, done: true } : u));
        setTimeout(() => setUploadQueue(q => q.filter(u => u.id !== uploadId)), 2000);
        fetchItems();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, error: msg } : u));
      }
    }
  };

  // ── Drag-drop upload ──────────────────────────────────────────────────────────

  const processDroppedFiles = async (files: File[], targetFolderId: string | null) => {
    for (const file of files) {
      const uploadId = crypto.randomUUID();
      const resolvedContentType = file.type || 'application/octet-stream';
      let abortFn = () => {};
      setUploadQueue(q => [...q, { id: uploadId, name: file.name, progress: 0, done: false, abort: () => abortFn() }]);
      try {
        const { upload_url, s3_key } = await getDriveUploadUrl({
          file_name: file.name,
          content_type: resolvedContentType,
          file_size: file.size,
          folder_id: targetFolderId ?? undefined,
          user_id: currentUserId ?? undefined,
        });
        const task = uploadToS3(upload_url, file, pct =>
          setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, progress: pct } : u)),
          resolvedContentType,
        );
        abortFn = task.abort;
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, abort: task.abort } : u));
        await task.promise;
        await registerDriveFile({
          folder_id: targetFolderId ?? undefined,
          name: file.name, s3_key,
          mime_type: resolvedContentType,
          file_size: file.size,
          user_id: currentUserId ?? undefined,
        });
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, progress: 100, done: true } : u));
        setTimeout(() => setUploadQueue(q => q.filter(u => u.id !== uploadId)), 2000);
        fetchItems();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadQueue(q => q.map(u => u.id === uploadId ? { ...u, error: msg } : u));
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDraggedOverFolderId(null);

    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;

    processDroppedFiles(files, currentFolderId);
  };

  const handleFolderDragEnter = (e: React.DragEvent<HTMLDivElement>, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDraggedOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setDraggedOverFolderId(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent<HTMLDivElement>, targetFolder: DriveItem) => {
    e.preventDefault();
    setDraggedOverFolderId(null);

    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;

    if (targetFolder.item_type === 'folder') {
      e.stopPropagation(); // only stop propagation for folder drops (file cards bubble to handleDrop)
      processDroppedFiles(files, targetFolder.id);
    }
  };

  // ── Error dismissal ───────────────────────────────────────────────────────────

  const dismissError = (uploadId: string) => {
    setDismissedErrorIds(prev => {
      const next = new Set(prev);
      next.add(uploadId);
      return next;
    });
  };

  // ── Folder creation ───────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsFolderCreating(true);
    try {
      await createDriveFolder({ name: newFolderName.trim(), folder_id: currentFolderId ?? undefined, user_id: currentUserId ?? undefined });
      setNewFolderName(''); setShowNewFolder(false); fetchItems();
    } finally { setIsFolderCreating(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteItems.length) return;
    setIsDeleting(true);
    try {
      for (const item of deleteItems) await deleteDriveItem(item.id);
      setDeleteItems([]); setSelectedIds(new Set()); fetchItems();
    } finally { setIsDeleting(false); }
  };

  // ── Rename ────────────────────────────────────────────────────────────────────

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setIsRenaming(true);
    try {
      await renameDriveItem(renameTarget.id, renameName.trim());
      setRenameTarget(null); fetchItems();
    } finally { setIsRenaming(false); }
  };

  // ── Copy ─────────────────────────────────────────────────────────────────────

  const openCopyDialog = (items: DriveItem[]) => {
    const driveRootLabel = showingAdminFiles
      ? `${path.find(p => p.userId)?.name ?? 'Admin'}'s Drive`
      : 'My Drive';
    setDialogMode('copy');
    setMoveItems(items);
    setMoveDestPath([{ id: null, name: driveRootLabel }]);
    setResetToRoot(false);
    loadMoveFolders(null);
  };

  const handleCopy = (item: DriveItem) => {
    openCopyDialog([item]);
  };

  const handleCopyHere = async () => {
    if (!moveItems.length) return;
    const destFolderId = resetToRoot ? null : (moveDestPath[moveDestPath.length - 1].id ?? null);
    setIsCopyingDialog(true);
    try {
      for (const item of moveItems) {
        const newItem = await copyDriveItem(item.id);
        if (destFolderId !== (currentFolderId ?? null)) {
          await moveDriveItem(newItem.id, destFolderId);
        }
      }
      fetchItems();
      setMoveItems([]);
    } catch { /* noop */ }
    finally { setIsCopyingDialog(false); }
  };

  const handleCreateFolderInDialog = async () => {
    const name = newFolderNameInDialog.trim();
    if (!name) return;
    const destFolderId = moveDestPath[moveDestPath.length - 1].id ?? undefined;
    setIsDialogFolderCreating(true);
    try {
      await createDriveFolder({ name, folder_id: destFolderId });
      setIsCreatingFolderInDialog(false);
      setNewFolderNameInDialog('');
      await loadMoveFolders(moveDestPath[moveDestPath.length - 1].id ?? null);
    } catch { /* noop */ }
    finally { setIsDialogFolderCreating(false); }
  };

  // ── Move ──────────────────────────────────────────────────────────────────────

  const loadMoveFolders = async (folderId: string | null) => {
    setIsMoveLoading(true);
    try {
      const params: Parameters<typeof listDriveItems>[0] = {
        folder_id: folderId ?? undefined,
        sort_by: 'name',
        sort_order: 'asc',
      };
      if (currentUserId) params.user_id = currentUserId;
      const all = await listDriveItems(params);
      setMoveFolders(all.filter(i => i.item_type === 'folder'));
    } finally { setIsMoveLoading(false); }
  };

  const openMoveDialog = async (items: DriveItem[]) => {
    const driveRootLabel = showingAdminFiles
      ? `${path.find(p => p.userId)?.name ?? 'Admin'}'s Drive`
      : 'My Drive';
    setDialogMode('move');
    setMoveItems(items);
    setMoveDestPath([{ id: null, name: driveRootLabel }]);
    setResetToRoot(false);
    await loadMoveFolders(null);
  };

  const handleMoveNavigate = (folder: DriveItem) => {
    setMoveDestPath(p => [...p, { id: folder.id, name: folder.name }]);
    loadMoveFolders(folder.id);
  };

  const handleMoveUp = () => {
    const newPath = moveDestPath.slice(0, -1);
    setMoveDestPath(newPath);
    loadMoveFolders(newPath[newPath.length - 1].id);
  };

  const handleMoveHere = async () => {
    if (!moveItems.length) return;
    setIsMoving(true);
    try {
      const targetFolderId = resetToRoot ? null : moveDestPath[moveDestPath.length - 1].id;
      for (const item of moveItems) await moveDriveItem(item.id, targetFolderId);
      setMoveItems([]); setSelectedIds(new Set()); fetchItems();
    } finally { setIsMoving(false); }
  };

  // ── Multi-select actions ──────────────────────────────────────────────────────

  const getSelectedItems = () => filteredItems.filter(i => selectedIds.has(i.id));

  const handleMultiDownload = async () => {
    const files = getSelectedItems().filter(i => i.item_type !== 'folder');
    if (!files.length) return;
    setIsMultiDownloading(true);
    setMultiDownloadProgress({ done: 0, total: files.length });
    try {
      for (const item of files) {
        try {
          const { url } = await getDriveDownloadUrl(item.id, true);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setMultiDownloadProgress(p => ({ ...p, done: p.done + 1 }));
          await new Promise(r => setTimeout(r, 600));
        } catch { /* skip failed file */ }
      }
    } finally {
      setIsMultiDownloading(false);
      setMultiDownloadProgress({ done: 0, total: 0 });
    }
  };

  const handleMultiDelete = () => setDeleteItems(getSelectedItems());

  const handleMultiCopy = () => {
    const files = getSelectedItems().filter(i => i.item_type !== 'folder');
    if (files.length) openCopyDialog(files);
  };

  // ── Item context menu ─────────────────────────────────────────────────────────

  function ItemMenu({ item }: { item: DriveItem }) {
    const isFolder = item.item_type === 'folder';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={e => e.stopPropagation()}>
          {/* Select — enters multi-select and selects this item */}
          <DropdownMenuItem onClick={() => {
            setIsMultiSelect(true);
            setSelectedIds(prev => { const next = new Set(prev); next.add(item.id); return next; });
          }}>
            <CheckSquare className="w-4 h-4 mr-2" /> Select
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {!isFolder && (
            <>
              <DropdownMenuItem onClick={() => handlePreview(item)}>
                <Eye className="w-4 h-4 mr-2" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const { url } = await getDriveDownloadUrl(item.id, true);
                window.open(url, '_blank', 'noopener,noreferrer');
              }}>
                <Download className="w-4 h-4 mr-2" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => { setRenameTarget(item); setRenameName(item.name); }}>
            <Pencil className="w-4 h-4 mr-2" /> Rename
          </DropdownMenuItem>
          {!isFolder && (
            <DropdownMenuItem onClick={() => handleCopy(item)}>
              <Copy className="w-4 h-4 mr-2" /> Make a copy
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => openMoveDialog([item])}>
            <FolderInput className="w-4 h-4 mr-2" /> Move to
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setInfoTarget(item)}>
            <Info className="w-4 h-4 mr-2" /> File information
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDeleteItems([item])} className="text-red-600 focus:text-red-600">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Grid Card ─────────────────────────────────────────────────────────────────

  function GridCard({ item }: { item: DriveItem }) {
    const isFolder = item.item_type === 'folder';
    const { bg, iconEl } = cardStyle(item);
    const isSelected = selectedIds.has(item.id);
    const isDraggedOver = draggedOverFolderId === item.id && isFolder;
    return (
      <div
        className={cn(
          'group rounded-xl border bg-white overflow-hidden cursor-pointer transition-all select-none',
          isDraggedOver
            ? 'border-green-500 ring-2 ring-green-200 shadow-md bg-green-50'
            : isSelected
            ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md',
        )}
        onClick={() => handleCardClick(item)}
        onDragEnter={(e) => isFolder && handleFolderDragEnter(e, item.id)}
        onDragLeave={handleFolderDragLeave}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => handleFolderDrop(e, item)}
      >
        <div className={cn('relative flex items-center justify-center h-28', bg)}>
          {iconEl}
          {/* Multi-select checkbox */}
          {isMultiSelect ? (
            <div className="absolute top-2 left-2 z-10">
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-300',
              )}>
                {isSelected && <svg viewBox="0 0 12 10" className="w-3 h-3 fill-white"><path d="M1 5l3 4L11 1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            </div>
          ) : (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <ItemMenu item={item} />
            </div>
          )}
        </div>
        <div className="px-3 py-2.5 border-t border-slate-100 flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">{smallIcon(item)}</div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate leading-tight">{item.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isFolder ? '' : `${formatFileSize(item.file_size)} • `}
              {relativeTime(item.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin Card ────────────────────────────────────────────────────────────────

  function AdminCard({ admin }: { admin: DriveAdminSummary }) {
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all select-none"
        onClick={() => navigateToAdmin(admin)}
      >
        <div className="relative flex flex-col items-center justify-center h-28 bg-indigo-100 gap-2">
          <div className="w-16 h-16 rounded-full bg-indigo-200 flex items-center justify-center">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <div className="px-3 py-2.5 border-t border-slate-100 flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate leading-tight">
              {admin.first_name} {admin.last_name}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{admin.item_count} items</p>
          </div>
        </div>
      </div>
    );
  }

  // ── List Table ────────────────────────────────────────────────────────────────

  function ListTable({ rows }: { rows: DriveItem[] }) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50/60">
              {isMultiSelect && <th className="w-10 py-2.5 px-3" />}
              <th className="text-left py-2.5 px-4 font-medium">Name</th>
              <th className="text-left py-2.5 px-4 font-medium hidden sm:table-cell">Type</th>
              <th className="text-right py-2.5 px-4 font-medium hidden sm:table-cell">Size</th>
              <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Modified</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map(item => {
              const isFolder = item.item_type === 'folder';
              const isSelected = selectedIds.has(item.id);
              const isDraggedOver = draggedOverFolderId === item.id && isFolder;
              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-slate-50 cursor-pointer group transition-colors',
                    isDraggedOver
                      ? 'bg-green-50 hover:bg-green-50'
                      : isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                  )}
                  onClick={() => handleCardClick(item)}
                  onDragEnter={(e) => isFolder && handleFolderDragEnter(e, item.id)}
                  onDragLeave={handleFolderDragLeave}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => handleFolderDrop(e, item)}
                >
                  {isMultiSelect && (
                    <td className="py-2.5 px-3">
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center mx-auto',
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300',
                      )}>
                        {isSelected && <svg viewBox="0 0 12 10" className="w-2.5 h-2.5 fill-white"><path d="M1 5l3 4L11 1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </td>
                  )}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      {smallIcon(item)}
                      <span className="truncate max-w-[200px] sm:max-w-none font-medium text-slate-700">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 hidden sm:table-cell text-xs">
                    {isFolder ? 'Folder' : item.mime_type?.split('/')[1]?.toUpperCase() ?? 'File'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400 hidden sm:table-cell text-xs">
                    {isFolder ? '—' : formatFileSize(item.file_size)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 hidden md:table-cell text-xs">
                    {relativeTime(item.created_at)}
                  </td>
                  <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                    {!isMultiSelect && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <ItemMenu item={item} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────

  const sortOptions: { label: string; by: SortBy; order: SortOrder }[] = [
    { label: 'Name', by: 'name', order: 'asc' },
    { label: 'Name Z–A', by: 'name', order: 'desc' },
    { label: 'Newest', by: 'created_at', order: 'desc' },
    { label: 'Oldest', by: 'created_at', order: 'asc' },
    { label: 'Largest', by: 'file_size', order: 'desc' },
    { label: 'Smallest', by: 'file_size', order: 'asc' },
  ];
  const currentSort = sortOptions.find(o => o.by === sortBy && o.order === sortOrder) ?? sortOptions[0];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="-mx-3 -mb-3 sm:-mx-4 sm:-mb-4 md:-mx-6 md:-mb-6 flex flex-col min-h-[calc(100vh-64px)] bg-[#F7F9FC]">

        {/* ── Top Toolbar ── */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
          {/* Title + count */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-slate-800 flex-shrink-0">Docs</h2>
            {!isLoading && (
              <span className="text-xs text-slate-400 flex-shrink-0">• {totalItemCount} items</span>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-sm mx-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search across Drive…"
              className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons — hidden in multi-select */}
          {!isMultiSelect && (
            <>
              <Button
                size="sm" variant="outline"
                onClick={() => { setNewFolderName(''); setShowNewFolder(true); }}
                className="gap-1.5 flex-shrink-0"
              >
                <FolderPlus className="w-4 h-4" /> New Folder
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 flex-shrink-0 bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white"
              >
                <Upload className="w-4 h-4" /> Upload File
              </Button>
            </>
          )}

          {/* Multi-select toggle */}
          {isMultiSelect ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const allIds = new Set(filteredItems.map(i => i.id));
                  setSelectedIds(allIds);
                }}
                className="text-xs text-slate-600 hover:text-[#0F2D52] font-medium"
              >
                Select All
              </button>
              <Button
                size="sm"
                onClick={() => { setIsMultiSelect(false); setSelectedIds(new Set()); }}
                className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white gap-1"
              >
                Exit Select
              </Button>
            </div>
          ) : (
            <Button
              size="sm" variant="outline"
              onClick={() => setIsMultiSelect(true)}
              className="flex-shrink-0 text-xs hidden sm:flex"
            >
              Multiple Select
            </Button>
          )}
        </div>

        {/* ── Breadcrumb row ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2 bg-white border-b border-slate-100 flex-shrink-0">
          <nav className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
            {path.map((entry, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                <button
                  onClick={() => i < path.length - 1 && navigateToBreadcrumb(i)}
                  className={cn(
                    'uppercase tracking-wide font-semibold',
                    i === path.length - 1
                      ? 'text-[#0F2D52] cursor-default'
                      : 'text-slate-400 hover:text-[#0F2D52] cursor-pointer',
                  )}
                >
                  {entry.name}
                </button>
              </React.Fragment>
            ))}
          </nav>

          {/* View + Sort */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-slate-500 gap-1 h-7 px-2">
                  {currentSort.label} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map(opt => (
                  <DropdownMenuItem
                    key={`${opt.by}-${opt.order}`}
                    onClick={() => { setSortBy(opt.by); setSortOrder(opt.order); }}
                    className={cn(opt.by === sortBy && opt.order === sortOrder && 'font-semibold text-[#0F2D52]')}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5', viewMode === 'grid' ? 'bg-[#0F2D52] text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}>
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')} className={cn('p-1.5', viewMode === 'list' ? 'bg-[#0F2D52] text-white' : 'bg-white text-slate-400 hover:bg-slate-50')}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile new/upload buttons */}
        {!isMultiSelect && (
          <div className="flex sm:hidden items-center gap-2 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setNewFolderName(''); setShowNewFolder(true); }} className="gap-1.5 text-xs">
              <FolderPlus className="w-3.5 h-3.5" /> New Folder
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

        {/* Upload queue */}
        {uploadQueue.length > 0 && (
          <div className="px-4 sm:px-5 py-2 space-y-1.5 bg-white border-b border-slate-100 flex-shrink-0">
            {uploadQueue.map(u => {
              // Hide dismissed errors
              if (u.error && dismissedErrorIds.has(u.id)) {
                return null;
              }
              return (
                <div key={u.id} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-xs">
                  <Upload className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="truncate flex-1 text-slate-700">{u.name}</span>
                  {u.error ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">{u.error}</span>
                      <button
                        onClick={() => dismissError(u.id)}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Dismiss error"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : u.done ? <span className="text-green-600 font-medium">Done</span>
                  : <>
                    <div className="w-24 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${u.progress}%` }} />
                    </div>
                    <span className="text-blue-600 w-8 text-right">{u.progress}%</span>
                    <button onClick={() => u.abort()} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                  }
                </div>
              );
            })}
          </div>
        )}

        {/* ── Main scrollable content ── */}
        <div
          className={cn(
            'flex-1 overflow-y-auto p-4 sm:p-5 pb-24 transition-colors',
            isDragActive && 'bg-blue-50/50',
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >


          {isLoading && items.length === 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
                    <div className="h-28 bg-slate-100" />
                    <div className="px-3 py-2.5 border-t border-slate-100 space-y-2">
                      <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                      <div className="h-2 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 animate-pulse">
                    <div className="w-4 h-4 bg-slate-100 rounded flex-shrink-0" />
                    <div className="h-3 bg-slate-100 rounded w-40 sm:w-64" />
                    <div className="ml-auto flex gap-6">
                      <div className="h-3 bg-slate-100 rounded w-14 hidden sm:block" />
                      <div className="h-3 bg-slate-100 rounded w-10 hidden sm:block" />
                      <div className="h-3 bg-slate-100 rounded w-20 hidden md:block" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {/* Admin Cards section (SuperAdmin at root only) */}
              {isSuperAdmin && isAtRoot && admins.length > 0 && (
                <div className="mb-6">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                      {admins.map(admin => <AdminCard key={admin.user_id} admin={admin} />)}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-3">
                      <table className="w-full text-sm">
                        <tbody>
                          {admins.map(admin => (
                            <tr
                              key={admin.user_id}
                              className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                              onClick={() => navigateToAdmin(admin)}
                            >
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                  <span className="font-medium text-slate-700">{admin.first_name} {admin.last_name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-slate-400 text-xs">{admin.item_count} items</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {filteredItems.length === 0 && search && (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Search className="w-10 h-10 text-slate-200" />
                  <p className="text-sm text-slate-400">No results for "<span className="font-medium">{search}</span>"</p>
                  <button onClick={() => setSearch('')} className="text-xs text-[#0F2D52] hover:underline">Clear search</button>
                </div>
              )}

              {filteredItems.length === 0 && !search && !(isSuperAdmin && isAtRoot && admins.length > 0) && (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Folder className="w-10 h-10 text-slate-300" />
                  <p className="text-sm text-slate-400">
                    {showingAdminFiles ? 'This admin has no files yet.' : 'Empty. Upload a file or create a folder.'}
                  </p>
                </div>
              )}

              {/* Date groups */}
              {groupedItems.map(group => {
                const isCollapsed = collapsedGroups.has(group.label);
                const isExpanded = expandedGroups.has(group.label);
                const visible = isExpanded ? group.items : group.items.slice(0, GROUP_INITIAL);
                const hasMore = group.items.length > GROUP_INITIAL && !isExpanded;

                return (
                  <div key={group.label} className="mb-5">
                    {/* Group header */}
                    <button
                      onClick={() => setCollapsedGroups(prev => {
                        const next = new Set(prev);
                        if (next.has(group.label)) next.delete(group.label); else next.add(group.label);
                        return next;
                      })}
                      className="flex items-center gap-2 mb-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {isCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                      {group.label}
                      <span className="text-slate-300 font-normal">{group.items.length}</span>
                    </button>

                    {!isCollapsed && (
                      <>
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                            {visible.map(item => <GridCard key={item.id} item={item} />)}
                          </div>
                        ) : (
                          <ListTable rows={visible} />
                        )}
                        {hasMore && (
                          <button
                            onClick={() => setExpandedGroups(prev => { const next = new Set(prev); next.add(group.label); return next; })}
                            className="mt-3 text-sm text-[#0F2D52] hover:underline font-medium"
                          >
                            View more ({group.items.length - GROUP_INITIAL} more)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── File Preview Overlay ── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closePreview}>
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl min-h-[60vh] max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <button
                onClick={closePreview}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex-1 min-w-0 mx-4">
                <p className="font-semibold text-slate-800 text-sm truncate">{previewItem.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatFileSize(previewItem.file_size)}{previewItem.file_size ? ' • ' : ''}{relativeTime(previewItem.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={handleDownloadFromPreview} disabled={isDownloadLoading} className="h-8 text-xs gap-1.5">
                  {isDownloadLoading
                    ? <><div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> Downloading…</>
                    : <><Download className="w-3.5 h-3.5" /> Download</>
                  }
                </Button>
                <Button size="sm" variant="outline" onClick={handleOpenTab} className="h-8 text-xs gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Open tab
                </Button>
                <button onClick={closePreview} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors ml-1">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-6 rounded-b-2xl">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                  <span className="text-sm">Loading preview…</span>
                </div>
              ) : !previewUrl ? (
                <div className="text-center text-slate-500 space-y-4">
                  <File className="w-16 h-16 mx-auto text-slate-300" />
                  <p className="text-sm">Failed to load file.</p>
                </div>
              ) : previewItem.mime_type?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewItem.name}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                />
              ) : previewItem.mime_type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  title={previewItem.name}
                  className="w-full max-w-4xl h-[70vh] rounded-xl bg-white shadow"
                />
              ) : previewItem.mime_type === 'text/plain' ? (
                <iframe
                  src={previewUrl}
                  title={previewItem.name}
                  className="w-full max-w-3xl h-[70vh] rounded-xl bg-white shadow"
                />
              ) : previewItem.mime_type?.startsWith('video/') ? (
                <video
                  controls
                  src={previewUrl}
                  className="max-w-full max-h-[70vh] rounded-xl shadow-lg"
                />
              ) : (
                <div className="bg-white rounded-2xl shadow p-10 text-center space-y-4">
                  <File className="w-16 h-16 mx-auto text-slate-300" />
                  <p className="text-sm font-medium text-slate-700">Preview not available for this file type.</p>
                  <p className="text-xs text-slate-400">{previewItem.mime_type ?? 'Unknown format'}</p>
                  <Button
                    onClick={handleDownloadFromPreview}
                    disabled={isDownloadLoading}
                    size="sm" variant="outline"
                    className="gap-1.5 mt-2"
                  >
                    {isDownloadLoading
                      ? <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> Downloading…</>
                      : <><Download className="w-4 h-4" /> Download to view</>
                    }
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Multi-select floating action bar ── */}
      {isMultiSelect && selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-5 pointer-events-none">
        <div className="pointer-events-auto bg-white shadow-2xl rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-1 sm:gap-2 flex-nowrap">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 flex-shrink-0">
            <CheckSquare className="w-4 h-4 text-blue-500" />
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button
            size="sm" variant="ghost"
            onClick={() => openMoveDialog(getSelectedItems())}
            className="gap-1.5 text-xs flex-shrink-0"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Move to</span>
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={handleMultiDownload}
            disabled={isMultiDownloading}
            className="gap-1.5 text-xs flex-shrink-0"
          >
            {isMultiDownloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" />
                <span className="hidden sm:inline">
                  {multiDownloadProgress.done}/{multiDownloadProgress.total}
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </>
            )}
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={handleMultiDelete}
            className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={handleMultiCopy}
            className="gap-1.5 text-xs flex-shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            Clear selection
          </button>
        </div>
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* New folder */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <Input
            autoFocus placeholder="Folder name" value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isFolderCreating}>
              {isFolderCreating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renameTarget} onOpenChange={open => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.item_type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || isRenaming}>
              {isRenaming ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete (single or multi) */}
      <Dialog open={deleteItems.length > 0} onOpenChange={open => !open && setDeleteItems([])}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deleteItems.length === 1
                ? `Delete "${deleteItems[0]?.name}"?`
                : `Delete ${deleteItems.length} items?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            {deleteItems.length === 1
              ? 'This will permanently delete the item.'
              : `This will permanently delete ${deleteItems.length} items.`}
            {deleteItems.some(i => i.item_type === 'folder') && (
              <span className="block mt-1 text-red-600 text-xs font-medium">
                Folders and all their contents will be deleted.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItems([])}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File information */}
      <Dialog open={!!infoTarget} onOpenChange={open => !open && setInfoTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" /> File information
            </DialogTitle>
          </DialogHeader>
          {infoTarget && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {smallIcon(infoTarget)}
                <p className="text-sm font-medium text-slate-800 break-all">{infoTarget.name}</p>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {([
                    ['Type', infoTarget.item_type === 'folder' ? 'Folder' : (infoTarget.mime_type ?? 'File')],
                    ['Size', infoTarget.item_type === 'folder' ? '—' : formatFileSize(infoTarget.file_size)],
                    ['Created', new Date(infoTarget.created_at).toLocaleString()],
                    ['Modified', new Date(infoTarget.updated_at).toLocaleString()],
                  ] as [string, string][]).map(([label, value]) => (
                    <tr key={label}>
                      <td className="py-2 pr-3 text-slate-500 font-medium w-20">{label}</td>
                      <td className="py-2 text-slate-700 break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move / Copy destination picker dialog */}
      <Dialog open={moveItems.length > 0} onOpenChange={open => {
        if (!open) {
          setMoveItems([]);
          setIsCreatingFolderInDialog(false);
          setNewFolderNameInDialog('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'copy' ? 'Copy' : 'Move'} {moveItems.length} item{moveItems.length !== 1 ? 's' : ''}
            </DialogTitle>
            <p className="text-xs text-slate-500 pt-0.5">
              Select a destination folder {dialogMode === 'copy' ? 'to copy to' : 'or move to root'}
            </p>
          </DialogHeader>

          {/* Destination row */}
          <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 flex-shrink-0">Destination:</span>
            <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">
              {moveDestPath[moveDestPath.length - 1].name}
            </span>
            {moveDestPath.length > 1 && (
              <button
                onClick={handleMoveUp}
                className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Up
              </button>
            )}
          </div>

          {/* Folder list */}
          {!resetToRoot && (
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {isMoveLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading…</div>
                ) : moveFolders.filter(f => !moveItems.some(i => i.id === f.id)).length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400">No subfolders here</div>
                ) : (
                  moveFolders
                    .filter(f => !moveItems.some(i => i.id === f.id))
                    .map(folder => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{folder.name}</span>
                        <button
                          onClick={() => handleMoveNavigate(folder)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0 font-medium"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                )}
              </div>
              {/* New folder inline */}
              <div className="border-t border-slate-100 px-3 py-2">
                {isCreatingFolderInDialog ? (
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <input
                      autoFocus
                      value={newFolderNameInDialog}
                      onChange={e => setNewFolderNameInDialog(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateFolderInDialog();
                        if (e.key === 'Escape') { setIsCreatingFolderInDialog(false); setNewFolderNameInDialog(''); }
                      }}
                      placeholder="New folder name"
                      className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                    />
                    <Button size="sm" variant="outline" onClick={() => { setIsCreatingFolderInDialog(false); setNewFolderNameInDialog(''); }} className="h-7 text-xs px-2">Cancel</Button>
                    <Button
                      size="sm"
                      onClick={handleCreateFolderInDialog}
                      disabled={isDialogFolderCreating || !newFolderNameInDialog.trim()}
                      className="h-7 text-xs px-2 bg-[#0F2D52] text-white"
                    >
                      {isDialogFolderCreating ? '…' : 'Create'}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsCreatingFolderInDialog(true); setNewFolderNameInDialog(''); }}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> New Folder
                  </button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            {dialogMode === 'move' && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 order-last sm:order-first">
                <input
                  type="checkbox"
                  checked={resetToRoot}
                  onChange={e => {
                    setResetToRoot(e.target.checked);
                    if (e.target.checked) setMoveDestPath([{ id: null, name: 'My Drive' }]);
                  }}
                  className="rounded border-slate-300 text-[#0F2D52]"
                />
                Reset to Root
              </label>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setMoveItems([])}>Cancel</Button>
              <Button
                onClick={dialogMode === 'copy' ? handleCopyHere : handleMoveHere}
                disabled={isMoving || isCopyingDialog}
                className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white"
              >
                {dialogMode === 'copy'
                  ? (isCopyingDialog ? `Copying${moveItems.length > 1 ? ` ${moveItems.length} items` : ''}…` : 'Copy Here')
                  : (isMoving ? 'Moving…' : 'Move Here')
                }
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}
