export type FileType = "file" | "folder";

export type ViewType = "HOME" | "DOCUMENTS" | "BOOKMARKS" | "TRASH";

export type ViewDisplayMode =
  | "list"
  | "small-icons"
  | "medium-icons"
  | "large-icons"
  | "extra-large-icons";

export type ViewMode = "DETAILS" | "EDITOR";

export type SortKey = "name" | "dateModified" | "dateCreated" | "size" | "type";

export type SortDirection = "asc" | "desc";

export type FileStatus =
  | "idle"
  | "uploading"
  | "pending-confirmation"
  | "confirmed"
  | "failed"
  | "syncing"
  | "queued"
  | "deleted";

export type MetadataChangeType = "rename" | "delete" | "restore" | "update";

export type PasswordSlot = "primary" | "secondary" | "tertiary";

export type TextColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "purple"
  | "cyan"
  | "white"
  | "gray"
  | "light-red"
  | "light-green"
  | "light-yellow"
  | "light-blue"
  | "light-purple"
  | "light-cyan"
  | "light-gray";

export interface TextColorOption {
  name: string;
  hex: string;
  id: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FilePosition {
  fileId: string;
  element: HTMLElement;
  bounds: BoundingBox;
}

export interface SelectionState {
  selectedFileIds: Set<string>;
  isSelecting: boolean;
  selectionBox: SelectionBox | null;
  lastSelectedId: string | null;
  anchorId: string | null;
}

export interface MultiPasswordConfig {
  primary: EncryptedData;
  secondary?: EncryptedData;
  tertiary?: EncryptedData;
}

export interface PasswordSlotInfo {
  slot: PasswordSlot;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface FolderMetadata {
  folderId: string;
  folderName: string;
  parentId: string | null;
  children: string[];
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
  permissions?: Record<string, string>;
  description?: string;
  folderPath: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  content?: string;
  size: string;
  location: string;
  status: FileStatus;
  parentId: string | null;
  dateCreated: string;
  dateModified: string;
  dateAccessed: string;
  isLocked: boolean;
  lockExpiry?: string;
  lockUpdateTxId?: string; // Transaction ID of the lock metadata update
  isBookmarked: boolean;
  isPinned: boolean;
  deletedAt?: string;
  colorTag?: string;
  note?: string;
  encryptionKey?: string;
  turboDataItemId?: string;
  isMapping?: boolean;
  mappingData?: CharacterMap;
  encryptedContent?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
  owner?: string;
  confirmationProgress?: number;
  estimatedConfirmationTime?: string;
  confirmationStartedAt?: number;
  confirmationFinishedAt?: number;
  uploadRetryCount?: number;
  lastSyncAttempt?: string;
  uploadTimestamp?: number;
  fileVersion?: number;
  parentFileId?: string;
  previousVersionId?: string;
  isLatestVersion?: boolean;
  versionHistory?: string[];
  encryptedName?: string;
  folderMetadata?: FolderMetadata;
  isDeleted?: boolean;
  tempParentId?: string;
  queuedReason?: string;
}

export interface CharacterMap {
  [key: string]: string;
}

export interface MappingFile extends FileItem {
  isMapping: true;
  mappingData: CharacterMap;
  originalPassword?: string;
  decoyPassword?: string;
}

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export interface VaultStats {
  totalDocuments: number;
  totalBookmarks: number;
  totalLockedFiles: number;
  totalLockedFolders: number;
  totalMappings: number;
  totalPending: number;
  totalConfirmed: number;
  totalFoldersOnChain: number;
  totalQueued: number;
}

export interface ClipboardData {
  fileId: string;
  action: "copy" | "cut";
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

export interface TurboFileMetadata {
  dataItemId: string;
  fileName: string;
  fileType?: string;
  dataType?: "File-Data" | "Folder-Metadata";
  createdAt: string;
  walletAddress: string;
  owner?: string;
  isLocked?: boolean;
  lockExpiry?: string;
  isBookmarked?: boolean;
  isPinned?: boolean;
  colorTag?: string;
  note?: string;
  isMapping?: boolean;
  fileVersion?: number;
  parentFileId?: string;
  previousVersionId?: string;
  folderPath?: string;
  parentFolderId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  metadataChangeType?: MetadataChangeType;
  originalName?: string;
  encryptedName?: string;
  size?: string;
}

export interface TurboUploadResult {
  id: string;
  owner: string;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  deadlineHeight: number;
  timestamp: number;
  version: string;
  public: string;
  signature: string;
  winc: string;
  dataItemId?: string;
}

export interface TurboTag {
  name: string;
  value: string;
}

export interface TurboUploadOptions {
  tags?: TurboTag[];
  signal?: AbortSignal;
  isUpdate?: boolean;
  originalFileId?: string;
  currentVersion?: number;
}

export interface MetadataUpdateOptions {
  fileId: string;
  username: string;
  encryptionKey: string;
  changeType: MetadataChangeType;
  newName?: string;
  oldName?: string;
  currentVersion?: number;
  metadata?: Record<string, string>;
  isLocked?: boolean;
  lockExpiry?: string;
}

export interface DeletionMetadata {
  itemId: string;
  itemName: string;
  itemType: FileType;
  deletedAt: string;
  deletedBy: string;
  parentId: string | null;
  fileVersion: number;
  parentFileId?: string;
}

export interface TurboBalanceInfo {
  winc: string;
  ar?: string;
}

export interface JWKInterface {
  kty: string;
  e: string;
  n: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
}

export interface UserRegistry {
  username: string;
  passwords: MultiPasswordConfig;
  activeSlots: PasswordSlot[];
  createdAt: string;
  lastLogin: string;
  lastUsedSlot?: PasswordSlot;
}

export interface MasterWalletConfig {
  address: string;
  initialized: boolean;
}

export interface AuthCredentials {
  username: string;
  password: string;
  passwordSlot?: PasswordSlot;
}

export interface AuthSession {
  username: string;
  masterWalletAddress: string;
  expiresAt: string;
  activePasswordSlot: PasswordSlot;
}

export interface TurboContextType {
  username: string | null;
  masterWalletAddress: string | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isCheckingUser: boolean;
  isNetworkError: boolean;
  balance: TurboBalanceInfo | null;
  error: string | null;
  errorType: "auth" | "network" | "user-not-found" | "wallet" | "upload" | null;
  activePasswordSlot: PasswordSlot | null;
  passwordSlots: PasswordSlotInfo[];
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    passwords: { primary: string; secondary?: string; tertiary?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  retryLastAction: () => void;
  getUserEncryptionKey: (password: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  addBackupPassword: (
    currentPassword: string,
    newPassword: string,
    slot: PasswordSlot,
  ) => Promise<void>;
  removeBackupPassword: (
    currentPassword: string,
    slot: PasswordSlot,
  ) => Promise<void>;
  listPasswordSlots: () => Promise<PasswordSlotInfo[]>;
  needsPasswordVerification: boolean;
  clearPasswordVerification: () => void;
}

export interface VaultContextType {
  files: FileItem[];
  currentFolderId: string | null;
  selectedFileId: string | null;
  searchQuery: string;
  viewMode: ViewMode;
  viewDisplayMode: ViewDisplayMode;
  sortConfig: SortConfig;
  currentView: ViewType;
  clipboard: ClipboardData | null;
  stats: VaultStats;
  selectFile: (fileId: string) => void;
  openFile: (fileId: string) => void;
  closeFile: () => void;
  navigateToFolder: (folderId: string | null) => void;
  addFile: (
    type: FileType,
    name?: string,
    content?: string,
    parentId?: string | null,
  ) => Promise<void>;
  deleteFile: (fileId: string, permanent?: boolean) => Promise<void>;
  restoreFile: (fileId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  updateFileContent: (fileId: string, content: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSortKey: (key: SortKey) => void;
  setSortDirection: (direction: SortDirection) => void;
  setCurrentView: (view: ViewType) => void;
  setViewDisplayMode: (mode: ViewDisplayMode) => void;
  togglePin: (fileId: string) => void;
  toggleBookmark: (fileId: string) => void;
  setFileTag: (fileId: string, color: string) => void;
  toggleLock: (fileId: string, expiry?: string) => void;
  addFileNote: (fileId: string, note: string) => void;
  copyFile: (fileId: string) => void;
  cutFile: (fileId: string) => void;
  pasteFile: () => Promise<void>;
  batchDelete: (fileIds: string[]) => Promise<void>;
  batchCopy: (fileIds: string[]) => void;
  batchCut: (fileIds: string[]) => void;
  batchToggleBookmark: (fileIds: string[]) => void;
  batchSetTag: (fileIds: string[], color: string) => void;
  addBackupPassword: (
    newPassword: string,
    slot: Exclude<PasswordSlot, "primary">,
  ) => Promise<void>;
  removeBackupPassword: (
    slot: Exclude<PasswordSlot, "primary">,
  ) => Promise<void>;
}

export interface PendingFile {
  fileItem: FileItem;
  uploadTimestamp: number;
  retryCount: number;
}

export interface TransactionStatus {
  id: string;
  status: "pending" | "confirmed" | "failed";
  confirmationProgress: number;
  lastChecked: number;
}

export interface UploadQueueItem {
  item: FileItem;
  dependsOn: string | null;
  retryCount: number;
  addedAt: number;
  priority: number;
}

export interface ParentIdMapping {
  [tempId: string]: string;
}

export const MVP_FILE_SIZE_LIMIT = 5 * 1024 * 1024;
export const MVP_MAX_FILES_PER_SESSION = 500;
export const MVP_MAX_FILES_ACCOUNT = 500;
export const MVP_TOTAL_STORAGE_LIMIT = 50 * 1024 * 1024;
export const MVP_FOLDER_METADATA_SIZE_LIMIT = 100 * 1024;
export const MVP_METADATA_UPDATE_SIZE_LIMIT = 50 * 1024;
export const MAX_PASSWORD_SLOTS = 3;
export const MIN_ACTIVE_PASSWORDS = 1;

export function isFileItem(
  item: FileItem,
): item is FileItem & { type: "file" } {
  return item.type === "file";
}

export function isFolderItem(
  item: FileItem,
): item is FileItem & { type: "folder" } {
  return item.type === "folder";
}

export function isFolderMetadata(data: unknown): data is FolderMetadata {
  if (!data || typeof data !== "object") return false;
  const metadata = data as Record<string, unknown>;
  return (
    typeof metadata.folderId === "string" &&
    typeof metadata.folderName === "string" &&
    typeof metadata.createdBy === "string" &&
    Array.isArray(metadata.children)
  );
}

export function hasFolderMetadata(
  item: FileItem,
): item is FileItem & { folderMetadata: FolderMetadata } {
  return item.type === "folder" && item.folderMetadata !== undefined;
}

export function isDeletionMetadata(data: unknown): data is DeletionMetadata {
  if (!data || typeof data !== "object") return false;
  const metadata = data as Record<string, unknown>;
  return (
    typeof metadata.itemId === "string" &&
    typeof metadata.itemName === "string" &&
    typeof metadata.itemType === "string" &&
    typeof metadata.deletedAt === "string" &&
    typeof metadata.deletedBy === "string"
  );
}
