"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { format, parseISO, formatISO, getTime, fromUnixTime } from "date-fns";
import type {
  FileItem,
  FileType,
  ViewDisplayMode,
  SortKey,
  SortDirection,
  SortConfig,
  VaultStats,
  ClipboardData,
  UploadQueueItem,
  ParentIdMapping,
  PasswordSlot,
  MultiPasswordConfig,
} from "@/lib/types";
import type { ViewState } from "@/components/Sidebar";
import {
  countFoldersOnChain,
  createFolderMetadata,
  getFolderPath,
  getStringSize,
  formatBytes,
  resolveParentId,
  updateChildrenParentIds,
  saveParentIdMapping,
  getParentIdMapping,
  saveUploadQueue,
  getUploadQueue,
  sortUploadQueue,
  getReadyQueueItems,
  savePendingFile,
  syncPendingFilesToLocalStorage,
  cleanupConfirmedPendingFiles,
  savePinnedFiles,
  removePinnedFile,
  getPinnedFiles,
  saveRecycleBinIds,
  removeRecycleBinId,
  getRecycleBinIds,
  saveBookmarkFiles,
  getBookmarkFiles,
  removeBookmarkFile,
  updateAuxiliaryIds,
  getLatestFileVersions,
  mergePendingAndConfirmedFiles,
  getPendingFiles,
  clearExpiredPendingFiles,
  saveFileTags,
  getFileTags,
  removePendingFile,
} from "@/lib/utils";

// Helper to save files to cache (excluding content to save space)
const saveFilesToCache = (
  username: string,
  slot: string,
  files: FileItem[],
) => {
  try {
    const minifiedFiles = files
      .filter(
        (f) =>
          !f.id.startsWith("temp_") &&
          f.name !== "🔒 Encrypted File" &&
          f.name !== "Encrypted File",
      ) // Fix: Do not cache temp files or placeholders
      .map((f) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content, ...rest } = f;
        return rest;
      });
    localStorage.setItem(
      `${STORAGE_KEYS.FILES_CACHE}_${username}_${slot}`,
      JSON.stringify(minifiedFiles),
    );
  } catch (e) {
    console.error("Failed to save files to cache:", e);
  }
};

const loadFilesFromCache = (username: string, slot: string): FileItem[] => {
  try {
    const cached = localStorage.getItem(
      `${STORAGE_KEYS.FILES_CACHE}_${username}_${slot}`,
    );
    if (cached) {
      const parsed = JSON.parse(cached) as FileItem[];
      return parsed.filter(
        (f) =>
          !f.id.startsWith("temp_") &&
          f.name !== "🔒 Encrypted File" &&
          f.name !== "Encrypted File",
      ); // Fix: Filter out any legacy temp files or placeholders
    }
  } catch (e) {
    console.error("Failed to load files from cache:", e);
  }
  return [];
};

import { POLLING_INTERVAL_MS, STORAGE_KEYS } from "@/lib/constants";
import { useArweave } from "./ArweaveContext";
import {
  uploadEncryptedFile,
  UploadError,
  FileSizeExceededError,
  FolderSizeExceededError,
  uploadFolderMetadata,
  uploadMetadataUpdate,
  markFileAsDeleted,
} from "@/lib/arweave/upload";
import {
  downloadEncryptedFile,
  getFileMetadata,
  queryAllItemsByOwner,
  downloadUserRegistry,
} from "@/lib/arweave/download";

import {
  deriveUserEncryptionKey,
  decryptData,
  EncryptedData,
} from "@/lib/crypto/encryption";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

// FIX: Helper to get encrypted password data for the active slot
// This ensures secondary/tertiary password users can decrypt their files
const getPasswordForSlot = (
  passwords: MultiPasswordConfig | undefined,
  slot: PasswordSlot | null,
): EncryptedData | undefined => {
  if (!passwords) return undefined;
  if (!slot) return passwords.primary;
  return passwords[slot];
};

export type ExplorerMode = "BROWSER" | "EDITOR";

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

type PasswordRequestType = "decrypt" | "encrypt" | "update" | "delete";

interface PasswordRequest {
  type: PasswordRequestType;
  title: string;
  message: string;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  verify?: (password: string) => Promise<boolean>;
}

interface VaultContextType {
  files: FileItem[];
  currentFolderId: string | null;
  selectedFileId: string | null;
  currentView: ViewState;
  viewMode: ExplorerMode;
  viewDisplayMode: ViewDisplayMode;
  sortConfig: SortConfig;
  searchQuery: string;
  breadcrumbs: BreadcrumbItem[];
  clipboard: ClipboardData | null;
  stats: VaultStats;
  isSidebarCollapsed: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  uploadQueue: UploadQueueItem[];
  parentIdMapping: ParentIdMapping;

  setView: (view: ViewState) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setViewDisplayMode: (mode: ViewDisplayMode) => void;
  navigateToFolder: (folderId: string | null) => void;
  selectFile: (fileId: string | null) => void;
  openFile: (fileId: string) => Promise<void>;
  closeFile: () => void;
  addFile: (
    type: FileType,
    name?: string,
    content?: string,
    parentId?: string | null,
  ) => Promise<string | void>;
  deleteFile: (id: string) => Promise<void>;
  restoreFile: (id: string) => void;
  emptyHiddenFiles: () => void;
  updateFileContent: (id: string, content: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  openFileFromAnywhere: (fileId: string) => Promise<void>;
  syncFiles: (showLoading?: boolean) => Promise<void>;
  processUploadQueue: () => Promise<void>;
  updateParentMapping: (tempId: string, confirmedId: string) => void;
  addBackupPassword: (
    newPassword: string,
    slot: Exclude<PasswordSlot, "primary">,
  ) => Promise<void>;
  removeBackupPassword: (
    slot: Exclude<PasswordSlot, "primary">,
  ) => Promise<void>;

  toggleSortKey: (key: SortKey) => void;
  setSortDirection: (dir: SortDirection) => void;
  togglePin: (id: string) => void;
  toggleBookmark: (id: string) => void;
  setFileTag: (id: string, color: string) => void;

  addFileNote: (id: string, note: string) => void;

  copyFile: (id: string) => void;
  cutFile: (id: string) => void;
  pasteFile: () => void;

  toggleSidebarCollapse: () => void;

  selectedFileIds: Set<string>;
  selectMultipleFiles: (fileIds: string[]) => void;
  toggleFileSelection: (fileId: string, isCtrlKey: boolean) => void;
  clearSelection: () => void;
  selectAllFiles: () => void;
  batchDelete: (fileIds: string[]) => Promise<void>;
  batchCopy: (fileIds: string[]) => void;
  batchCut: (fileIds: string[]) => void;
  batchToggleBookmark: (fileIds: string[]) => void;
  batchSetTag: (fileIds: string[], color: string) => void;
  verifiedFileIds: Set<string>;
  isHiddenFilesVerified: boolean;
  userPassword: string;
  decryptionKey: { key: string; signature: string } | null; // Changed to object with signature for strict session binding
  setVaultPassword: (password: string) => void;
  requestPassword: (
    type: PasswordRequestType,
    title: string,
    message: string,
    verify?: (password: string) => Promise<boolean>,
    updateGlobalState?: boolean,
  ) => Promise<string>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

// Helper to generate strict session signature
const generateSessionSignature = (
  username: string | null,
  slot: string | null,
) => {
  if (!username || !slot) return null;
  return `${username}:${slot}`;
};

function PasswordPromptModal({ request }: { request: PasswordRequest | null }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (request.verify) {
        const isValid = await request.verify(password);
        if (!isValid) {
          setAttempts((prev) => prev + 1);
          throw new Error("Password incorrect. Please check and try again.");
        }
      }
      await request.onConfirm(password);
      setPassword("");
      setShowPassword(false);
      setAttempts(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setShowPassword(false);
    setError(null);
    request.onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-2xl w-96">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={24} className="text-blue-500" />
          <h3 className="text-zinc-900 dark:text-zinc-50 font-bold text-lg">
            {request.title}
          </h3>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-xs md:text-sm">
          {request.message}
        </p>

        {attempts > 0 && (
          <div className="mb-4 px-3 py-2 bg-red-950/20 border border-red-900/50 rounded text-[10px] md:text-xs text-red-500 flex items-center gap-2">
            <AlertCircle size={12} />
            <span>
              Attempt {attempts} failed. Check your password and try again.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Password
            </label>
            <div
              className={`relative ${attempts > 0 && error ? "animate-shake" : ""}`}
            >
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                autoFocus
                disabled={isProcessing}
                className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isProcessing}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/20 border border-red-900/50 dark:border-red-700/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-red-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !password.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-zinc-50 px-4 py-2 rounded font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const {
    username,
    isAuthenticated,
    addBackupPassword: arweaveAddPassword,
    removeBackupPassword: arweaveRemovePassword,
    needsPasswordVerification,
    clearPasswordVerification,
    activePasswordSlot,
  } = useArweave();
  const [files, setFiles] = useState<FileItem[]>([]);

  // Load from cache on mount/username change

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setViewState] = useState<ViewState>("HOME");
  const [isHiddenFilesVerified, setIsHiddenFilesVerified] = useState(false);
  const [viewMode, setViewMode] = useState<ExplorerMode>("BROWSER");
  const [viewDisplayMode, setViewDisplayMode] =
    useState<ViewDisplayMode>("list");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userPassword, setUserPassword] = useState<string>("");
  const [decryptionKey, setDecryptionKey] = useState<{
    key: string;
    signature: string;
  } | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [parentIdMapping, setParentIdMapping] = useState<ParentIdMapping>({});
  const [passwordRequest, setPasswordRequest] =
    useState<PasswordRequest | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const [verifiedFileIds, setVerifiedFileIds] = useState<Set<string>>(
    new Set(),
  );

  // FIX Issue 2: Track password slot changes to clear cache
  const lastActiveSlotRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const hasSyncedRef = useRef(false);
  const isProcessingQueueRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filesRef = useRef<FileItem[]>([]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Auto-generate decryption key when userPassword changes (backward compatibility)
  useEffect(() => {
    if (userPassword && username && activePasswordSlot) {
      const signature = generateSessionSignature(username, activePasswordSlot);
      if (!signature) return;

      deriveUserEncryptionKey(username, userPassword)
        .then((key) => {
          // Only update if the signature matches what we expect (prevent race condition)
          if (
            generateSessionSignature(username, activePasswordSlot) === signature
          ) {
            setDecryptionKey({ key, signature });
          }
        })
        .catch(console.error);
    }
  }, [userPassword, username, activePasswordSlot]);

  // FIX Bug 2: Request password verification on session restore
  // This ensures the correct encryption key is derived for secondary/tertiary password slots
  useEffect(() => {
    if (
      needsPasswordVerification &&
      username &&
      isAuthenticated &&
      !userPassword
    ) {
      console.log(
        "Session restored, clearing cache for security until verified",
      );
      // Clear cache for ALL slots to prevent showing stale decrypted filenames
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(`${STORAGE_KEYS.FILES_CACHE}_${username}`)) {
          localStorage.removeItem(key);
        }
      });
      setFiles([]);

      // The password will be requested on first sync or file operation
      // We just need to ensure the cache is cleared
      clearPasswordVerification();
    }
  }, [
    needsPasswordVerification,
    username,
    isAuthenticated,
    userPassword,
    clearPasswordVerification,
  ]);

