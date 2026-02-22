import type {
  FileItem,
  PendingFile,
  FolderMetadata,
  DeletionMetadata,
  UploadQueueItem,
  ParentIdMapping,
  BoundingBox,
  SelectionBox,
  FilePosition,
} from "./types";
import { isFolderMetadata, isFolderItem, isDeletionMetadata } from "./types";
import { STORAGE_KEYS, PENDING_FILE_EXPIRY_MS } from "./constants";
import {
  formatDistanceToNow,
  format,
  formatISO,
  fromUnixTime,
  parseISO,
  getTime,
  isBefore,
} from "date-fns";

export function formatBytes(bytes: number, decimals = 0): string {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getStringSize(str: string): string {
  const sizeInBytes = new Blob([str]).size;
  return formatBytes(sizeInBytes);
}

export function downloadFile(filename: string, content: string): void {
  const element = document.createElement("a");
  const file = new Blob([content], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = filename.endsWith(".txt") ? filename : `${filename}.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function getFileTypeLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "json":
      return "JSON Mapping";
    case "js":
      return "JavaScript File";
    case "jsx":
      return "React JSX File";
    case "ts":
      return "TypeScript File";
    case "tsx":
      return "React TSX File";
    case "md":
    case "markdown":
      return "Markdown Document";
    case "txt":
      return "Text Document";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return "Image File";
    default:
      return "File";
  }
}

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getTurboExplorerUrl(dataItemId: string): string {
  return `https://arweave.net/${dataItemId}`;
}

export function getArweaveExplorerUrl(txId: string): string {
  return `https://viewblock.io/arweave/tx/${txId}`;
}

export function formatDataItemId(dataItemId: string): string {
  if (!dataItemId) return "";
  if (dataItemId.length <= 16) return dataItemId;
  return `${dataItemId.slice(0, 8)}...${dataItemId.slice(-8)}`;
}

export function formatTransactionId(txId: string): string {
  if (!txId) return "";
  if (txId.length <= 16) return txId;
  return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

export function formatTimestamp(timestamp: number): string {
  const date = fromUnixTime(timestamp);
  return format(date, "M/d/yyyy, h:mm:ss a");
}

export function getRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function getRelativeTimeFuture(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const now = new Date();
    if (isBefore(date, now)) return "Expired";

    // formatDistanceToNow handles future dates too by saying "in X..."
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}

export function validateArweaveAddress(address: string): boolean {
  return /^[a-zA-Z0-9_-]{43}$/.test(address);
}

export function validateDataItemId(dataItemId: string): boolean {
  return /^[a-zA-Z0-9_-]{43}$/.test(dataItemId);
}

export function validateTransactionId(txId: string): boolean {
  return /^[a-zA-Z0-9_-]{43}$/.test(txId);
}

export function isFileSizeValid(content: string, maxSize: number): boolean {
  const size = new Blob([content]).size;
  return size <= maxSize;
}

export function calculateTotalStorageUsed(
  files: Array<{ content?: string }>,
): number {
  return files.reduce((total, file) => {
    if (file.content) {
      return total + new Blob([file.content]).size;
    }
    return total;
  }, 0);
}

export function getSelectionBounds(box: SelectionBox): BoundingBox {
  return {
    left: Math.min(box.startX, box.currentX),
    top: Math.min(box.startY, box.currentY),
    right: Math.max(box.startX, box.currentX),
    bottom: Math.max(box.startY, box.currentY),
  };
}

export function isElementInSelection(
  elementBounds: BoundingBox,
  selectionBounds: BoundingBox,
): boolean {
  return !(
    elementBounds.right < selectionBounds.left ||
    elementBounds.left > selectionBounds.right ||
    elementBounds.bottom < selectionBounds.top ||
    elementBounds.top > selectionBounds.bottom
  );
}

export function getFilesInBoundingBox(
  filePositions: FilePosition[],
  selectionBox: SelectionBox,
): string[] {
  const selectionBounds = getSelectionBounds(selectionBox);

  return filePositions
    .filter((fp) => isElementInSelection(fp.bounds, selectionBounds))
    .map((fp) => fp.fileId);
}

export function getRangeSelection(
  files: FileItem[],
  fromId: string,
  toId: string,
): string[] {
  const fromIndex = files.findIndex((f) => f.id === fromId);
  const toIndex = files.findIndex((f) => f.id === toId);

  if (fromIndex === -1 || toIndex === -1) return [];

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);

  return files.slice(start, end + 1).map((f) => f.id);
}

export function getElementBounds(element: HTMLElement): BoundingBox {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  return {
    left: rect.left + scrollLeft,
    top: rect.top + scrollTop,
    right: rect.right + scrollLeft,
    bottom: rect.bottom + scrollTop,
  };
}

export function collectFilePositions(
  containerRef: HTMLElement | null,
): FilePosition[] {
  if (!containerRef) return [];

  const fileElements = containerRef.querySelectorAll(
    "[data-file-id]",
  ) as NodeListOf<HTMLElement>;

  return Array.from(fileElements).map((element) => ({
    fileId: element.getAttribute("data-file-id") || "",
    element,
    bounds: getElementBounds(element),
  }));
}

export function savePendingFiles(
  username: string,
  files: PendingFile[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.PENDING_FILES}_${username}_${slot}`
      : `${STORAGE_KEYS.PENDING_FILES}_${username}`;
    localStorage.setItem(key, JSON.stringify(files));
  } catch {}
}

export function getPendingFiles(
  username: string,
  slot?: string,
): PendingFile[] {
  try {
    const key = slot
      ? `${STORAGE_KEYS.PENDING_FILES}_${username}_${slot}`
      : `${STORAGE_KEYS.PENDING_FILES}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as PendingFile[];
  } catch {
    return [];
  }
}

export function savePendingFile(
  username: string,
  fileItem: FileItem,
  slot?: string,
): void {
  try {
    const pendingFiles = getPendingFiles(username, slot);
    const existingIndex = pendingFiles.findIndex(
      (pf) =>
        pf.fileItem.id === fileItem.id ||
        pf.fileItem.turboDataItemId === fileItem.turboDataItemId,
    );

    // SANITIZATION: Never save content to localStorage to prevent security leaks
    const safeFileItem = { ...fileItem, content: undefined };

    const pendingFile: PendingFile = {
      fileItem: safeFileItem,
      uploadTimestamp: getTime(new Date()),
      retryCount: 0,
    };

    if (existingIndex >= 0) {
      pendingFiles[existingIndex] = pendingFile;
    } else {
      pendingFiles.push(pendingFile);
    }

    savePendingFiles(username, pendingFiles, slot);
  } catch {}
}

export function updatePendingFileStatus(
  username: string,
  fileId: string,
  status: FileItem["status"],
  updates?: Partial<FileItem>,
  slot?: string,
): void {
  try {
    const pendingFiles = getPendingFiles(username, slot);
    const updated = pendingFiles.map((pf) =>
      pf.fileItem.id === fileId || pf.fileItem.turboDataItemId === fileId
        ? {
            ...pf,
            fileItem: {
              ...pf.fileItem,
              status,
              ...updates,
              content: undefined, // Ensure content is never saved
            },
          }
        : pf,
    );
    savePendingFiles(username, updated, slot);
  } catch {}
}

export function syncPendingFilesToLocalStorage(
  username: string,
  files: FileItem[],
  slot?: string,
): void {
  try {
    const pendingFiles = files
      .filter(
        (f) =>
          f.status === "pending-confirmation" ||
          f.status === "uploading" ||
          f.status === "queued",
      )
      .map((f) => ({
        fileItem: { ...f, content: undefined }, // Strip content for security
        uploadTimestamp: f.uploadTimestamp || getTime(new Date()),
        retryCount: f.uploadRetryCount || 0,
      }));

    savePendingFiles(username, pendingFiles, slot);
  } catch {}
}

export function savePinnedFiles(
  username: string,
  pinnedIds: string[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.PINNED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.PINNED_IDS}_${username}`;
    const existing = getPinnedFiles(username, slot);
    const combined = Array.from(new Set([...existing, ...pinnedIds]));
    localStorage.setItem(key, JSON.stringify(combined));
  } catch {}
}

export function removePinnedFile(
  username: string,
  fileId: string,
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.PINNED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.PINNED_IDS}_${username}`;
    const existing = getPinnedFiles(username, slot);
    const updated = existing.filter((id) => id !== fileId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export function getPinnedFiles(username: string, slot?: string): string[] {
  try {
    const key = slot
      ? `${STORAGE_KEYS.PINNED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.PINNED_IDS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function saveRecycleBinIds(
  username: string,
  deletedIds: string[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.DELETED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.DELETED_IDS}_${username}`;
    const existing = getRecycleBinIds(username, slot);
    const combined = Array.from(new Set([...existing, ...deletedIds]));
    localStorage.setItem(key, JSON.stringify(combined));
  } catch {}
}

export function removeRecycleBinId(
  username: string,
  fileId: string,
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.DELETED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.DELETED_IDS}_${username}`;
    const existing = getRecycleBinIds(username, slot);
    const updated = existing.filter((id) => id !== fileId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export function getRecycleBinIds(username: string, slot?: string): string[] {
  try {
    const key = slot
      ? `${STORAGE_KEYS.DELETED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.DELETED_IDS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function saveLockedFiles(
  username: string,
  lockedIds: string[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.LOCKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.LOCKED_IDS}_${username}`;
    const existing = getLockedFiles(username, slot);
    const combined = Array.from(new Set([...existing, ...lockedIds]));
    localStorage.setItem(key, JSON.stringify(combined));
  } catch {}
}

export function removeLockedFile(
  username: string,
  fileId: string,
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.LOCKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.LOCKED_IDS}_${username}`;
    const existing = getLockedFiles(username, slot);
    const updated = existing.filter((id) => id !== fileId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export function getLockedFiles(username: string, slot?: string): string[] {
  try {
    const key = slot
      ? `${STORAGE_KEYS.LOCKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.LOCKED_IDS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function saveBookmarkFiles(
  username: string,
  bookmarkIds: string[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}`;
    const existing = getBookmarkFiles(username, slot);
    const combined = Array.from(new Set([...existing, ...bookmarkIds]));
    localStorage.setItem(key, JSON.stringify(combined));
  } catch {}
}

export function removeBookmarkFile(
  username: string,
  fileId: string,
  slot?: string,
): void {
  try {
    const key = slot
      ? `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}`;
    const existing = getBookmarkFiles(username, slot);
    const updated = existing.filter((id) => id !== fileId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

export function getBookmarkFiles(username: string, slot?: string): string[] {
  try {
    const key = slot
      ? `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}_${slot}`
      : `${STORAGE_KEYS.BOOKMARKED_IDS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function cleanupConfirmedPendingFiles(
  username: string,
  confirmedIds: string[],
  slot?: string,
): void {
  try {
    const pendingFiles = getPendingFiles(username, slot);
    const confirmedSet = new Set(confirmedIds);
    const filtered = pendingFiles.filter(
      (pf) =>
        !confirmedSet.has(pf.fileItem.id) &&
        !confirmedSet.has(pf.fileItem.turboDataItemId || ""),
    );
    savePendingFiles(username, filtered, slot);
  } catch {}
}

export function removePendingFile(
  username: string,
  fileId: string,
  slot?: string,
): void {
  try {
    const pendingFiles = getPendingFiles(username, slot);
    const filtered = pendingFiles.filter(
      (pf) =>
        pf.fileItem.id !== fileId && pf.fileItem.turboDataItemId !== fileId,
    );
    savePendingFiles(username, filtered, slot);
  } catch {}
}

export function clearExpiredPendingFiles(
  username: string,
  maxAgeMs: number = PENDING_FILE_EXPIRY_MS,
  slot?: string,
): void {
  try {
    const pendingFiles = getPendingFiles(username, slot);
    const now = getTime(new Date());
    const filtered = pendingFiles.filter(
      (pf) => now - pf.uploadTimestamp < maxAgeMs,
    );
    savePendingFiles(username, filtered, slot);
  } catch {}
}

export function saveConfirmedIds(username: string, ids: string[]): void {
  try {
    const key = `${STORAGE_KEYS.CONFIRMED_IDS}_${username}`;
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {}
}

export function getConfirmedIds(username: string): string[] {
  try {
    const key = `${STORAGE_KEYS.CONFIRMED_IDS}_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch {
    return [];
  }
}

export function addConfirmedId(username: string, id: string): void {
  try {
    const ids = getConfirmedIds(username);
    if (!ids.includes(id)) {
      ids.push(id);
      saveConfirmedIds(username, ids);
    }
  } catch {}
}

export function clearAllPendingData(username: string): void {
  try {
    const pendingKey = `${STORAGE_KEYS.PENDING_FILES}_${username}`;
    const confirmedKey = `${STORAGE_KEYS.CONFIRMED_IDS}_${username}`;
    localStorage.removeItem(pendingKey);
    localStorage.removeItem(confirmedKey);
  } catch {}
}

export function mergePendingAndConfirmedFiles(
  confirmedFiles: FileItem[],
  pendingFiles: PendingFile[],
): FileItem[] {
  // Use a Map for robust deduplication by ID
  const mergedFilesMap = new Map<string, FileItem>();

  // 1. Add all confirmed files first
  confirmedFiles.forEach((f) => {
    mergedFilesMap.set(f.id, f);
    if (f.turboDataItemId) {
      mergedFilesMap.set(f.turboDataItemId, f);
    }
  });

  // 2. Add pending files, but ONLY if they don't conflict with a confirmed file's ID
  // If a pending file has the same ID as a confirmed file, it means it's likely the same file
  // but "pending" state usually has less reliable metadata than "confirmed" (except maybe for immediate UI updates).
  // However, for "uploading" or "pending-confirmation" which is newer, we might want to prioritize it?
  // Actually, confirmed is 'truth', pending is 'optimistic'.
  // But our previous logic was: distinct pending files should be added.

  pendingFiles.forEach((pf) => {
    const pItem = pf.fileItem;
    // Check if this pending file is already represented in confirmed files
    const existingByTurboId =
      pItem.turboDataItemId && mergedFilesMap.get(pItem.turboDataItemId);
    const existingById = mergedFilesMap.get(pItem.id);

    const existingItem = existingByTurboId || existingById;

    if (existingItem) {
      // CONFLICT RESOLUTION: "Name Persistence"
      // If the Confirmed file exists but is named "Untitled" (e.g. decryption lag),
      // and we have a local Pending version with a Real Name, we must PRESERVE the Real Name.
      if (
        (existingItem.name === "Untitled" || !existingItem.name) &&
        pItem.name &&
        pItem.name !== "Untitled"
      ) {
        // Create a merged item: Keep Confirmed ID/Status, but take Pending Name
        const fixedItem = {
          ...existingItem,
          name: pItem.name,
        };
        mergedFilesMap.set(existingItem.id, fixedItem);
        if (existingItem.turboDataItemId) {
          mergedFilesMap.set(existingItem.turboDataItemId, fixedItem);
        }
      }
    } else {
      // It's a new pending file not yet confirmed/merged
      const newItem: FileItem = {
        ...pItem,
        confirmationStartedAt:
          pf.uploadTimestamp || pItem.confirmationStartedAt,
        status:
          pItem.status === "confirmed" ? "pending-confirmation" : pItem.status,
      };
      mergedFilesMap.set(newItem.id, newItem);
    }
  });

  // Convert map values to array and deduplicate strictly by object reference/ID to avoid duplicates from turboID alias
  const uniqueFiles = Array.from(new Set(mergedFilesMap.values()));

  const filesOnly = uniqueFiles.filter((f) => f.type === "file");
  const foldersOnly = uniqueFiles.filter((f) => f.type === "folder");

  return [...foldersOnly, ...filesOnly];
}

export function getLatestFileVersions(files: FileItem[]): FileItem[] {
  const filesByParent = new Map<string, FileItem[]>();
  const standaloneFiles: FileItem[] = [];
  const allIds = new Set(files.map((f) => f.id));

  files.forEach((file) => {
    const parentId = file.parentFileId;

    // A file is standalone if it has no parentId OR its parentId is not in the current set (orphan)
    if (!parentId || !allIds.has(parentId)) {
      standaloneFiles.push(file);
    } else {
      if (!filesByParent.has(parentId)) {
        filesByParent.set(parentId, []);
      }
      filesByParent.get(parentId)!.push(file);
    }
  });

  const latestVersions: FileItem[] = [];

  standaloneFiles.forEach((file) => {
    const versions = filesByParent.get(file.id) || [];

    if (versions.length > 0) {
      const latest = versions.reduce((prev, current) => {
        const prevVersion = prev.fileVersion || 0;
        const currentVersion = current.fileVersion || 0;
        return currentVersion > prevVersion ? current : prev;
      });
      latestVersions.push({
        ...latest,
        isLatestVersion: true,
      });
    } else {
      latestVersions.push({
        ...file,
        isLatestVersion: true,
      });
    }
  });

  return latestVersions;
}

export function getFileVersionHistory(
  fileId: string,
  files: FileItem[],
): FileItem[] {
  const file = files.find((f) => f.id === fileId);
  if (!file) return [];

  const originalId = file.parentFileId || file.id;

  return files
    .filter((f) => f.id === originalId || f.parentFileId === originalId)
    .sort((a, b) => (b.fileVersion || 0) - (a.fileVersion || 0));
}

export function buildFolderHierarchy(
  files: FileItem[],
): Map<string, FileItem[]> {
  const hierarchy = new Map<string, FileItem[]>();

  const rootKey = "root";
  hierarchy.set(rootKey, []);

  files.forEach((file) => {
    const parentKey = file.parentId || rootKey;

    if (!hierarchy.has(parentKey)) {
      hierarchy.set(parentKey, []);
    }

    hierarchy.get(parentKey)!.push(file);
  });

  return hierarchy;
}

export function getFolderPath(folderId: string, files: FileItem[]): string {
  const folder = files.find((f) => f.id === folderId && isFolderItem(f));
  if (!folder) return "";

  const pathParts: string[] = [folder.name];
  let currentId = folder.parentId;

  while (currentId) {
    const parent = files.find((f) => f.id === currentId && isFolderItem(f));
    if (parent) {
      pathParts.unshift(parent.name);
      currentId = parent.parentId;
    } else {
      break;
    }
  }

  return pathParts.join("/");
}

export function createFolderMetadata(
  folderId: string,
  folderName: string,
  parentId: string | null,
  createdBy: string,
): FolderMetadata {
  return {
    folderId,
    folderName,
    parentId,
    children: [],
    createdBy,
    createdAt: formatISO(new Date()),
    modifiedAt: formatISO(new Date()),
    folderPath: folderName,
    isDeleted: false,
  };
}

export function updateFolderChildren(
  metadata: FolderMetadata,
  childId: string,
  action: "add" | "remove",
): FolderMetadata {
  const children = [...metadata.children];

  if (action === "add" && !children.includes(childId)) {
    children.push(childId);
  } else if (action === "remove") {
    const index = children.indexOf(childId);
    if (index > -1) {
      children.splice(index, 1);
    }
  }

  return {
    ...metadata,
    children,
    modifiedAt: formatISO(new Date()),
  };
}

export function isFolderMetadataHelper(data: unknown): data is FolderMetadata {
  return isFolderMetadata(data);
}

export function countFoldersOnChain(files: FileItem[]): number {
  return files.filter(
    (f) =>
      isFolderItem(f) &&
      f.turboDataItemId &&
      (f.status === "confirmed" || f.status === "pending-confirmation") &&
      !f.isDeleted &&
      !f.deletedAt,
  ).length;
}

export function getFolderStats(files: FileItem[]): {
  totalFolders: number;
  foldersOnChain: number;
  foldersPending: number;
  foldersLocal: number;
} {
  const folders = files.filter(isFolderItem);

  return {
    totalFolders: folders.length,
    foldersOnChain: folders.filter((f) => f.status === "confirmed").length,
    foldersPending: folders.filter(
      (f) => f.status === "pending-confirmation" || f.status === "uploading",
    ).length,
    foldersLocal: folders.filter((f) => !f.turboDataItemId).length,
  };
}

export function createDeletionMetadata(
  file: FileItem,
  username: string,
): DeletionMetadata {
  return {
    itemId: file.turboDataItemId || file.id,
    itemName: file.name,
    itemType: file.type,
    deletedAt: formatISO(new Date()),
    deletedBy: username,
    parentId: file.parentId,
    fileVersion: (file.fileVersion || 1) + 1,
    parentFileId: file.parentFileId,
  };
}

export function createRenameMetadata(
  fileId: string,
  oldName: string,
  newName: string,
  username: string,
  currentVersion: number,
): {
  fileId: string;
  oldName: string;
  newName: string;
  renamedAt: string;
  renamedBy: string;
  fileVersion: number;
} {
  return {
    fileId,
    oldName,
    newName,
    renamedAt: formatISO(new Date()),
    renamedBy: username,
    fileVersion: currentVersion + 1,
  };
}

export function isDeletionMetadataHelper(
  data: unknown,
): data is DeletionMetadata {
  return isDeletionMetadata(data);
}

export function filterDeletedFiles(files: FileItem[]): FileItem[] {
  return files.filter((f) => !f.isDeleted && !f.deletedAt);
}

export function filterActiveFiles(files: FileItem[]): FileItem[] {
  return files.filter(
    (f) =>
      !f.isDeleted &&
      !f.deletedAt &&
      f.status !== "failed" &&
      f.isLatestVersion !== false,
  );
}

export function getDeletedFiles(files: FileItem[]): FileItem[] {
  return files.filter((f) => f.isDeleted || f.deletedAt);
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/^\.+/, "")
    .trim();
}

export function generateUniqueFileName(
  baseName: string,
  existingNames: string[],
): string {
  let name = baseName;
  let counter = 1;

  const nameSet = new Set(existingNames);

  while (nameSet.has(name)) {
    const lastDotIndex = baseName.lastIndexOf(".");
    if (lastDotIndex > 0) {
      const nameWithoutExt = baseName.substring(0, lastDotIndex);
      const ext = baseName.substring(lastDotIndex);
      name = `${nameWithoutExt} (${counter})${ext}`;
    } else {
      name = `${baseName} (${counter})`;
    }
    counter++;
  }

  return name;
}

export function resolveParentId(
  parentId: string | null,
  mapping: ParentIdMapping,
): string | null {
  if (!parentId) return null;
  return mapping[parentId] || parentId;
}

export function updateChildrenParentIds(
  files: FileItem[],
  oldParentId: string,
  newParentId: string,
): FileItem[] {
  return files.map((file) =>
    file.parentId === oldParentId
      ? { ...file, parentId: newParentId, tempParentId: oldParentId }
      : file,
  );
}

export function validateParentExists(
  parentId: string | null,
  files: FileItem[],
): boolean {
  if (!parentId) return true;
  return files.some((f) => f.id === parentId && f.type === "folder");
}

export function saveParentIdMapping(
  username: string,
  mapping: ParentIdMapping,
  slot?: string,
): void {
  try {
    const key = slot
      ? `parent_id_mapping_${username}_${slot}`
      : `parent_id_mapping_${username}`;
    localStorage.setItem(key, JSON.stringify(mapping));
  } catch {}
}

export function getParentIdMapping(
  username: string,
  slot?: string,
): ParentIdMapping {
  try {
    const key = slot
      ? `parent_id_mapping_${username}_${slot}`
      : `parent_id_mapping_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return {};
    return JSON.parse(data) as ParentIdMapping;
  } catch {
    return {};
  }
}

export function saveUploadQueue(
  username: string,
  queue: UploadQueueItem[],
  slot?: string,
): void {
  try {
    const key = slot
      ? `upload_queue_${username}_${slot}`
      : `upload_queue_${username}`;
    localStorage.setItem(key, JSON.stringify(queue));
  } catch {}
}

export function getUploadQueue(
  username: string,
  slot?: string,
): UploadQueueItem[] {
  try {
    const key = slot
      ? `upload_queue_${username}_${slot}`
      : `upload_queue_${username}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as UploadQueueItem[];
  } catch {
    return [];
  }
}

export function calculateItemPriority(item: UploadQueueItem): number {
  if (item.item.type === "folder" && !item.dependsOn) return 1;
  if (item.item.type === "folder" && item.dependsOn) return 2;
  if (item.item.type === "file" && !item.dependsOn) return 3;
  return 4;
}

export function sortUploadQueue(queue: UploadQueueItem[]): UploadQueueItem[] {
  return queue.sort((a, b) => {
    const aPriority = calculateItemPriority(a);
    const bPriority = calculateItemPriority(b);

    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.addedAt - b.addedAt;
  });
}

export function getReadyQueueItems(
  queue: UploadQueueItem[],
  mapping: ParentIdMapping,
): UploadQueueItem[] {
  return queue.filter((item) => {
    if (!item.dependsOn) return true;

    // If we have a mapping for the parent, it means parent is uploaded but maybe not confirmed
    // But we already resolve IDs before this.
    // The key check is: Is the parent currently waiting in the queue?
    // If yes, we must wait.
    // If no, we assume the parent exists (already uploaded or pre-existing) and we can proceed.

    // Also check mapping just in case the ID hasn't been swapped in the queue item yet (race condition)
    if (mapping[item.dependsOn]) return true;

    const parentInQueue = queue.some((q) => q.item.id === item.dependsOn);
    return !parentInQueue;
  });
}

export async function hashUsername(username: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(username);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export function updateAuxiliaryIds(
  username: string,
  oldId: string,
  newId: string,
  slot?: string,
): void {
  try {
    // Update Pinned
    const pinned = getPinnedFiles(username, slot);
    if (pinned.includes(oldId)) {
      savePinnedFiles(
        username,
        pinned.map((id) => (id === oldId ? newId : id)),
        slot,
      );
    }

    // Update Locked
    const locked = getLockedFiles(username, slot);
    if (locked.includes(oldId)) {
      saveLockedFiles(
        username,
        locked.map((id) => (id === oldId ? newId : id)),
        slot,
      );
    }

    // Update bookmarked files
    const bookmarked = getBookmarkFiles(username, slot);
    if (bookmarked.includes(oldId)) {
      saveBookmarkFiles(
        username,
        bookmarked.map((id) => (id === oldId ? newId : id)),
        slot,
      );
    }

    // Update Hidden Files (previously recycle bin)
    const recycle = getRecycleBinIds(username, slot);
    if (recycle.includes(oldId)) {
      saveRecycleBinIds(
        username,
        recycle.map((id) => (id === oldId ? newId : id)),
        slot,
      );
    }
  } catch {}
}
export * from "./utils_tags";