  // FIX Issue 2: Detect password slot changes and clear cache
  useEffect(() => {
    if (!username || !activePasswordSlot) return;

    // On first mount, just record the slot
    if (lastActiveSlotRef.current === null) {
      lastActiveSlotRef.current = activePasswordSlot;
      return;
    }

    // If slot changed, clear cache and files for new vault
    if (lastActiveSlotRef.current !== activePasswordSlot) {
      console.log(
        `Password slot changed from ${lastActiveSlotRef.current} to ${activePasswordSlot}, clearing cache`,
      );

      const newSignature = generateSessionSignature(
        username,
        activePasswordSlot,
      );
      const currentSignature = decryptionKey?.signature;

      // Only wipe if we are genuinely out of sync
      if (currentSignature !== newSignature) {
        // Clear all vault caches for this user
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(`${STORAGE_KEYS.FILES_CACHE}_${username}`)) {
            localStorage.removeItem(key);
          }
        });
        setFiles([]);
        setUserPassword(""); // Reset password to force re-entry
        setDecryptionKey(null);
        hasSyncedRef.current = false;
      }

      lastActiveSlotRef.current = activePasswordSlot;
    }
  }, [activePasswordSlot, username, decryptionKey]);

  const requestPassword = useCallback(
    (
      type: PasswordRequestType,
      title: string,
      message: string,
      verify?: (password: string) => Promise<boolean>,
      updateGlobalState: boolean = true,
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        setPasswordRequest({
          type,
          title,
          message,
          verify,
          onConfirm: async (password: string) => {
            if (updateGlobalState) {
              setUserPassword(password);
            }
            setPasswordRequest(null);
            resolve(password);
          },
          onCancel: () => {
            setPasswordRequest(null);
            reject(new Error("Password input cancelled"));
          },
        });
      });
    },
    [],
  );

  const updateParentMapping = useCallback(
    (tempId: string, confirmedId: string) => {
      setParentIdMapping((prev) => {
        const updated = { ...prev, [tempId]: confirmedId };
        if (username) {
          saveParentIdMapping(
            username,
            updated,
            activePasswordSlot || undefined,
          );
          updateAuxiliaryIds(
            username,
            tempId,
            confirmedId,
            activePasswordSlot || undefined,
          );
        }
        return updated;
      });

      setFiles((prev) => updateChildrenParentIds(prev, tempId, confirmedId));

      setUploadQueue((prev) => {
        const updatedQueue = prev.map((q) =>
          q.dependsOn === tempId ? { ...q, dependsOn: confirmedId } : q,
        );
        if (username) {
          saveUploadQueue(
            username,
            updatedQueue,
            activePasswordSlot || undefined,
          );
        }
        return updatedQueue;
      });
    },
    [username],
  );

  useEffect(() => {
    if (!username || !isAuthenticated) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      syncPendingFilesToLocalStorage(
        username,
        filesRef.current,
        activePasswordSlot || undefined,
      );
      if (activePasswordSlot) {
        saveFilesToCache(username, activePasswordSlot, filesRef.current);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [files, username, isAuthenticated, activePasswordSlot]);

  const addBackupPassword = useCallback(
    async (newPassword: string, slot: Exclude<PasswordSlot, "primary">) => {
      let password = userPassword;
      if (!password) {
        try {
          password = await requestPassword(
            "update",
            "Confirm Password",
            "Please confirm your password to add a backup password slot.",
          );
        } catch {
          throw new Error("Password confirmation cancelled");
        }
      }
      await arweaveAddPassword(password, newPassword, slot);
    },
    [userPassword, arweaveAddPassword, requestPassword],
  );

  const removeBackupPassword = useCallback(
    async (slot: Exclude<PasswordSlot, "primary">) => {
      let password = userPassword;
      if (!password) {
        try {
          password = await requestPassword(
            "update",
            "Confirm Password",
            "Please confirm your password to remove this password slot.",
          );
        } catch {
          throw new Error("Password confirmation cancelled");
        }
      }
      await arweaveRemovePassword(password, slot);
    },
    [userPassword, arweaveRemovePassword, requestPassword],
  );

  const syncFiles = useCallback(
    async (showLoading: boolean = false) => {
      if (!username || !isAuthenticated || isSyncingRef.current) return;

      isSyncingRef.current = true;
      if (showLoading) setIsSyncing(true);

      // Fix: Prevent sync race condition where sync starts before password is set
      // resulting in empty file list. We should wait for password/key.
      if (!decryptionKey && !userPassword && activePasswordSlot) {
        if (showLoading) setIsSyncing(false);
        isSyncingRef.current = false;
        return;
      }

      try {
        const { files: transactions, deletedItemIds } =
          await queryAllItemsByOwner(username);

        // Safeguard against network issues returning empty list but not throwing
        // Arweave state (transactions) should strictly increase or stay same.
        // If we have confirmed files but receive 0 transactions, it's likely a gateway/indexer error.
        const hasConfirmedFiles = filesRef.current.some(
          (f) => f.status === "confirmed",
        );
        if (transactions.length === 0 && hasConfirmedFiles) {
          console.warn(
            "Sync returned 0 transactions but we have confirmed files. Ignoring to prevent data loss.",
          );
          isSyncingRef.current = false;
          if (showLoading) setIsSyncing(false);
          return;
        }

        const turboItems: FileItem[] = [];
        const newConfirmedIds: string[] = [];

        // Fix Performance: Derive key ONCE outside the loop
        // Fix Performance: Derive key ONCE outside the loop
        let resolvedEncryptionKey =
          decryptionKey &&
          decryptionKey.signature ===
            generateSessionSignature(username, activePasswordSlot)
            ? decryptionKey.key
            : null;

        if (!resolvedEncryptionKey && userPassword) {
          try {
            resolvedEncryptionKey = await deriveUserEncryptionKey(
              username,
              userPassword,
            );
          } catch (e) {
            console.error("Failed to derive key for sync:", e);
          }
        }

        for (const tx of transactions) {
          const metadata = getFileMetadata(tx);
          const isFolder = metadata.dataType === "Folder-Metadata";

          let decryptedName = metadata.fileName;
          let isDecrypted = false;

          // Try to decrypt if we have a key OR a password
          if (metadata.encryptedName && resolvedEncryptionKey) {
            try {
              let encryptedData: EncryptedData | null = null;
              try {
                encryptedData = JSON.parse(metadata.encryptedName);
              } catch {
                // ignore
              }

              if (encryptedData && encryptedData.ciphertext) {
                const val = await decryptData(
                  encryptedData,
                  resolvedEncryptionKey,
                );
                if (val) {
                  decryptedName = val;
                  isDecrypted = true;
                }
              }
            } catch {
              // Decoy Safeguard: When falling back to pending files, ensure we only look at the current vault's pending files
              const pending = getPendingFiles(
                username,
                activePasswordSlot || undefined,
              );
              const matchingPending = pending.find(
                (p) =>
                  p.fileItem.turboDataItemId === metadata.dataItemId ||
                  p.fileItem.id === metadata.dataItemId,
              );

              if (matchingPending) {
                decryptedName = matchingPending.fileItem.name;
                isDecrypted = true;
              }
            }
          } else if (!metadata.encryptedName) {
            isDecrypted = true;
          }

          if (
            !isDecrypted ||
            decryptedName === "🔒 Encrypted File" ||
            decryptedName === "Encrypted File"
          ) {
            // Decoy Safeguard: If we cannot decrypt the name, or it's a legacy placeholder, skip it.
            continue;
          }

          const status =
            tx.block && tx.block.height > 0
              ? "confirmed"
              : "pending-confirmation";

          const confirmationFinishedAt =
            tx.block && tx.block.timestamp
              ? getTime(fromUnixTime(tx.block.timestamp))
              : undefined;

          const item: FileItem = {
            id: metadata.dataItemId,
            name: decryptedName,
            type: isFolder ? "folder" : "file",
            content: undefined,
            size: isFolder
              ? "-"
              : metadata.size
                ? formatBytes(parseInt(metadata.size))
                : "Loading...",
            location: "Arweave",
            status,
            confirmationFinishedAt,
            parentId: metadata.parentFolderId || null,
            dateCreated: metadata.createdAt,
            dateModified: metadata.createdAt,
            dateAccessed: format(new Date(), "M/d/yyyy, h:mm:ss a"),
            isLocked: false,
            lockExpiry: undefined,
            isBookmarked: metadata.isBookmarked || false,
            isPinned: metadata.isPinned || false,
            colorTag: metadata.colorTag,
            note: metadata.note,
            turboDataItemId: metadata.dataItemId,
            isMapping: metadata.isMapping || false,
            owner: metadata.owner,
            fileVersion: metadata.fileVersion || 1,
            parentFileId: metadata.parentFileId,
            previousVersionId: metadata.previousVersionId,
            isLatestVersion: true,
            isDeleted: metadata.isDeleted,
            deletedAt: metadata.deletedAt,
            encryptedName: metadata.encryptedName,
          };

          turboItems.push(item);
          newConfirmedIds.push(metadata.dataItemId);
        }

        const latestVersions = getLatestFileVersions(turboItems);

        const currentPending = getPendingFiles(
          username,
          activePasswordSlot || undefined,
        ).filter(
          (pf) => !newConfirmedIds.includes(pf.fileItem.turboDataItemId || ""),
        );

        const preservedPending = filesRef.current.filter(
          (f) =>
            (f.status === "uploading" ||
              f.status === "queued" ||
              f.status === "pending-confirmation") &&
            !newConfirmedIds.includes(f.id) &&
            !newConfirmedIds.includes(f.turboDataItemId || ""),
        );

        // --- SAFE MERGE LOGIC ---
        // Identify confirmed files that are currently in our state but missing from the new sync.
        // Only remove them if they are explicitly in the `deletedItemIds` set.
        // Otherwise, assume indexer lag and PRESERVE them.

        // FIX: Load recycleBinIds BEFORE using it in preservedConfirmed filter
        const recycleBinIds = new Set(
          getRecycleBinIds(username, activePasswordSlot || undefined),
        );

        const preservedConfirmed = filesRef.current.filter((f) => {
          if (f.status !== "confirmed") return false;

          const id = f.id;
          const tid = f.turboDataItemId;

          // If it's in the new result, we don't need to "preserve" it (it's already in turboItems)
          if (
            newConfirmedIds.includes(id) ||
            (tid && newConfirmedIds.includes(tid))
          ) {
            return false;
          }

          // FIX A2: If the file is "Encrypted File", it means we intentionally want to hide it (Decoy Vault).
          // Do NOT preserve it.
          if (
            f.name === "🔒 Encrypted File" ||
            f.name === "Encrypted File" ||
            !f.name
          ) {
            return false;
          }

          // It's missing. Check if it was explicitly deleted.
          // It's missing. Check if it was explicitly deleted locally or on chain.
          const isExplicitlyDeleted =
            deletedItemIds.has(id) ||
            (tid && deletedItemIds.has(tid)) ||
            recycleBinIds.has(id) ||
            (tid && recycleBinIds.has(tid)); // FIX: Trust local recycle bin too

          if (isExplicitlyDeleted) {
            // FIX: Preserve files even if they are deleted on chain, so they appear in Hidden Files
            return true;
          }

          // It's missing BUT NOT deleted. Preserve it!
          return true;
        });

        mergePendingAndConfirmedFiles(
          latestVersions,
          [...currentPending], // currentPending is PendingFile[], merge expects PendingFile[]
        );

        // mergePendingAndConfirmedFiles returns FileItems. We need to add our preservedConfirmed items to this list.
        // We should add them to the START or END?
        // mergePendingAndConfirmedFiles handles folders/files sort.
        // Ideally we just concat and let dedupe handle it?
        // But proper way is to add preservedConfirmed to the "confirmed" part of the merge?
        // Actually, we can just append them to the final result of merge, but wait:
        // mergePendingAndConfirmedFiles takes (confirmedFiles, pendingFiles).
        // latestVersions IS the new confirmed files list.
        // We should add preservedConfirmed to latestVersions strictly speaking.

        // Let's refine:
        const safeLatestVersions = [...latestVersions, ...preservedConfirmed];

        // Re-run merge with safe list
        const safeMergedFiles = mergePendingAndConfirmedFiles(
          safeLatestVersions,
          currentPending,
        );

        const pinnedIds = new Set(
          getPinnedFiles(username, activePasswordSlot || undefined),
        );
        // recycleBinIds already declared above
        const bookmarkIds = new Set(
          getBookmarkFiles(username, activePasswordSlot || undefined),
        );
        const fileTags = getFileTags(username, activePasswordSlot || undefined);

        const applyLocalState = (fileList: FileItem[]) => {
          return fileList.map((f) => {
            const fid = f.id;
            const tid = f.turboDataItemId;

            const newF: FileItem = { ...f };

            // Apply tags - prioritize chain data over local storage
            // Chain colorTag is already set in newF from blockchain
            // Only apply local tag if chain tag is not set (for unsynced changes)
            const localTag = fileTags[fid] || (tid ? fileTags[tid] : null);
            if (!newF.colorTag && localTag) {
              newF.colorTag = localTag;
            } else if (
              newF.colorTag &&
              localTag &&
              newF.colorTag !== localTag
            ) {
              // Chain has different value than local - sync local to chain
              // This handles cases where chain was updated from another device
              const tagsToSync: Record<string, string> = {
                [fid]: newF.colorTag,
              };
              if (tid) tagsToSync[tid] = newF.colorTag;
              saveFileTags(
                username,
                tagsToSync,
                activePasswordSlot || undefined,
              );
            }

            // Apply pin - prioritize chain data over local storage
            // Chain isPinned is already set in newF from blockchain
            const localPinned =
              pinnedIds.has(fid) || (tid && pinnedIds.has(tid));

            if (newF.isPinned === undefined || newF.isPinned === null) {
              // Chain doesn't have pin info, use local
              if (localPinned) {
                newF.isPinned = true;
              }
            } else if (newF.isPinned !== localPinned) {
              // Chain and local differ - sync local to chain
              if (newF.isPinned) {
                const idsToSave = [fid];
                if (tid) idsToSave.push(tid);
                savePinnedFiles(
                  username,
                  idsToSave,
                  activePasswordSlot || undefined,
                );
              } else {
                removePinnedFile(
                  username,
                  fid,
                  activePasswordSlot || undefined,
                );
                if (tid)
                  removePinnedFile(
                    username,
                    tid,
                    activePasswordSlot || undefined,
                  );
              }
            }

            // Fix: Check both local recycle bin AND chain deletions
            if (
              recycleBinIds.has(fid) ||
              (tid && recycleBinIds.has(tid)) ||
              deletedItemIds.has(fid) ||
              (tid && deletedItemIds.has(tid))
            ) {
              newF.isDeleted = true;
              if (!newF.deletedAt) newF.deletedAt = formatISO(new Date());
            }

            // Apply bookmark - prioritize chain data over local storage
            // Chain isBookmarked is already set in newF from blockchain
            const localBookmarked =
              bookmarkIds.has(fid) || (tid && bookmarkIds.has(tid));

            if (newF.isBookmarked === undefined || newF.isBookmarked === null) {
              // Chain doesn't have bookmark info, use local
              if (localBookmarked) {
                newF.isBookmarked = true;
              }
            } else if (newF.isBookmarked !== localBookmarked) {
              // Chain and local differ - sync local to chain
              if (newF.isBookmarked) {
                const idsToSave = [fid];
                if (tid) idsToSave.push(tid);
                saveBookmarkFiles(
                  username,
                  idsToSave,
                  activePasswordSlot || undefined,
                );
              } else {
                removeBookmarkFile(
                  username,
                  fid,
                  activePasswordSlot || undefined,
                );
                if (tid)
                  removeBookmarkFile(
                    username,
                    tid,
                    activePasswordSlot || undefined,
                  );
              }
            }

            return newF;
          });
        };

        const finalFiles = applyLocalState([
          ...preservedPending,
          ...safeMergedFiles,
        ]);

        setFiles((prev) => {
          // preserve content from previous state to avoid "Loading..." loops or content loss
          const contentMap = new Map<
            string,
            { content: string; size: string }
          >();
          const nameMap = new Map<string, string>();

          prev.forEach((p) => {
            if (p.content) {
              contentMap.set(p.id, { content: p.content, size: p.size || "" });
            }
            // Preserve real name if we have it, to avoid flickering "Encrypted File"
            // CRITICAL: Only preserve VALID names, never placeholders.
            if (
              p.name &&
              p.name !== "🔒 Encrypted File" &&
              p.name !== "Encrypted File" &&
              p.name !== "Untitled"
            ) {
              nameMap.set(p.id, p.name);
            }
          });

          // Advanced de-duplication: prioritize confirmed files but merge pending properties if needed
          // Deduping Logic - SIMPLIFIED & FIXED
          // We rely on stable IDs. We do NOT merge named files into "Untitled" files anymore.

          const uniqueMap = new Map<string, FileItem>();

          finalFiles.forEach((f) => {
            // Restore content if available in previous state
            if (contentMap.has(f.id)) {
              const preserved = contentMap.get(f.id);
              if (preserved) {
                f.content = preserved.content;
                f.size = preserved.size;
              }
            }

            // Restore Name if we are about to overwrite it with "Encrypted File" variants
            if (
              (f.name === "🔒 Encrypted File" ||
                f.name === "Encrypted File" ||
                !f.name) &&
              nameMap.has(f.id)
            ) {
              f.name = nameMap.get(f.id)!;
            }

            // If we already have this ID, we generally keep the existing one (first one wins),
            // OR we could prioritize based on status.
            // In our flow, `finalFiles` is [pending..., confirmed...]
            // We usually want Pending to override Confirmed if they share an ID (update scenario).
            // BUT, `applyLocalState` already merged them safely.

            // Let's just safeguard against duplicate IDs in the final list.
            if (!uniqueMap.has(f.id)) {
              uniqueMap.set(f.id, f);
            }
          });

          return Array.from(uniqueMap.values());
        });

        if (activePasswordSlot) {
          saveFilesToCache(username, activePasswordSlot, latestVersions);
        }

        cleanupConfirmedPendingFiles(
          username,
          newConfirmedIds,
          activePasswordSlot || undefined,
        );
      } catch (error) {
        console.error("Failed to sync files:", error);
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [
      username,
      isAuthenticated,
      userPassword,
      decryptionKey,
      activePasswordSlot, // Critical dependency
    ],
  );

  const processUploadQueue = useCallback(async () => {
    if (!username || !isAuthenticated || isProcessingQueueRef.current) {
      return;
    }

    // Strict Session Check for Uploads
    if (
      decryptionKey &&
      decryptionKey.signature !==
        generateSessionSignature(username, activePasswordSlot)
    ) {
      console.warn("Skipping upload queue processing: Session mismatch");
      return;
    }

    const currentQueue = uploadQueue;
    if (currentQueue.length === 0) return;

    isProcessingQueueRef.current = true;

    try {
      const sortedQueue = sortUploadQueue(currentQueue);
      const readyItems = getReadyQueueItems(sortedQueue, parentIdMapping);

      for (const queueItem of readyItems) {
        const { item, dependsOn } = queueItem;

        const resolvedParentIdRaw = dependsOn
          ? (resolveParentId(dependsOn, parentIdMapping) ??
            parentIdMapping[dependsOn] ??
            dependsOn)
          : null;

        if (
          dependsOn &&
          dependsOn.startsWith("temp_") &&
          !parentIdMapping[dependsOn]
        ) {
          // If the parent is still a temp ID and we don't have a mapping yet,
          // check if headers/metadata have been uploaded for it.
          // If the parent is not in files list as a 'confirmed' or 'pending' item with real ID, we wait.
          const parentFile = filesRef.current.find((f) => f.id === dependsOn);
          if (
            parentFile &&
            (parentFile.status === "uploading" ||
              parentFile.status === "queued")
          ) {
            continue;
          }
        }

        const resolvedParentId = resolvedParentIdRaw;

        const password = userPassword;
        if (!password) continue;

        try {
          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          if (item.type === "folder") {
            const folderPath = resolvedParentId
              ? `${getFolderPath(resolvedParentId, filesRef.current)}/${item.name}`
              : item.name;

            const folderMetadata = createFolderMetadata(
              item.id,
              item.name,
              resolvedParentId,
              username,
            );
            folderMetadata.folderPath = folderPath;

            const result = await uploadFolderMetadata({
              folderMetadata,
              encryptionKey,
              username,
              isUpdate: false,
            });

            updateParentMapping(item.id, result.dataItemId);
            updateAuxiliaryIds(
              username,
              item.id,
              result.dataItemId,
              activePasswordSlot || undefined,
            );

            if (selectedFileId === item.id) {
              setSelectedFileId(result.dataItemId);
            }

            const updatedFolder: FileItem = {
              ...item,
              id: result.dataItemId,
              turboDataItemId: result.dataItemId,
              parentId: resolvedParentId,
              status: "pending-confirmation",
              isUploading: false,
              uploadProgress: 100,
              confirmationProgress: 0,
              confirmationStartedAt: getTime(new Date()),
              estimatedConfirmationTime: "4-10 minutes",
              fileVersion: result.fileVersion,
              parentFileId: result.parentFileId,
              folderMetadata,
            };

            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? updatedFolder : f)),
            );
            removePendingFile(
              username,
              item.id,
              activePasswordSlot || undefined,
            ); // Fix: Remove temp file from pending
            savePendingFile(
              username,
              updatedFolder,
              activePasswordSlot || undefined,
            );
          } else {
            const result = await uploadEncryptedFile({
              content: item.content || "",
              encryptionKey,
              username,
              fileName: item.name,
              fileType: "text/plain",
              isUpdate: false,
              parentFolderId: resolvedParentId || undefined,
            });

            if (selectedFileId === item.id) {
              setSelectedFileId(result.dataItemId);
            }

            const updatedFile: FileItem = {
              ...item,
              id: result.dataItemId,
              turboDataItemId: result.dataItemId,
              parentId: resolvedParentId,
              status: "pending-confirmation",
              isUploading: false,
              uploadProgress: 100,
              confirmationProgress: 0,
              confirmationStartedAt: getTime(new Date()),
              estimatedConfirmationTime: "4-10 minutes",
              fileVersion: result.fileVersion,
              parentFileId: result.parentFileId,
            };

            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? updatedFile : f)),
            );
            removePendingFile(
              username,
              item.id,
              activePasswordSlot || undefined,
            ); // Fix: Remove temp file from pending
            savePendingFile(
              username,
              updatedFile,
              activePasswordSlot || undefined,
            );
            updateAuxiliaryIds(
              username,
              item.id,
              result.dataItemId,
              activePasswordSlot || undefined,
            );
          }

          setUploadQueue((prev) => {
            const next = prev.filter((q) => q.item.id !== item.id);
            saveUploadQueue(username, next, activePasswordSlot || undefined);
            return next;
          });
        } catch (error) {
          let errorMessage = "Upload failed";
          if (error instanceof FileSizeExceededError) {
            errorMessage = "File too large. Maximum size is 5MB for MVP.";
          } else if (error instanceof FolderSizeExceededError) {
            errorMessage = "Folder metadata too large.";
          } else if (error instanceof UploadError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: "failed",
                    isUploading: false,
                    uploadError: errorMessage,
                  }
                : f,
            ),
          );

          setUploadQueue((prev) =>
            prev.map((q) =>
              q.item.id === item.id
                ? { ...q, retryCount: q.retryCount + 1 }
                : q,
            ),
          );
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [
    username,
    isAuthenticated,
    uploadQueue,
    parentIdMapping,
    userPassword,
    updateParentMapping,
    selectedFileId,
  ]);

  // Force re-process queue when dependency resolves (Fix Issue 4)
  useEffect(() => {
    if (Object.keys(parentIdMapping).length > 0 && uploadQueue.length > 0) {
      if (!isProcessingQueueRef.current) {
        processUploadQueue();
      }
    }
  }, [parentIdMapping, uploadQueue, processUploadQueue]);

  // Consolidated Initialization Effect
  useEffect(() => {
    if (!username || !isAuthenticated) return;

    // Security Check: On session restore, ensure we verify password before exposing data
    if (needsPasswordVerification) {
      console.log(
        "Session restored, clearing cache for security until verified",
      );
      // Clear cache to prevent showing stale decrypted filenames
      localStorage.removeItem(`${STORAGE_KEYS.FILES_CACHE}_${username}`);
      setFiles([]);
      // Mark as handled so we can proceed to load/sync on next render
      clearPasswordVerification();
      return;
    }

    // Load persisted data first

    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed) {
      setIsSidebarCollapsed(savedCollapsed === "true");
    }

    clearExpiredPendingFiles(
      username,
      undefined,
      activePasswordSlot || undefined,
    );

    const cachedFiles = activePasswordSlot
      ? loadFilesFromCache(username, activePasswordSlot)
      : [];
    const loadedPendingFiles = getPendingFiles(
      username,
      activePasswordSlot || undefined,
    );
    const loadedQueue = getUploadQueue(
      username,
      activePasswordSlot || undefined,
    );
    const loadedMapping = getParentIdMapping(
      username,
      activePasswordSlot || undefined,
    );

    setUploadQueue(loadedQueue);
    setParentIdMapping(loadedMapping);

    if (Array.isArray(cachedFiles) && cachedFiles.length > 0) {
      try {
        const latestVersions = getLatestFileVersions(cachedFiles);
        const merged = mergePendingAndConfirmedFiles(
          latestVersions,
          loadedPendingFiles,
        );

        const pinnedIds = new Set(
          getPinnedFiles(username, activePasswordSlot || undefined),
        );
        const recycleBinIds = new Set(
          getRecycleBinIds(username, activePasswordSlot || undefined),
        );
        const bookmarkIds = new Set(
          getBookmarkFiles(username, activePasswordSlot || undefined),
        );
        const fileTags = getFileTags(username, activePasswordSlot || undefined);

        const mergedWithLocalState = merged.map((f) => {
          const newF: FileItem = { ...f };
          const fid = f.id;
          const tid = f.turboDataItemId;

          // Apply tags
          const tag = fileTags[fid] || (tid ? fileTags[tid] : null);
          if (tag) {
            newF.colorTag = tag;
          }

          if (pinnedIds.has(fid) || (tid && pinnedIds.has(tid))) {
            newF.isPinned = true;
          }

          if (recycleBinIds.has(fid) || (tid && recycleBinIds.has(tid))) {
            newF.isDeleted = true;
            if (!newF.deletedAt)
              newF.deletedAt = format(new Date(), "M/d/yyyy, h:mm:ss a");
          }

          if (bookmarkIds.has(fid) || (tid && bookmarkIds.has(tid))) {
            newF.isBookmarked = true;
          }

          // Fix Issue 4: Force status update if found on chain
          if (f.status === "pending-confirmation" && f.turboDataItemId) {
            // Check if actually confirmed on Arweave by presence in fetched list with same ID
            const onChainFile = latestVersions.find(
              (lv) =>
                lv.turboDataItemId === f.turboDataItemId ||
                lv.id === f.turboDataItemId,
            );
            if (onChainFile && onChainFile.status === "confirmed") {
              newF.status = "confirmed";
              // Cleanup pending entry
              cleanupConfirmedPendingFiles(username, [f.id]);
            }
          }

          return newF;
        });

        // Fix: Preserve content from existing state when syncing
        setFiles((prevFiles) => {
          const prevMap = new Map(prevFiles.map((p) => [p.id, p]));

          const finalFiles = mergedWithLocalState.map((newFile) => {
            const prevFile = prevMap.get(newFile.id);
            // Preserve decrypted content if we have it locally
            if (prevFile?.content && !newFile.content) {
              return { ...newFile, content: prevFile.content };
            }
            return newFile;
          });

          // Decoy Safeguard: Filter out any items that clearly shouldn't be here (load from cache check)
          // If we had a name from another slot, it would be "🔒 Encrypted File" in the current slot
          // after decryption fails. But cached items might have old names.
          // However, since we now use slot-specific cache keys, this should be fine.
          return finalFiles;
        });
      } catch (e) {
        console.error("Failed to load cached files", e);
      }
    }

    // Single Trigger for Sync
    if (!hasSyncedRef.current) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncFiles();
        hasSyncedRef.current = true;
      }, 500);
    }
  }, [
    username,
    isAuthenticated,
    needsPasswordVerification,
    clearPasswordVerification,
    activePasswordSlot,
  ]);

  useEffect(() => {
    if (uploadQueue.length > 0 && username && !isProcessingQueueRef.current) {
      const timer = setTimeout(() => {
        processUploadQueue();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [uploadQueue, username, processUploadQueue]); // Fix Issue 4: Depend on uploadQueue object to trigger updates

  // Restore password from session storage on mount/username change
  useEffect(() => {
    if (username) {
      const savedPassword = sessionStorage.getItem(
        `decoy_vault_password_${username}`,
      );
      if (savedPassword) {
        setUserPassword(savedPassword);
      }
    }
  }, [username]);

  // Save password to session storage when it changes
  useEffect(() => {
    if (username && userPassword) {
      sessionStorage.setItem(`decoy_vault_password_${username}`, userPassword);
    } else if (username) {
      sessionStorage.removeItem(`decoy_vault_password_${username}`);
    }
  }, [username, userPassword]);

  useEffect(() => {
    if (!username) {
      setFiles([]);
      setUserPassword("");
      setVerifiedFileIds(new Set());
      setSelectedFileIds(new Set());
      hasSyncedRef.current = false;

      // Fix Issue 3B: Clear session storage on logout to prevent active password leak
      // We need to clear it for the username we just logged out of, but username is already null here.
      // So we should iterate or clear current session key if possible.
      // Actually, better to check if session exists and clear it.
      // Since we don't know the old username here, we rely on the component using the key derived from username.
      // But we can clear ALL decoy keys just to be safe or rely on the fact that next login will check properly.
      // Better approach: In the component's cleanup or prior to setting username=null.
      // BUT `username` is from context.
      // Let's iterate all storage keys? No, too aggressive.
      // We will clear it in a separate effect that runs when username changes FROM value TO null?
      // Actually, just clearing current session storage when `username` is null is meaningless as we can't construct key.

      // ALTERNATIVE FIX: When mounting/changing username, only load if we don't have a conflict?
      // No, the issue is that `username` changes to same username but different password (logout -> login).
      // If we logout, we should ideally clear the session.
      // Let's add a specific logout handler or modify the useEffect that loads it.
    }
  }, [username]);

  // Fix 3B part 2: Proper session cleanup
  useEffect(() => {
    if (!username) {
      // Clear all decoy passwords from session storage
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("decoy_vault_password_")) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [username]);

  useEffect(() => {
    if (!username || !isAuthenticated) return;

    const hasPending = files.some((f) => f.status === "pending-confirmation");
    const intervalTime = hasPending ? 10000 : POLLING_INTERVAL_MS;

    // Trigger immediate sync to update UI with decrypted names if password just arrived
    syncFiles(false);

    const interval = setInterval(() => {
      syncFiles(false);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [username, isAuthenticated, syncFiles, userPassword]);

  const getFileLocation = useCallback((fileId: string): string => {
    const file = filesRef.current.find((f) => f.id === fileId);
    if (!file) return "Documents";

    const pathParts: string[] = ["Documents"];
    let currentId = file.parentId;

    while (currentId) {
      const parent = filesRef.current.find((f) => f.id === currentId);
      if (parent) {
        pathParts.splice(1, 0, parent.name);
        currentId = parent.parentId;
      } else {
        break;
      }
    }

    return pathParts.join(" / ");
  }, []);

  const stats = useMemo((): VaultStats => {
    const activeFiles = files.filter((f) => !f.deletedAt && !f.isDeleted);
    const pendingCount = activeFiles.filter(
      (f) => f.status === "pending-confirmation" || f.status === "uploading",
    ).length;
    const confirmedCount = activeFiles.filter(
      (f) => f.status === "confirmed",
    ).length;
    const queuedCount = activeFiles.filter((f) => f.status === "queued").length;

    return {
      totalDocuments: activeFiles.filter((f) => f.type === "file").length,
      totalBookmarks: activeFiles.filter((f) => f.isBookmarked).length,
      totalLockedFiles: activeFiles.filter(
        (f) => f.type === "file" && f.isLocked,
      ).length,
      totalLockedFolders: activeFiles.filter(
        (f) => f.type === "folder" && f.isLocked,
      ).length,
      totalMappings: activeFiles.filter((f) => f.isMapping).length,
      totalPending: pendingCount,
      totalConfirmed: confirmedCount,
      totalFoldersOnChain: countFoldersOnChain(activeFiles),
      totalQueued: queuedCount,
    };
  }, [files]);

  const breadcrumbs = useMemo(() => {
    if (currentView === "TRASH") return [{ id: null, name: "Hidden Files" }];
    if (currentView === "BOOKMARKS") return [{ id: null, name: "Bookmarks" }];

    const crumbs: BreadcrumbItem[] = [{ id: null, name: "Documents" }];
    let currentId = currentFolderId;
    const path: BreadcrumbItem[] = [];

    while (currentId) {
      const folder = files.find((f) => f.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return [...crumbs, ...path];
  }, [currentFolderId, files, currentView]);

  const getFileSubType = useCallback((file: FileItem): number => {
    let score = file.type === "folder" ? 100 : 0;
    if (file.isBookmarked) score += 40;
    else if (file.colorTag) score += 30;
    else if (file.isLocked) score += 20;
    else score += 10;
    return score;
  }, []);

  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.key) {
        case "name": {
          const valA = a.name.toLowerCase();
          const valB = b.name.toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        }
        case "dateModified": {
          const valA = new Date(a.dateModified).getTime();
          const valB = new Date(b.dateModified).getTime();
          comparison = valA - valB;
          break;
        }
        case "dateCreated": {
          const valA = new Date(a.dateCreated).getTime();
          const valB = new Date(b.dateCreated).getTime();
          comparison = valA - valB;
          break;
        }
        case "size": {
          const valA = a.size === "-" ? 0 : parseInt(a.size);
          const valB = b.size === "-" ? 0 : parseInt(b.size);
          comparison = valA - valB;
          break;
        }
        case "type": {
          const valA = getFileSubType(a);
          const valB = getFileSubType(b);
          comparison = valB - valA;
          break;
        }
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [files, sortConfig, getFileSubType]);

  const setView = useCallback(
    async (view: ViewState) => {
      if (view === "TRASH" && !isHiddenFilesVerified && username) {
        try {
          await requestPassword(
            "decrypt",
            "Access Hidden Files",
            "Enter your password to access the Hidden Files section.",
            async (p) => {
              try {
                const registryNode =
                  await import("@/lib/arweave/download").then((m) =>
                    m.queryUserByUsername(username),
                  );
                if (registryNode) {
                  const reg = await downloadUserRegistry(registryNode.id);
                  // FIX: Use active password slot instead of hardcoded primary
                  const encryptedPwd = getPasswordForSlot(
                    reg.passwords,
                    activePasswordSlot,
                  );
                  if (encryptedPwd) {
                    await decryptData(
                      encryptedPwd,
                      await deriveUserEncryptionKey(username, p),
                    );
                  }
                }
                return true;
              } catch {
                return false;
              }
            },
          );
          setIsHiddenFilesVerified(true);
          setViewState(view);
        } catch {
          return;
        }
      } else {
        setViewState(view);
      }
    },
    [username, isHiddenFilesVerified, requestPassword, activePasswordSlot],
  );

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setSelectedFileId(null);
      setSearchQuery("");
      setViewMode("BROWSER");
      if (currentView === "TRASH" || currentView === "BOOKMARKS") {
        setViewState("DOCUMENTS");
      }
    },
    [currentView],
  );

  const selectFile = useCallback((fileId: string | null) => {
    setSelectedFileId(fileId);
    setViewMode("BROWSER");
  }, []);

  const openFile = useCallback(
    async (fileId: string) => {
      const file = filesRef.current.find((f) => f.id === fileId);
      if (!file || !username) return;

      let isVerified = verifiedFileIds.has(fileId);

      // STRICT TIME LOCK CHECK: If lock has active expiry, DO NOT ALLOW UNLOCK even with password
      if (file.lockExpiry && !isVerified) {
        const unlockDate = format(
          parseISO(file.lockExpiry),
          "MMM d, yyyy, h:mm a",
        );
        alert(
          `This file is time-locked and cannot be opened until ${unlockDate}.`,
        );
        return;
      }

      if (!isVerified && file.isLocked) {
        try {
          await requestPassword(
            "decrypt",
            "Unlock File",
            "This file is locked. Please enter your password to unlock.",
            async (p) => {
              try {
                const registryNode =
                  await import("@/lib/arweave/download").then((m) =>
                    m.queryUserByUsername(username),
                  );
                if (registryNode) {
                  const reg = await downloadUserRegistry(registryNode.id);
                  // FIX: Use active password slot instead of hardcoded primary
                  const encryptedPwd = getPasswordForSlot(
                    reg.passwords,
                    activePasswordSlot,
                  );
                  if (encryptedPwd) {
                    await decryptData(
                      encryptedPwd,
                      await deriveUserEncryptionKey(username, p),
                    );
                  }
                }
                return true;
              } catch {
                return false;
              }
            },
          );
          setVerifiedFileIds((prev) => {
            const next = new Set(prev);
            next.add(fileId);
            return next;
          });
          isVerified = true;
        } catch {
          return;
        }
      }

      if (!isVerified && file.isLocked) {
        return;
      }

      setSelectedFileId(fileId);

      if (file.turboDataItemId) {
        try {
          const password = await requestPassword(
            "decrypt",
            "Decrypt File",
            "Enter your password to decrypt and open this file.",
            async (p) => {
              try {
                const registryNode =
                  await import("@/lib/arweave/download").then((m) =>
                    m.queryUserByUsername(username),
                  );
                if (registryNode) {
                  const reg = await downloadUserRegistry(registryNode.id);
                  // FIX: Use active password slot instead of hardcoded primary
                  const encryptedPwd = getPasswordForSlot(
                    reg.passwords,
                    activePasswordSlot,
                  );
                  if (encryptedPwd) {
                    await decryptData(
                      encryptedPwd,
                      await deriveUserEncryptionKey(username, p),
                    );
                  }
                }
                return true;
              } catch {
                return false;
              }
            },
            false,
          );

          // If we already have content, we just needed verification.
          if (file.content) {
            setViewMode("EDITOR");
            return;
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          const downloadPromise = downloadEncryptedFile(
            file.turboDataItemId,
            encryptionKey,
          );
          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Download timed out")), 15000),
          );

          const decryptedContent = await Promise.race([
            downloadPromise,
            timeoutPromise,
          ]);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    content: decryptedContent,
                    size: getStringSize(decryptedContent),
                    status: "confirmed",
                  }
                : f,
            ),
          );
          setViewMode("EDITOR");
        } catch (error) {
          const isCancellation =
            error instanceof Error &&
            error.message === "Password input cancelled";

          if (!isCancellation) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, status: "failed" } : f,
              ),
            );
            alert(
              "Failed to open file: " +
                (error instanceof Error ? error.message : "Unknown error"),
            );
          }
          setViewMode("BROWSER");
        } finally {
          // Do not clear verified IDs immediately, as we may need them for the current session
        }
      } else if (file.type !== "folder") {
        setViewMode("EDITOR");
        // Do not clear password or verified files here
      }
    },
    [
      username,
      userPassword,
      requestPassword,
      verifiedFileIds,
      activePasswordSlot,
    ],
  );

  const closeFile = useCallback(() => {
    if (selectedFileId) {
      // Do NOT remove from verified list on close.
      // We want to keep the file accessible for the session.
      // setVerifiedFileIds((prev) => { ... });
    }
    setViewMode("BROWSER");
  }, [selectedFileId]);

  const openFileFromAnywhere = useCallback(
    async (fileId: string) => {
      const targetFile = filesRef.current.find((f) => f.id === fileId);
      if (!targetFile) return;

      if (targetFile.deletedAt || targetFile.isDeleted) {
        await setView("TRASH");
      } else {
        setViewState("DOCUMENTS");
        setCurrentFolderId(targetFile.parentId);
      }
      await openFile(fileId);
    },
    [openFile, setView],
  );

  const addFile = useCallback(
    async (
      type: FileType,
      name?: string,
      content: string = "",
      parentIdOverride?: string | null,
    ): Promise<string | void> => {
      if (!username || !isAuthenticated) {
        alert("Please login first");
        return;
      }

      const currentFileCount = filesRef.current.filter(
        (f) => !f.isDeleted,
      ).length;
      if (currentFileCount >= 500) {
        alert("Account limit reached (500 files). Please upgrade to add more.");
        return;
      }

      let password = userPassword;

      if (!password) {
        try {
          password = await requestPassword(
            "encrypt",
            "Encrypt Item",
            "Enter your password to encrypt this item before uploading to Arweave.",
          );
        } catch {
          return;
        }
      }

      const parentId =
        parentIdOverride !== undefined ? parentIdOverride : currentFolderId;

      const parentFolder = parentId
        ? filesRef.current.find((f) => f.id === parentId)
        : null;

      if (
        parentFolder &&
        (parentFolder.status === "pending-confirmation" ||
          parentFolder.status === "uploading" ||
          parentFolder.status === "queued")
      ) {
        const newId = `temp_${Date.now()}`;
        const itemName =
          name || (type === "folder" ? "New Folder" : "Untitled");
        const now = formatISO(new Date());

        const newItem: FileItem = {
          id: newId,
          parentId,
          name: itemName,
          type,
          dateAccessed: now,
          dateCreated: now,
          dateModified: now,
          size: type === "folder" ? "-" : getStringSize(content),
          location: getFileLocation(newId),
          status: "queued",
          content: type === "file" ? content : undefined,
          isUploading: false,
          uploadProgress: 0,
          isLocked: false,
          isBookmarked: false,
          isPinned: false,
          owner: username,
          uploadTimestamp: Date.now(),
          fileVersion: 1,
          isLatestVersion: true,
          queuedReason: "Waiting for parent folder confirmation",
        };

        setFiles((prev) => [newItem, ...prev]);
        savePendingFile(username, newItem, activePasswordSlot || undefined);

        const queueItem: UploadQueueItem = {
          item: newItem,
          dependsOn: parentId,
          retryCount: 0,
          addedAt: Date.now(),
          priority: type === "folder" ? 2 : 4,
        };

        setUploadQueue((prev) => {
          const updated = [...prev, queueItem];
          saveUploadQueue(username, updated, activePasswordSlot || undefined);
          return updated;
        });

        selectFile(newItem.id);
        return newItem.id;
      }

      const newId = `temp_${Date.now()}`;
      const itemName = name || (type === "folder" ? "New Folder" : "Untitled");
      const now = formatISO(new Date());

      const newItem: FileItem = {
        id: newId,
        parentId,
        name: itemName,
        type,
        dateAccessed: now,
        dateCreated: now,
        dateModified: now,
        size: type === "folder" ? "-" : getStringSize(content),
        location: getFileLocation(newId),
        status: "uploading",
        content: type === "file" ? content : undefined,
        isUploading: true,
        uploadProgress: 0,
        isLocked: false,
        isBookmarked: false,
        isPinned: false,
        owner: username,
        uploadTimestamp: Date.now(),
        fileVersion: 1,
        isLatestVersion: true,
      };

      setFiles((prev) => [newItem, ...prev]);
      selectFile(newItem.id);
      savePendingFile(username, newItem, activePasswordSlot || undefined);

      if (type === "file") {
        try {
          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );
          const result = await uploadEncryptedFile({
            content,
            encryptionKey,
            username,
            fileName: itemName,
            fileType: "text/plain",
            isUpdate: false,
            parentFolderId: parentId || undefined,
          });

          const uploadedFile: FileItem = {
            ...newItem,
            id: result.dataItemId,
            turboDataItemId: result.dataItemId,
            status: "pending-confirmation",
            isUploading: false,
            uploadProgress: 100,
            confirmationProgress: 0,
            estimatedConfirmationTime: "4-10 minutes",
            fileVersion: result.fileVersion,
            parentFileId: result.parentFileId,
          };

          setFiles((prev) =>
            prev.map((f) => (f.id === newId ? uploadedFile : f)),
          );
          removePendingFile(username, newId, activePasswordSlot || undefined); // Fix Issue 1: Remove temp file from pending
          savePendingFile(
            username,
            uploadedFile,
            activePasswordSlot || undefined,
          );
          return result.dataItemId;
        } catch (error) {
          let errorMessage = "Upload failed";
          if (error instanceof FileSizeExceededError) {
            errorMessage = "File too large. Maximum size is 5MB for MVP.";
          } else if (error instanceof UploadError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === newId
                ? {
                    ...f,
                    status: "failed",
                    isUploading: false,
                    uploadError: errorMessage,
                  }
                : f,
            ),
          );
        }
      } else if (type === "folder") {
        try {
          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          const folderPath = currentFolderId
            ? `${getFolderPath(currentFolderId, filesRef.current)}/${itemName}`
            : itemName;

          const folderMetadata = createFolderMetadata(
            newId,
            itemName,
            currentFolderId,
            username,
          );
          folderMetadata.folderPath = folderPath;

          const result = await uploadFolderMetadata({
            folderMetadata,
            encryptionKey,
            username,
            isUpdate: false,
            isLocked: false,
            lockExpiry: undefined,
          });

          updateParentMapping(newId, result.dataItemId);

          const uploadedFolder: FileItem = {
            ...newItem,
            id: result.dataItemId,
            turboDataItemId: result.dataItemId,
            status: "pending-confirmation",
            isUploading: false,
            uploadProgress: 100,
            confirmationProgress: 0,
            estimatedConfirmationTime: "4-10 minutes",
            fileVersion: result.fileVersion,
            parentFileId: result.parentFileId,
            folderMetadata,
          };

          setFiles((prev) =>
            prev.map((f) => (f.id === newId ? uploadedFolder : f)),
          );
          removePendingFile(username, newId); // Fix Issue 1: Remove temp file from pending
          savePendingFile(username, uploadedFolder);
          return result.dataItemId;
        } catch (error) {
          let errorMessage = "Folder upload failed";
          if (error instanceof FolderSizeExceededError) {
            errorMessage = "Folder metadata too large.";
          } else if (error instanceof UploadError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === newId
                ? {
                    ...f,
                    status: "failed",
                    isUploading: false,
                    uploadError: errorMessage,
                  }
                : f,
            ),
          );
        }
      }
    },
    [
      username,
      isAuthenticated,
      userPassword,
      currentFolderId,
      getFileLocation,
      selectFile,
      updateParentMapping,
      requestPassword,
    ],
  );

  const updateFileContent = useCallback(
    async (id: string, content: string) => {
      if (!username || !isAuthenticated) return;

      const file = filesRef.current.find((f) => f.id === id);
      if (!file) return;

      let password = userPassword;
      if (!password) {
        try {
          password = await requestPassword(
            "update",
            "Update File",
            "Enter your password to encrypt and save the updated content.",
          );
        } catch {
          return;
        }
      }

      const originalFileId = file.parentFileId || file.id;
      const currentVersion = file.fileVersion || 1;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                content,
                dateModified: formatISO(new Date()),
                size: getStringSize(content),
                status: "uploading",
                isUploading: true,
              }
            : f,
        ),
      );

      try {
        const encryptionKey = await deriveUserEncryptionKey(username, password);
        const result = await uploadEncryptedFile({
          content,
          encryptionKey,
          username,
          fileName: file.name,
          fileType: "text/plain",
          isUpdate: true,
          originalFileId,
          currentVersion,
          isLocked: file.isLocked,
          lockExpiry: file.lockExpiry,
          parentFolderId: file.parentId || undefined,
        });

        const newVersionId = result.dataItemId;

        const updatedFile: FileItem = {
          ...file,
          id: newVersionId,
          turboDataItemId: newVersionId,
          fileVersion: result.fileVersion,
          parentFileId: originalFileId,
          previousVersionId: id,
          isLatestVersion: true,
          status: "pending-confirmation",
          isUploading: false,
          confirmationProgress: 0,
          estimatedConfirmationTime: "4-10 minutes",
          content,
          dateModified: formatISO(new Date()),
          size: getStringSize(content),
        };

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === id) return updatedFile;
            if (f.id === originalFileId || f.parentFileId === originalFileId) {
              return { ...f, isLatestVersion: false };
            }
            return f;
          }),
        );

        savePendingFile(username, updatedFile);
        setSelectedFileId(newVersionId);
      } catch (error) {
        let errorMessage = "Update failed";
        if (error instanceof FileSizeExceededError) {
          errorMessage = "File too large. Maximum size is 5MB for MVP.";
        } else if (error instanceof UploadError) {
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "failed",
                  isUploading: false,
                  uploadError: errorMessage,
                }
              : f,
          ),
        );
      }
    },
    [username, isAuthenticated, userPassword, requestPassword],
  );

  const deleteFile = useCallback(
    async (id: string) => {
      if (!username) return;

      saveRecycleBinIds(username, [id], activePasswordSlot || undefined);

      const file = filesRef.current.find((f) => f.id === id);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                isDeleted: true,
                deletedAt: formatISO(new Date()),
                status: file?.turboDataItemId
                  ? "pending-confirmation"
                  : "deleted",
                // Inform user about blockchain sync time
                confirmationStartedAt: file?.turboDataItemId
                  ? Date.now()
                  : f.confirmationStartedAt,
                estimatedConfirmationTime: file?.turboDataItemId
                  ? "4-10 minutes"
                  : f.estimatedConfirmationTime,
              }
            : f,
        ),
      );

      if (file && file.turboDataItemId) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              "Delete Item",
              "Enter your password to confirm this deletion on the blockchain.",
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );
          await markFileAsDeleted(
            {
              itemId: file.turboDataItemId,
              itemName: file.name,
              itemType: file.type,
              deletedAt: formatISO(new Date()),
              deletedBy: username,
              parentId: file.parentId,
              fileVersion: (file.fileVersion || 0) + 1,
              parentFileId: file.parentFileId,
            },
            encryptionKey,
            username,
          );
        } catch (error) {
          console.error("Failed to persist deletion state:", error);
          // Revert optimistic update on error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, isDeleted: false, status: "confirmed" } : f,
            ),
          );
          if (username)
            removeRecycleBinId(username, id, activePasswordSlot || undefined);
        }
      }

      if (selectedFileId === id) {
        setSelectedFileId(null);
        setViewMode("BROWSER");
      }
    },
    [username, userPassword, selectedFileId],
  );

  const restoreFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === id ? { ...f, deletedAt: undefined, isDeleted: false } : f,
        );
        if (username) removeRecycleBinId(username, id);
        return updated;
      });
    },
    [username],
  );

  const togglePin = useCallback(
    async (id: string) => {
      const file = filesRef.current.find((f) => f.id === id);
      if (!file || !username) return;

      const newIsPinned = !file.isPinned;

      // Optimistic UI update
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                isPinned: newIsPinned,
                status: file.turboDataItemId
                  ? "pending-confirmation"
                  : f.status,
                confirmationStartedAt: file.turboDataItemId
                  ? Date.now()
                  : f.confirmationStartedAt,
                // Inform user about blockchain sync time
                estimatedConfirmationTime: file.turboDataItemId
                  ? "4-10 minutes"
                  : f.estimatedConfirmationTime,
              }
            : f,
        ),
      );

      // Save to local storage
      if (newIsPinned) {
        const idsToSave = [id];
        if (file.turboDataItemId) idsToSave.push(file.turboDataItemId);
        savePinnedFiles(username, idsToSave, activePasswordSlot || undefined);
      } else {
        removePinnedFile(username, id, activePasswordSlot || undefined);
        if (file.turboDataItemId)
          removePinnedFile(
            username,
            file.turboDataItemId,
            activePasswordSlot || undefined,
          );
      }

      // Persist to blockchain if file is on-chain
      if (file.turboDataItemId) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              newIsPinned ? "Pin File" : "Unpin File",
              "Enter your password to confirm this action on the blockchain.",
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          await uploadMetadataUpdate({
            fileId: file.turboDataItemId,
            username,
            encryptionKey,
            changeType: "update",
            metadata: { "Is-Pinned": String(newIsPinned) },
            currentVersion: file.fileVersion || 1,
          });

          // Update status to confirmed after successful upload
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: "pending-confirmation" } : f,
            ),
          );
        } catch (error) {
          console.error("Failed to persist pin state:", error);
          // Revert on error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, isPinned: !newIsPinned, status: "confirmed" }
                : f,
            ),
          );
          // Also revert local storage
          if (newIsPinned) {
            removePinnedFile(username, id);
            if (file.turboDataItemId)
              removePinnedFile(username, file.turboDataItemId);
          } else {
            const idsToSave = [id];
            if (file.turboDataItemId) idsToSave.push(file.turboDataItemId);
            savePinnedFiles(username, idsToSave);
          }
        }
      }
    },
    [username, userPassword, requestPassword],
  );

  const emptyHiddenFiles = useCallback(() => {
    if (!username) return;

    const ok = confirm(
      "Clear the Hidden Files list? This only removes them from view on this device.",
    );
    if (!ok) return;

    localStorage.removeItem(`${STORAGE_KEYS.DELETED_IDS}_${username}`);
    setFiles((prev) => prev.filter((f) => !f.deletedAt && !f.isDeleted));
  }, [username]);

  const renameFile = useCallback(
    async (id: string, newName: string) => {
      if (!username || !isAuthenticated) return;

      const file = filesRef.current.find((f) => f.id === id);
      if (!file) return;

      const oldName = file.name;

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: newName } : f)),
      );

      let password = userPassword;
      if (!password) {
        try {
          password = await requestPassword(
            "update",
            "Rename Item",
            "Enter your password to update the item name on the blockchain.",
          );
        } catch {
          return;
        }
      }

      try {
        const encryptionKey = await deriveUserEncryptionKey(username, password);

        await uploadMetadataUpdate({
          fileId: file.turboDataItemId || file.id,
          username,
          encryptionKey,
          changeType: "rename",
          newName,
          oldName,
          currentVersion: file.fileVersion || 1,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "pending-confirmation" } : f,
          ),
        );
      } catch (error) {
        console.error("Rename failed:", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, name: oldName } : f)),
        );
      }
    },
    [username, isAuthenticated, userPassword, requestPassword],
  );

  const toggleSortKey = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({ ...prev, key }));
  }, []);

  const setSortDirection = useCallback((direction: SortDirection) => {
    setSortConfig((prev) => ({ ...prev, direction }));
  }, []);

  const toggleBookmark = useCallback(
    async (id: string) => {
      const file = filesRef.current.find((f) => f.id === id);
      if (!file || !username) return;

      const newIsBookmarked = !file.isBookmarked;

      // Optimistic UI update
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                isBookmarked: newIsBookmarked,
                status: file.turboDataItemId
                  ? "pending-confirmation"
                  : f.status,
                confirmationStartedAt: file.turboDataItemId
                  ? Date.now()
                  : f.confirmationStartedAt,
                // Inform user about blockchain sync time
                estimatedConfirmationTime: file.turboDataItemId
                  ? "4-10 minutes"
                  : f.estimatedConfirmationTime,
              }
            : f,
        ),
      );

      // Save to local storage
      if (newIsBookmarked) {
        const idsToSave = [id];
        if (file.turboDataItemId) idsToSave.push(file.turboDataItemId);
        saveBookmarkFiles(username, idsToSave, activePasswordSlot || undefined);
      } else {
        removeBookmarkFile(username, id, activePasswordSlot || undefined);
        if (file.turboDataItemId)
          removeBookmarkFile(
            username,
            file.turboDataItemId,
            activePasswordSlot || undefined,
          );
      }

      // Persist to blockchain if file is on-chain
      if (file.turboDataItemId) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              newIsBookmarked ? "Add Bookmark" : "Remove Bookmark",
              "Enter your password to confirm this action on the blockchain.",
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          await uploadMetadataUpdate({
            fileId: file.turboDataItemId,
            username,
            encryptionKey,
            changeType: "update",
            metadata: { "Is-Bookmarked": String(newIsBookmarked) },
            currentVersion: file.fileVersion || 1,
          });

          // Update status to confirmed after successful upload
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: "pending-confirmation" } : f,
            ),
          );
        } catch (error) {
          console.error("Failed to persist bookmark state:", error);
          // Revert on error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, isBookmarked: !newIsBookmarked, status: "confirmed" }
                : f,
            ),
          );
          // Also revert local storage
          if (newIsBookmarked) {
            removeBookmarkFile(username, id, activePasswordSlot || undefined);
            if (file.turboDataItemId)
              removeBookmarkFile(
                username,
                file.turboDataItemId,
                activePasswordSlot || undefined,
              );
          } else {
            const idsToSave = [id];
            if (file.turboDataItemId) idsToSave.push(file.turboDataItemId);
            saveBookmarkFiles(
              username,
              idsToSave,
              activePasswordSlot || undefined,
            );
          }
        }
      }
    },
    [username, userPassword, requestPassword],
  );

  const setFileTag = useCallback(
    async (id: string, color: string) => {
      const file = filesRef.current.find((f) => f.id === id);
      if (!file || !username) return;

      const oldColor = file.colorTag;

      // Optimistic UI update
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                colorTag: color,
                status: file.turboDataItemId
                  ? "pending-confirmation"
                  : f.status,
                confirmationStartedAt: file.turboDataItemId
                  ? Date.now()
                  : f.confirmationStartedAt,
                // Inform user about blockchain sync time
                estimatedConfirmationTime: file.turboDataItemId
                  ? "4-10 minutes"
                  : f.estimatedConfirmationTime,
              }
            : f,
        ),
      );

      // Save to local storage
      const tags: Record<string, string> = { [id]: color };
      if (file.turboDataItemId) tags[file.turboDataItemId] = color;
      saveFileTags(username, tags, activePasswordSlot || undefined);

      // Persist to blockchain if file is on-chain
      if (file.turboDataItemId) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              "Update Tag Color",
              "Enter your password to confirm this action on the blockchain.",
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          await uploadMetadataUpdate({
            fileId: file.turboDataItemId,
            username,
            encryptionKey,
            changeType: "update",
            metadata: { "Color-Tag": color || "" },
            currentVersion: file.fileVersion || 1,
          });

          // Update status after successful upload
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, status: "pending-confirmation" } : f,
            ),
          );
        } catch (error) {
          console.error("Failed to persist tag state:", error);
          // Revert on error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id
                ? { ...f, colorTag: oldColor, status: "confirmed" }
                : f,
            ),
          );
          // Also revert local storage
          const revertTags: Record<string, string> = { [id]: oldColor || "" };
          if (file.turboDataItemId)
            revertTags[file.turboDataItemId] = oldColor || "";
          saveFileTags(username, revertTags);
        }
      }
    },
    [username, userPassword, requestPassword],
  );

  const addFileNote = useCallback((id: string, note: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, note } : f)));
  }, []);

  const copyFile = useCallback((id: string) => {
    setClipboard({ fileId: id, action: "copy" });
  }, []);

  const cutFile = useCallback((id: string) => {
    setClipboard({ fileId: id, action: "cut" });
  }, []);

  const pasteFile = useCallback(() => {
    if (!clipboard) return;
    const sourceFile = filesRef.current.find((f) => f.id === clipboard.fileId);
    if (!sourceFile) return;

    if (clipboard.action === "copy") {
      const newId = Date.now().toString();
      const newFile: FileItem = {
        ...sourceFile,
        id: newId,
        parentId: currentFolderId,
        name: `${sourceFile.name} (Copy)`,
        dateCreated: formatISO(new Date()),
        dateModified: formatISO(new Date()),
        location: getFileLocation(newId),
        fileVersion: 1,
        parentFileId: undefined,
        previousVersionId: undefined,
        isLatestVersion: true,
      };
      setFiles((prev) => [newFile, ...prev]);
      setClipboard(null);
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === clipboard.fileId
          ? { ...f, parentId: currentFolderId, location: getFileLocation(f.id) }
          : f,
      ),
    );
    setClipboard(null);
  }, [clipboard, currentFolderId, getFileLocation]);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebar_collapsed", String(newState));
      return newState;
    });
  }, []);

  const selectMultipleFiles = useCallback((fileIds: string[]) => {
    setSelectedFileIds(new Set(fileIds));
  }, []);

  const toggleFileSelection = useCallback(
    (fileId: string, isCtrlKey: boolean) => {
      setSelectedFileIds((prev) => {
        if (!isCtrlKey) return new Set([fileId]);

        const next = new Set(prev);
        if (next.has(fileId)) next.delete(fileId);
        else next.add(fileId);
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const selectAllFiles = useCallback(() => {
    const targetFiles = sortedFiles.filter((f) => {
      if (currentView === "TRASH") return f.deletedAt || f.isDeleted;
      if (currentView === "BOOKMARKS") return f.isBookmarked;

      return f.parentId === currentFolderId && !f.deletedAt && !f.isDeleted;
    });

    setSelectedFileIds(new Set(targetFiles.map((f) => f.id)));
  }, [sortedFiles, currentView, currentFolderId]);

  const batchDelete = useCallback(
    async (fileIds: string[]) => {
      if (!username) return;

      // 1. Update Local State Immediately
      setFiles((prev) =>
        prev.map((f) =>
          fileIds.includes(f.id)
            ? {
                ...f,
                isDeleted: true,
                deletedAt: formatISO(new Date()),
                status: "deleted",
              }
            : f,
        ),
      );

      // 2. Persist to Recycle Bin (LocalStorage)
      saveRecycleBinIds(username, fileIds, activePasswordSlot || undefined);

      // 3. Clear Selection
      clearSelection();

      // 4. Async Chain Updates (Fire and forget, but handle errors silently)
      const password = userPassword;
      if (password) {
        try {
          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          const uploadPromises = fileIds.map(async (id) => {
            const file = filesRef.current.find((f) => f.id === id);
            if (file && file.turboDataItemId) {
              return markFileAsDeleted(
                {
                  itemId: file.turboDataItemId,
                  itemName: file.name,
                  itemType: file.type,
                  deletedAt: formatISO(new Date()),
                  deletedBy: username,
                  parentId: file.parentId,
                  fileVersion: (file.fileVersion || 0) + 1,
                  parentFileId: file.parentFileId,
                },
                encryptionKey,
                username,
              );
            }
          });

          Promise.allSettled(uploadPromises);
        } catch (e) {
          console.error("Batch delete chain update failed", e);
        }
      }
    },
    [username, userPassword, clearSelection],
  );

  const batchCopy = useCallback(
    (fileIds: string[]) => {
      if (fileIds.length === 1) copyFile(fileIds[0]);
    },
    [copyFile],
  );

  const batchCut = useCallback(
    (fileIds: string[]) => {
      if (fileIds.length === 1) cutFile(fileIds[0]);
    },
    [cutFile],
  );

  const batchToggleBookmark = useCallback(
    async (fileIds: string[]) => {
      if (!username) return;

      const firstFile = filesRef.current.find((f) => f.id === fileIds[0]);
      const shouldBookmark = firstFile ? !firstFile.isBookmarked : true;

      // Optimistic UI update
      setFiles((prev) => {
        return prev.map((f) =>
          fileIds.includes(f.id)
            ? {
                ...f,
                isBookmarked: shouldBookmark,
                status: f.turboDataItemId ? "pending-confirmation" : f.status,
              }
            : f,
        );
      });

      // Save to local storage
      const currentBookmarks = new Set(
        getBookmarkFiles(username, activePasswordSlot || undefined),
      );
      fileIds.forEach((id) => {
        const file = filesRef.current.find((f) => f.id === id);
        if (shouldBookmark) {
          currentBookmarks.add(id);
          if (file?.turboDataItemId) currentBookmarks.add(file.turboDataItemId);
        } else {
          currentBookmarks.delete(id);
          if (file?.turboDataItemId)
            currentBookmarks.delete(file.turboDataItemId);
        }
      });
      saveBookmarkFiles(
        username,
        Array.from(currentBookmarks),
        activePasswordSlot || undefined,
      );

      // Persist to blockchain for each on-chain file
      const onChainFiles = filesRef.current.filter(
        (f) => fileIds.includes(f.id) && f.turboDataItemId,
      );

      if (onChainFiles.length > 0) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              shouldBookmark ? "Bookmark Items" : "Remove Bookmarks",
              `Enter your password to confirm bookmarking ${onChainFiles.length} item(s) on the blockchain.`,
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          // Iterate and upload each update
          for (const file of onChainFiles) {
            uploadMetadataUpdate({
              fileId: file.turboDataItemId!,
              username,
              encryptionKey,
              changeType: "update",
              metadata: { "Is-Bookmarked": String(shouldBookmark) },
              currentVersion: file.fileVersion || 1,
            }).catch((err) =>
              console.error(`Failed to update bookmark for ${file.id}:`, err),
            );
          }
        } catch (error) {
          console.error("Failed to persist batch bookmark state:", error);
          // Revert optimistic update for on-chain files
          setFiles((prev) =>
            prev.map((f) =>
              fileIds.includes(f.id) && f.turboDataItemId
                ? { ...f, isBookmarked: !shouldBookmark, status: "confirmed" }
                : f,
            ),
          );
        }
      }

      clearSelection();
    },
    [username, userPassword, requestPassword, clearSelection],
  );

  const batchSetTag = useCallback(
    async (fileIds: string[], color: string) => {
      if (!username) return;

      // Optimistic UI update
      setFiles((prev) =>
        prev.map((f) =>
          fileIds.includes(f.id)
            ? {
                ...f,
                colorTag: color,
                status: f.turboDataItemId ? "pending-confirmation" : f.status,
              }
            : f,
        ),
      );

      // Save to local storage
      const currentTags = getFileTags(
        username,
        activePasswordSlot || undefined,
      );
      fileIds.forEach((id) => {
        const file = filesRef.current.find((f) => f.id === id);
        currentTags[id] = color;
        if (file && file.turboDataItemId) {
          currentTags[file.turboDataItemId] = color;
        }
      });
      saveFileTags(username, currentTags, activePasswordSlot || undefined);

      // Persist to blockchain for each on-chain file
      const onChainFiles = filesRef.current.filter(
        (f) => fileIds.includes(f.id) && f.turboDataItemId,
      );

      if (onChainFiles.length > 0) {
        try {
          let password = userPassword;
          if (!password) {
            password = await requestPassword(
              "update",
              "Update Batch Tags",
              `Enter your password to confirm tagging ${onChainFiles.length} item(s) on the blockchain.`,
            );
          }

          const encryptionKey = await deriveUserEncryptionKey(
            username,
            password,
          );

          // Iterate and upload each update
          for (const file of onChainFiles) {
            uploadMetadataUpdate({
              fileId: file.turboDataItemId!,
              username,
              encryptionKey,
              changeType: "update",
              metadata: { "Color-Tag": color || "" },
              currentVersion: file.fileVersion || 1,
            }).catch((err) =>
              console.error(`Failed to update tag for ${file.id}:`, err),
            );
          }
        } catch (error) {
          console.error("Failed to persist batch tag state:", error);
          // NOTE: Reverting batch operations correctly is complex.
          // For now, we rely on the manual refresh if it fails or individual error logs.
        }
      }

      clearSelection();
    },
    [username, userPassword, requestPassword, clearSelection],
  );

  return (
    <VaultContext.Provider
      value={{
        files: sortedFiles,
        currentFolderId,
        selectedFileId,
        selectedFileIds,
        currentView,
        viewMode,
        viewDisplayMode,
        sortConfig,
        searchQuery,
        breadcrumbs,
        clipboard,
        stats,
        isSidebarCollapsed,
        isLoading,
        isSyncing,
        uploadQueue,
        parentIdMapping,
        setSearchQuery,
        setViewDisplayMode,
        navigateToFolder,
        selectFile,
        selectMultipleFiles,
        toggleFileSelection,
        clearSelection,
        selectAllFiles,
        openFile,
        closeFile,
        addFile,
        deleteFile,
        batchDelete,
        batchCopy,
        batchCut,
        batchToggleBookmark,
        batchSetTag,
        restoreFile,
        emptyHiddenFiles,
        updateFileContent,
        renameFile,
        setView,
        openFileFromAnywhere,
        syncFiles,
        processUploadQueue,
        updateParentMapping,
        addBackupPassword,
        removeBackupPassword,
        toggleSortKey,
        setSortDirection,
        togglePin,
        toggleBookmark,
        setFileTag,
        addFileNote,
        copyFile,
        cutFile,
        pasteFile,
        toggleSidebarCollapse,
        verifiedFileIds,
        isHiddenFilesVerified,
        userPassword,
        decryptionKey,
        setVaultPassword: setUserPassword,
        requestPassword,
      }}
    >
      {children}
      <PasswordPromptModal request={passwordRequest} />
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
