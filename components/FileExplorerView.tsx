"use client";

import { TAG_COLORS } from "@/lib/data";
import { getRelativeTimeFuture } from "@/lib/utils";
import React, { useState, useRef, useCallback } from "react";
import {
  FileText,
  Folder,
  Download,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
  Check,
  ArrowDown,
  Grid3x3,
  Upload,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  Clock,
  Move,
  Lock,
  Pin,
  Bookmark,
  StickyNote,
  Tag,
  List,
  GripVertical,
} from "lucide-react";
import SelectionOverlay from "./ui/SelectionOverlay";
import BatchOperationsBar from "./ui/BatchOperationsBar";
import { useArweave } from "@/context/ArweaveContext";
import { useFileSync } from "@/hooks/useFileSync";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useVault } from "@/context/VaultContext";
import { MenuItemType } from "@/lib/data";
import FileDetailsPanel from "./FileDetailsPanel";
import MarkdownEditor from "./MarkdownEditor";
import { MenuDropdown } from "./ui/MenuComponents";
import { getFileIcon, getViewIcon } from "@/lib/icons";
import FileStatusBadge from "./ui/FileStatusBadge";
import { downloadFileWithPassword } from "@/lib/arweave/download";

interface ErrorToastProps {
  id: string;
  message: string;
  onDismiss: (id: string) => void;
}

function ErrorToast({ id, message, onDismiss }: ErrorToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-red-950/90 border border-red-700 text-red-200 px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-lg flex items-start gap-2 md:gap-3 mb-2 max-w-xs md:max-w-md mx-4"
    >
      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-xs md:text-sm">{message}</div>
      <button
        onClick={() => onDismiss(id)}
        className="text-red-200 hover:text-red-50 transition-colors flex-shrink-0 touch-target tap-highlight-transparent"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

interface PasswordModalProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  error: string | null;
  title: string;
  message: string;
}

function PasswordModal({
  onSubmit,
  onCancel,
  isProcessing,
  error,
  title,
  message,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm md:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={18} className="text-blue-500 flex-shrink-0" />
          <h3 className="text-zinc-900 dark:text-zinc-50 font-bold text-sm md:text-base">
            {title}
          </h3>
        </div>

        <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {message}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="relative">
                <AlertCircle
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  spellCheck={false}
                  className="w-full pl-10 pr-12 py-2 md:py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  autoFocus
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-target tap-highlight-transparent"
                  disabled={isProcessing}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/20 border border-red-900/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={14}
                  className="text-red-500 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 px-3 md:px-4 py-2 text-xs md:text-sm disabled:opacity-50 touch-target tap-highlight-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-zinc-50 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-target touch-manipulation tap-highlight-transparent"
            >
              {isProcessing && <Loader2 size={14} className="animate-spin" />}
              {isProcessing ? "Processing..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FileExplorerView() {
  const {
    files,
    currentFolderId,
    selectedFileId,
    searchQuery,
    viewMode,
    viewDisplayMode,
    sortConfig,
    currentView,
    clipboard,
    selectFile,
    openFile,
    navigateToFolder,
    addFile,
    deleteFile,
    restoreFile,
    emptyHiddenFiles,
    toggleSortKey,
    setSortDirection,
    togglePin,
    toggleBookmark,
    setFileTag,
    addFileNote,
    setViewDisplayMode,
    batchDelete,
    batchToggleBookmark,
    batchSetTag,
    requestPassword,
    closeFile,
  } = useVault();

  const { username } = useArweave();
  const { manualSync } = useFileSync({
    username,
    isAuthenticated: !!username,
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    fileId?: string;
  } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{
    fileId: string;
    currentNote: string;
  } | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isDraggingOverBackground, setIsDraggingOverBackground] =
    useState(false);
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(
    new Map(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailPanelWidth, setDetailPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [showMobileToolbar, setShowMobileToolbar] = useState(false);
  const [showPasswordModalForDownload, setShowPasswordModalForDownload] =
    useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [isDownloadProcessing, setIsDownloadProcessing] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newBtnRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLDivElement>(null);
  const viewBtnRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const filesContainerRef = useRef<HTMLDivElement>(null);

  let visibleFiles = files;

  if (currentView === "TRASH") {
    visibleFiles = visibleFiles.filter((f) => f.deletedAt || f.isDeleted);
  } else if (currentView === "BOOKMARKS") {
    visibleFiles = visibleFiles.filter(
      (f) => !f.deletedAt && !f.isDeleted && f.isBookmarked,
    );
  } else {
    visibleFiles = visibleFiles.filter(
      (f) => !f.deletedAt && !f.isDeleted && f.parentId === currentFolderId,
    );
  }

  if (searchQuery) {
    if (currentView === "TRASH") {
      visibleFiles = files.filter(
        (f) =>
          (f.deletedAt || f.isDeleted) &&
          f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    } else {
      visibleFiles = files.filter(
        (f) =>
          !f.deletedAt &&
          !f.isDeleted &&
          f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
  }

  const {
    selectionState,
    isFileSelected,
    handleFileClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    selectAll,
    clearSelection,
  } = useMultiSelect({
    files: visibleFiles,
    disabled: currentView === "TRASH",
  });

  const activeFile = files.find(
    (f) =>
      f.id === selectedFileId ||
      (f.turboDataItemId && f.turboDataItemId === selectedFileId),
  );

  const currentFolder = currentFolderId
    ? files.find((f) => f.id === currentFolderId)
    : null;

  const canCreateInCurrentFolder =
    !currentFolder ||
    (currentFolder.status !== "pending-confirmation" &&
      currentFolder.status !== "uploading" &&
      currentFolder.status !== "queued");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await manualSync();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error("Refresh failed:", error);
      setIsRefreshing(false);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = detailPanelWidth;
  };

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = resizeStartX.current - e.clientX;
      const newWidth = Math.max(
        300,
        Math.min(800, resizeStartWidth.current + delta),
      );
      setDetailPanelWidth(newWidth);
    },
    [isResizing],
  );

  const handleResizeMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem("detailPanelWidth", detailPanelWidth.toString());
    }
  }, [isResizing, detailPanelWidth]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMouseMove);
      document.addEventListener("mouseup", handleResizeMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleResizeMouseMove);
        document.removeEventListener("mouseup", handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  React.useEffect(() => {
    const savedWidth = localStorage.getItem("detailPanelWidth");
    if (savedWidth) {
      setDetailPanelWidth(parseInt(savedWidth, 10));
    }
  }, []);

  React.useEffect(() => {
    const savedWidth = localStorage.getItem("detailPanelWidth");
    if (savedWidth) {
      setDetailPanelWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Removed auto-open useEffect to prevent re-opening on background sync updates.
  // Panel is now explicitly opened via user interaction (click).

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.stopPropagation();
    setDraggedFileId(fileId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", fileId);

    if (e.dataTransfer.setDragImage) {
      const dragImage = document.createElement("div");
      dragImage.className =
        "bg-zinc-200 dark:bg-zinc-700 px-3 py-2 rounded shadow-lg text-sm";
      dragImage.textContent = files.find((f) => f.id === fileId)?.name || "";
      dragImage.style.position = "absolute";
      dragImage.style.top = "-1000px";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, fileId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedFileId) return;

    if (fileId) {
      const file = files.find((f) => f.id === fileId);
      if (file?.type === "folder" && fileId !== draggedFileId) {
        const draggedFile = files.find((f) => f.id === draggedFileId);
        if (draggedFile && draggedFile.parentId !== fileId) {
          setDropTargetId(fileId);
          setIsDraggingOverBackground(false);
          e.dataTransfer.dropEffect = "move";
          return;
        }
      }
    }

    if (
      !fileId &&
      files.find((f) => f.id === draggedFileId)?.parentId !== currentFolderId
    ) {
      setDropTargetId(null);
      setIsDraggingOverBackground(true);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetId(null);
      setIsDraggingOverBackground(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedFileId) return;

    const draggedFile = files.find((f) => f.id === draggedFileId);
    if (!draggedFile) {
      setDraggedFileId(null);
      setDropTargetId(null);
      setIsDraggingOverBackground(false);
      return;
    }

    setDraggedFileId(null);
    setDropTargetId(null);
    setIsDraggingOverBackground(false);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDropTargetId(null);
    setIsDraggingOverBackground(false);
  };

  const handleContextMenu = (e: React.MouseEvent, fileId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
    if (fileId) selectFile(fileId);
  };

  const closeMenus = () => {
    setContextMenu(null);
    setActiveDropdown(null);
    setShowMobileToolbar(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const text = await file.text();
      await addFile("file", file.name, text);
    } else {
      const text = await file.text();
      await addFile("file", file.name, text);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    await requestPassword(
      "encrypt",
      "Encrypt Folder",
      "Enter your password to encrypt and upload this folder structure.",
    );

    const folderMap = new Map<string, string>();

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i] as File & { webkitRelativePath?: string };
      const path = file.webkitRelativePath;
      if (!path) continue;

      const segments = path.split("/");
      const fileName = segments.pop();
      let currentParentId = currentFolderId;

      let accumulatedPath = "";
      let skipFile = false;

      for (const folderName of segments) {
        accumulatedPath = accumulatedPath
          ? `${accumulatedPath}/${folderName}`
          : folderName;

        if (folderMap.has(accumulatedPath)) {
          currentParentId = folderMap.get(accumulatedPath) || null;
        } else {
          // Check if folder already exists in current location to avoid duplicates
          // We need to check in the current resolved parent location
          const existingFolder = files.find(
            (f) =>
              f.parentId === currentParentId &&
              f.name === folderName &&
              f.type === "folder" &&
              !f.isDeleted,
          );

          if (existingFolder) {
            currentParentId = existingFolder.id;
            folderMap.set(accumulatedPath, currentParentId);
          } else {
            const newFolderId = (await addFile(
              "folder",
              folderName,
              "",
              currentParentId,
            )) as string;

            if (newFolderId) {
              folderMap.set(accumulatedPath, newFolderId);
              currentParentId = newFolderId;
            } else {
              console.error(
                `Failed to create folder ${folderName}, skipping file ${fileName}`,
              );
              skipFile = true;
              break;
            }
          }
        }
      }

      if (skipFile) continue;

      const text = await file.text();
      await addFile("file", fileName, text, currentParentId);
    }
  };

  const handleAddNote = (fileId: string, currentNote?: string) => {
    setShowNotesModal({ fileId, currentNote: currentNote || "" });
    setNotesInput(currentNote || "");
  };

  const handleSaveNote = () => {
    if (!showNotesModal) return;
    addFileNote(showNotesModal.fileId, notesInput);
    setShowNotesModal(null);
    setNotesInput("");
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await deleteFile(fileId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to hide file";
      setUploadErrors((prev) => new Map(prev).set(fileId, errorMessage));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDismissError = (id: string) => {
    setUploadErrors((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    const selectedIds = Array.from(selectionState.selectedFileIds);
    await batchDelete(selectedIds);
  };

  const handleBatchTag = () => {
    setShowTagPicker(true);
  };

  const handleBatchTagSelect = (color: string) => {
    // Ensure we are using the latest selection state
    const selectedIds = Array.from(selectionState.selectedFileIds);
    if (selectedIds.length === 0) return; // Should not happen if modal is open

    batchSetTag(selectedIds, color);
    setShowTagPicker(false);
  };

  const handleBatchBookmark = () => {
    const selectedIds = Array.from(selectionState.selectedFileIds);
    batchToggleBookmark(selectedIds);
  };

  const handleDownloadFile = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file || !username) return;

    if (!file.turboDataItemId && !file.content) {
      const errorMessage =
        "File not yet uploaded to Arweave or has no content.";
      setUploadErrors((prev) => new Map(prev).set(file.id, errorMessage));
      return;
    }

    if (file.turboDataItemId) {
      setDownloadingFileId(file.id);
      setShowPasswordModalForDownload(true);
      setDownloadError(null);
      return;
    }

    setIsDownloadProcessing(true);
    try {
      await downloadFileWithPassword(file, username);
    } catch (error) {
      console.error("Download failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to download file";
      setUploadErrors((prev) => new Map(prev).set(file.id, errorMessage));
    } finally {
      setIsDownloadProcessing(false);
    }
  };

  const handlePasswordModalSubmit = async (password: string) => {
    if (!downloadingFileId || !username) return;

    const fileToDownload = files.find((f) => f.id === downloadingFileId);
    if (!fileToDownload) return;

    setIsDownloadProcessing(true);
    setDownloadError(null);

    try {
      await downloadFileWithPassword(fileToDownload, username, password);
      setShowPasswordModalForDownload(false);
      setDownloadingFileId(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Download failed";
      setDownloadError(errorMessage);
      setUploadErrors((prev) =>
        new Map(prev).set(fileToDownload.id, errorMessage),
      );
    } finally {
      setIsDownloadProcessing(false);
    }
  };

  const handlePasswordModalCancel = () => {
    setShowPasswordModalForDownload(false);
    setDownloadingFileId(null);
    setDownloadError(null);
  };

  const getFileContextMenuItems = (fileId: string): MenuItemType[] => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return [];

    const isPending =
      file.status === "uploading" ||
      file.status === "pending-confirmation" ||
      file.status === "queued";
    const isFailed = file.status === "failed";

    if (currentView === "TRASH") {
      return [
        {
          label: "Restore",
          icon: RefreshCw,
          action: () => restoreFile(fileId),
        },
      ];
    }

    if (isPending) {
      return [
        {
          label: "Processing...",
          icon: Loader2,
          disabled: true,
          action: () => {},
        },
      ];
    }

    if (isFailed) {
      return [
        {
          label: "Retry Upload",
          icon: RefreshCw,
          action: () => {},
          disabled: true,
        },
        {
          label: "Hide",
          icon: Eye,
          danger: true,
          action: () => handleDelete(fileId),
        },
      ];
    }

    const menuItems: MenuItemType[] = [
      {
        label: "Download",
        icon: Download,
        action: () => handleDownloadFile(fileId),
      },
      { separator: true },
      {
        label: file.isPinned ? "Unpin from Sidebar" : "Pin to Sidebar",
        icon: Pin,
        action: () => togglePin(fileId),
      },
      {
        label: file.isBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks",
        icon: Bookmark,
        action: () => toggleBookmark(fileId),
      },
      {
        label: "Add notes",
        icon: StickyNote,
        action: () => handleAddNote(fileId, file.note),
      },
      {
        colorPicker: true,
        label: "Tags",
        icon: Tag,
        action: (color) => setFileTag(fileId, color as string),
      },
      { separator: true },
    ];

    menuItems.push(
      { separator: true },
      {
        label: "Hide",
        icon: Eye,
        danger: true,
        action: () => handleDelete(fileId),
      },
    );

    return menuItems;
  };

  const bgContextMenuItems: MenuItemType[] = [
    {
      label: "View",
      icon: List,
      subMenuItems: [
        {
          label: "Extra large icons",
          action: () => setViewDisplayMode("extra-large-icons"),
          icon: viewDisplayMode === "extra-large-icons" ? Check : undefined,
        },
        {
          label: "Large icons",
          action: () => setViewDisplayMode("large-icons"),
          icon: viewDisplayMode === "large-icons" ? Check : undefined,
        },
        {
          label: "Medium icons",
          action: () => setViewDisplayMode("medium-icons"),
          icon: viewDisplayMode === "medium-icons" ? Check : undefined,
        },
        {
          label: "Small icons",
          action: () => setViewDisplayMode("small-icons"),
          icon: viewDisplayMode === "small-icons" ? Check : undefined,
        },
        { separator: true },
        {
          label: "List",
          action: () => setViewDisplayMode("list"),
          icon: viewDisplayMode === "list" ? Check : undefined,
        },
      ],
    },
    {
      label: "Sort by",
      icon: ArrowDown,
      subMenuItems: [
        { label: "Name", action: () => toggleSortKey("name") },
        { label: "Date modified", action: () => toggleSortKey("dateModified") },
        { label: "Date created", action: () => toggleSortKey("dateCreated") },
        { label: "Size", action: () => toggleSortKey("size") },
        { label: "Type", action: () => toggleSortKey("type") },
        { separator: true },
        {
          label: "Ascending",
          action: () => setSortDirection("asc"),
          icon: sortConfig.direction === "asc" ? Check : undefined,
        },
        {
          label: "Descending",
          action: () => setSortDirection("desc"),
          icon: sortConfig.direction === "desc" ? Check : undefined,
        },
      ],
    },
    { separator: true },
    {
      label: "New Folder",
      icon: Folder,
      action: () => addFile("folder"),
      disabled: !canCreateInCurrentFolder,
    },
    { separator: true },
    {
      label: "Import files",
      icon: Upload,
      action: () => fileInputRef.current?.click(),
    },
  ];

  const newDropdownItems: MenuItemType[] = [
    {
      label: "Folder",
      icon: Folder,
      action: () => addFile("folder"),
      disabled: !canCreateInCurrentFolder,
    },
  ];

  const sortDropdownItems: MenuItemType[] = [
    { label: "Name", action: () => toggleSortKey("name") },
    { label: "Date modified", action: () => toggleSortKey("dateModified") },
    { label: "Date created", action: () => toggleSortKey("dateCreated") },
    { label: "Size", action: () => toggleSortKey("size") },
    { label: "Type", action: () => toggleSortKey("type") },
    { separator: true },
    {
      label: "Ascending",
      action: () => setSortDirection("asc"),
      icon: sortConfig.direction === "asc" ? Check : undefined,
    },
    {
      label: "Descending",
      action: () => setSortDirection("desc"),
      icon: sortConfig.direction === "desc" ? Check : undefined,
    },
  ];

  const viewDropdownItems: MenuItemType[] = [
    {
      label: "Extra large icons",
      action: () => setViewDisplayMode("extra-large-icons"),
      isActive: viewDisplayMode === "extra-large-icons",
    },
    {
      label: "Large icons",
      action: () => setViewDisplayMode("large-icons"),
      isActive: viewDisplayMode === "large-icons",
    },
    {
      label: "Medium icons",
      action: () => setViewDisplayMode("medium-icons"),
      isActive: viewDisplayMode === "medium-icons",
    },
    {
      label: "Small icons",
      action: () => setViewDisplayMode("small-icons"),
      isActive: viewDisplayMode === "small-icons",
    },
    { separator: true },
    {
      label: "List",
      action: () => setViewDisplayMode("list"),
      isActive: viewDisplayMode === "list",
    },
  ];

  const getIconSize = () => {
    switch (viewDisplayMode) {
      case "small-icons":
        return 32;
      case "medium-icons":
        return 48;
      case "large-icons":
        return 64;
      case "extra-large-icons":
        return 96;
      default:
        return 18;
    }
  };

  const getGridCols = () => {
    switch (viewDisplayMode) {
      case "small-icons":
        return "grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10";
      case "medium-icons":
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
      case "large-icons":
        return "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case "extra-large-icons":
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
      default:
        return "";
    }
  };

  const isIconView = viewDisplayMode !== "list";
  const iconSize = getIconSize();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full font-mono relative safe-top safe-bottom"
      onClick={closeMenus}
      onContextMenu={(e) => handleContextMenu(e)}
      onDragOver={(e) => handleDragOver(e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleImportFile}
        accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.png,.jpg,.jpeg,.gif,.svg"
      />
      <input
        type="file"
        ref={folderInputRef}
        hidden
        onChange={handleFolderUpload}
        // @ts-expect-error - webkitdirectory is non-standard
        webkitdirectory=""
        directory=""
        multiple
      />

      <SelectionOverlay
        selectionBox={selectionState.selectionBox}
        isSelecting={selectionState.isSelecting}
      />

      <BatchOperationsBar
        selectedCount={selectionState.selectedFileIds.size}
        onDelete={handleBatchDelete}
        onTag={handleBatchTag}
        onBookmark={handleBatchBookmark}
        onClear={clearSelection}
        onSelectAll={selectAll}
      />

      {showTagPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={() => setShowTagPicker(false)}
        >
          <div
            className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-zinc-900 dark:text-zinc-50 mb-3 md:mb-4 font-bold text-sm md:text-base">
              Select Tag Color
            </h3>
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBatchTagSelect(color);
                  }}
                  className="w-full aspect-square rounded-full hover:ring-2 ring-zinc-400 transition-all touch-manipulation tap-highlight-transparent flex items-center justify-center"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={() => setShowTagPicker(false)}
              className="mt-4 w-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 text-sm py-2 touch-target tap-highlight-transparent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-[100] md:bottom-8 md:right-8">
          <ErrorToast
            id="general-error"
            message={error}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[100] md:bottom-8 md:right-8 flex flex-col gap-2">
        {Array.from(uploadErrors.entries()).map(([id, message]) => (
          <ErrorToast
            key={id}
            id={id}
            message={message}
            onDismiss={handleDismissError}
          />
        ))}
      </div>

      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-zinc-900 dark:text-zinc-50 mb-3 md:mb-4 font-bold flex items-center gap-2 text-sm md:text-base">
              <StickyNote size={16} className="text-blue-500 flex-shrink-0" />
              Add Notes
            </h3>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Enter your notes here..."
              className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 px-3 py-2 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNotesModal(null);
                  setNotesInput("");
                }}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 px-3 py-2 text-sm touch-target tap-highlight-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm touch-target touch-manipulation tap-highlight-transparent"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModalForDownload && (
        <PasswordModal
          onSubmit={handlePasswordModalSubmit}
          onCancel={handlePasswordModalCancel}
          isProcessing={isDownloadProcessing}
          error={downloadError}
          title="Download File"
          message="Enter your password to decrypt and download this file."
        />
      )}

      {!canCreateInCurrentFolder && currentFolder && (
        <div className="fixed top-16 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-40 bg-orange-950/90 backdrop-blur-sm border border-orange-700 text-orange-200 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 text-xs md:text-sm max-w-2xl">
          <Clock size={14} className="flex-shrink-0" />
          <span className="flex-1">
            Cannot create items. Parent folder &quot;{currentFolder.name}&quot;
            is still being confirmed.
          </span>
        </div>
      )}

      {isDraggingOverBackground && (
        <div className="fixed inset-0 z-30 border-4 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none flex items-center justify-center p-4">
          <div className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Move size={18} className="flex-shrink-0" />
            <span className="font-medium text-sm md:text-base">
              Drop here to move to current folder
            </span>
          </div>
        </div>
      )}

      <MenuDropdown
        isOpen={activeDropdown === "new"}
        onClose={closeMenus}
        items={newDropdownItems}
        anchorRef={newBtnRef}
      />
      <MenuDropdown
        isOpen={activeDropdown === "sort"}
        onClose={closeMenus}
        items={sortDropdownItems}
        anchorRef={sortBtnRef}
      />
      <MenuDropdown
        isOpen={activeDropdown === "view"}
        onClose={closeMenus}
        items={viewDropdownItems}
        anchorRef={viewBtnRef}
      />
      <MenuDropdown
        isOpen={!!contextMenu}
        onClose={closeMenus}
        items={
          contextMenu?.fileId
            ? getFileContextMenuItems(contextMenu.fileId)
            : bgContextMenuItems
        }
        position={
          contextMenu ? { x: contextMenu.x, y: contextMenu.y } : undefined
        }
      />

      <div className="flex flex-col flex-1 min-w-0 border-r border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
        <div className="min-h-[48px] md:h-14 flex items-center px-3 md:px-6 gap-1 md:gap-2 text-zinc-900 dark:text-zinc-50 text-sm border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 select-none flex-wrap">
          {currentView === "TRASH" ? (
            <div className="flex items-center gap-2 text-red-400 dark:text-red-600 font-bold text-xs md:text-sm flex-1 min-w-0">
              <Eye size={14} className="flex-shrink-0" />
              <span className="truncate">Hidden Files</span>
              <button
                onClick={emptyHiddenFiles}
                className="text-[10px] md:text-xs bg-red-950/20 hover:bg-red-900 px-2 md:px-3 py-1 rounded border border-red-900 text-red-200 touch-target touch-manipulation tap-highlight-transparent flex-shrink-0"
              >
                Empty
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
                <div className="hidden md:flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2 md:px-3 py-1.5 rounded cursor-pointer text-xs md:text-sm"
                    title="Import Files"
                  >
                    <Upload size={14} />
                    <span>Files</span>
                  </button>

                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2 md:px-3 py-1.5 rounded cursor-pointer text-xs md:text-sm"
                    title="Import Folder"
                  >
                    <Folder size={14} />
                    <span>Folder</span>
                  </button>
                </div>

                <button
                  className="md:hidden p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded touch-target tap-highlight-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileToolbar(!showMobileToolbar);
                  }}
                >
                  <MoreVertical size={16} />
                </button>

                {showMobileToolbar && (
                  <div className="md:hidden fixed inset-x-0 bottom-0 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-300 dark:border-zinc-700 p-4 z-50 safe-bottom">
                    <div className="flex items-center justify-around gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown("sort");
                        }}
                        className="flex flex-col items-center gap-1 p-2 touch-target tap-highlight-transparent"
                      >
                        <ArrowDown size={18} />
                        <span className="text-xs">Sort</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown("view");
                        }}
                        className="flex flex-col items-center gap-1 p-2 touch-target tap-highlight-transparent"
                      >
                        <Grid3x3 size={18} />
                        <span className="text-xs">View</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-1 p-2 touch-target tap-highlight-transparent"
                      >
                        <Upload size={18} />
                        <span className="text-xs text-center">
                          Import
                          <br />
                          Files
                        </span>
                      </button>
                      <button
                        onClick={() => folderInputRef.current?.click()}
                        className="flex flex-col items-center gap-1 p-2 touch-target tap-highlight-transparent"
                      >
                        <Folder size={18} />
                        <span className="text-xs text-center">
                          Import
                          <br />
                          Folder
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="hidden md:flex items-center gap-1">
                  <div
                    ref={sortBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown("sort");
                    }}
                    className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2 md:px-3 py-1.5 rounded cursor-pointer text-xs md:text-sm"
                  >
                    <ArrowDown size={14} /> <span>Sort</span>{" "}
                    <ChevronDown size={10} />
                  </div>

                  <div
                    ref={viewBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown("view");
                    }}
                    className="flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 px-2 md:px-3 py-1.5 rounded cursor-pointer text-xs md:text-sm"
                  >
                    {getViewIcon(viewDisplayMode, 14)}
                    <span>View</span> <ChevronDown size={10} />
                  </div>
                </div>
              </div>

              <div className="hidden md:flex gap-2">
                <div
                  className={clsx(
                    "hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded cursor-pointer touch-target tap-highlight-transparent",
                    isRefreshing && "opacity-50 cursor-not-allowed",
                  )}
                  title="Refresh"
                  onClick={handleRefresh}
                >
                  <RefreshCw
                    size={16}
                    className={clsx(isRefreshing && "animate-spin")}
                  />
                </div>
                <div
                  className="hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded cursor-pointer touch-target tap-highlight-transparent"
                  title="Import"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                </div>
              </div>
            </>
          )}
        </div>

        {!isIconView && (
          <div className="hidden md:grid grid-cols-[1fr_160px_30px] px-6 py-3 text-zinc-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider select-none bg-zinc-50 dark:bg-zinc-900">
            <span
              onClick={() => toggleSortKey("name")}
              className="cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Name
            </span>
            <span
              onClick={() => toggleSortKey("dateModified")}
              className="text-right cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Date modified
            </span>
            <span></span>
          </div>
        )}

        <div
          ref={filesContainerRef}
          data-files-container
          className="flex-1 overflow-y-auto no-scrollbar pb-10 safe-bottom"
        >
          {visibleFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 dark:text-zinc-400 p-4">
              <div className="text-center">
                <FileText
                  size={40}
                  className="mx-auto mb-3 md:mb-4 opacity-50"
                />
                <p className="text-xs md:text-sm">No files in this view</p>
              </div>
            </div>
          ) : isIconView ? (
            <div
              className={clsx("grid gap-2 md:gap-4 p-3 md:p-6", getGridCols())}
            >
              {visibleFiles.map((file) => (
                <div
                  key={file.id}
                  data-file-id={file.id}
                  draggable={currentView !== "TRASH"}
                  onDragStart={(e) => handleDragStart(e, file.id)}
                  onDragOver={(e) => handleDragOver(e, file.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    handleFileClick(file.id, e);
                    selectFile(file.id);
                    setIsMobileDetailOpen(true);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (file.type === "folder") {
                      navigateToFolder(file.id);
                    } else {
                      if (
                        file.status === "pending-confirmation" ||
                        file.status === "uploading" ||
                        file.status === "queued"
                      )
                        return;
                      openFile(file.id);
                      // FIX Issue 3: Open mobile detail panel to show editor
                      setIsMobileDetailOpen(true);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, file.id)}
                  className={clsx(
                    "flex flex-col items-center p-2 md:p-3 rounded cursor-pointer transition-all select-none group relative touch-manipulation tap-highlight-transparent",
                    isFileSelected(file.id)
                      ? "bg-blue-200 dark:bg-blue-900/40 ring-2 ring-blue-500"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700",
                    clipboard?.fileId === file.id &&
                      clipboard.action === "cut" &&
                      "opacity-50",
                    draggedFileId === file.id && "opacity-40 scale-95",
                    dropTargetId === file.id &&
                      file.type === "folder" &&
                      "ring-2 ring-blue-500 ring-offset-2 bg-blue-50 dark:bg-blue-950/20",
                    deletingId === file.id && "opacity-50 pointer-events-none",
                  )}
                >
                  {deletingId === file.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 dark:bg-zinc-100/10 backdrop-blur-sm rounded z-10">
                      <Loader2
                        size={20}
                        className="animate-spin text-zinc-600 dark:text-zinc-400"
                      />
                    </div>
                  )}

                  <div className="relative mb-2">
                    {file.type === "folder" ? (
                      <Folder
                        size={iconSize}
                        style={{ color: file.colorTag || undefined }}
                        strokeWidth={1}
                      />
                    ) : (
                      <div style={{ color: file.colorTag || undefined }}>
                        {getFileIcon(file.name, iconSize)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 w-full">
                    <span
                      className={clsx(
                        "text-[10px] md:text-xs text-center break-words w-full line-clamp-2",
                        currentView === "TRASH" && "text-zinc-500",
                      )}
                      style={{
                        color: file.colorTag
                          ? file.colorTag
                          : isFileSelected(file.id)
                            ? undefined
                            : undefined,
                      }}
                    >
                      {file.name}
                    </span>
                    <FileStatusBadge
                      status={
                        file.isDeleted || file.deletedAt
                          ? "deleted"
                          : file.status
                      }
                      progress={
                        file.uploadProgress || file.confirmationProgress
                      }
                      estimatedTime={file.estimatedConfirmationTime}
                      error={file.uploadError}
                    />
                    {file.status === "queued" && file.queuedReason && (
                      <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-orange-600 dark:text-orange-400">
                        <Clock size={8} className="flex-shrink-0" />
                        <span className="truncate">{file.queuedReason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 mt-1 flex-wrap justify-center font-mono">
                    {file.isLocked && (
                      <div className="flex items-center gap-0.5 text-[8px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded text-zinc-900 dark:text-zinc-300">
                        <Lock size={8} className="flex-shrink-0" />
                        <span>Locked</span>
                        {file.lockExpiry && (
                          <span className="text-zinc-500">
                            - {getRelativeTimeFuture(file.lockExpiry)}
                          </span>
                        )}
                      </div>
                    )}
                    {file.isBookmarked && (
                      <Bookmark
                        size={10}
                        className="text-blue-500 fill-blue-500"
                      />
                    )}
                    {file.isPinned && (
                      <Pin size={10} className="text-green-500" />
                    )}
                    {file.note && (
                      <StickyNote
                        size={10}
                        className="text-zinc-400 dark:text-zinc-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            visibleFiles.map((file) => (
              <div
                key={file.id}
                data-file-id={file.id}
                draggable={currentView !== "TRASH"}
                onDragStart={(e) => handleDragStart(e, file.id)}
                onDragOver={(e) => handleDragOver(e, file.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  handleFileClick(file.id, e);
                  selectFile(file.id);
                  setIsMobileDetailOpen(true);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (file.type === "folder") {
                    navigateToFolder(file.id);
                  } else {
                    if (
                      file.status === "pending-confirmation" ||
                      file.status === "uploading" ||
                      file.status === "queued"
                    )
                      return;
                    openFile(file.id);
                    // FIX Issue 3: Open mobile detail panel to show editor
                    setIsMobileDetailOpen(true);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                className={clsx(
                  "flex md:grid md:grid-cols-[1fr_160px_30px] items-start md:items-center gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 cursor-pointer text-sm border-b border-zinc-200 dark:border-zinc-800 group transition-all select-none relative touch-manipulation tap-highlight-transparent",
                  isFileSelected(file.id)
                    ? "bg-blue-200 dark:bg-blue-900/40 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700",
                  clipboard?.fileId === file.id &&
                    clipboard.action === "cut" &&
                    "opacity-50",
                  draggedFileId === file.id && "opacity-40",
                  dropTargetId === file.id &&
                    file.type === "folder" &&
                    "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500",
                  deletingId === file.id && "opacity-50 pointer-events-none",
                )}
              >
                {deletingId === file.id && (
                  <div className="absolute inset-0 flex items-center justify-start pl-3 md:pl-6 bg-zinc-900/5 dark:bg-zinc-100/5 backdrop-blur-sm z-10">
                    <Loader2
                      size={18}
                      className="animate-spin text-zinc-600 dark:text-zinc-400"
                    />
                  </div>
                )}

                <div className="flex items-start md:items-center gap-2 md:gap-3 truncate flex-1 min-w-0">
                  {file.type === "folder" ? (
                    <Folder
                      size={18}
                      style={{ color: file.colorTag || undefined }}
                      strokeWidth={1.5}
                      className="flex-shrink-0 mt-0.5 md:mt-0"
                    />
                  ) : (
                    <div
                      style={{ color: file.colorTag || undefined }}
                      className="flex-shrink-0 mt-0.5 md:mt-0"
                    >
                      {getFileIcon(file.name, 18)}
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 flex-1 min-w-0">
                    <span
                      className={clsx(
                        "truncate text-xs md:text-sm",
                        currentView === "TRASH" && "text-zinc-500",
                      )}
                      style={{ color: file.colorTag || undefined }}
                    >
                      {file.name}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <FileStatusBadge
                        status={
                          file.isDeleted || file.deletedAt
                            ? "deleted"
                            : file.status
                        }
                        progress={
                          file.uploadProgress || file.confirmationProgress
                        }
                        estimatedTime={file.estimatedConfirmationTime}
                        error={file.uploadError}
                      />
                      {file.status === "queued" && file.queuedReason && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          <Clock size={10} />
                        </div>
                      )}

                      {file.isLocked && (
                        <div className="flex items-center gap-0.5 text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-900 dark:text-zinc-300 whitespace-nowrap">
                          <Lock size={10} className="flex-shrink-0" />
                          <span>Locked</span>
                          {file.lockExpiry && (
                            <span className="text-zinc-500 ml-1">
                              - {getRelativeTimeFuture(file.lockExpiry)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex gap-2 flex-shrink-0">
                    {file.isLocked && (
                      <Lock
                        size={12}
                        className="text-zinc-600 dark:text-zinc-400"
                      />
                    )}
                    {file.isBookmarked && (
                      <Bookmark
                        size={12}
                        className="text-blue-500 fill-blue-500"
                      />
                    )}
                    {file.isPinned && (
                      <Pin size={12} className="text-green-500" />
                    )}
                    {file.note && (
                      <StickyNote
                        size={12}
                        className="text-zinc-400 dark:text-zinc-500"
                      />
                    )}
                  </div>
                </div>
                <span className="hidden md:block text-right text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  {file.dateModified}
                </span>
                <div className="hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentView === "TRASH" ? (
                    <RefreshCw
                      size={15}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-green-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreFile(file.id);
                      }}
                    />
                  ) : (
                    <Eye
                      size={15}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                    />
                  )}
                </div>
                <div className="md:hidden flex items-center gap-2 self-start">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {file.dateModified}
                  </span>
                  {currentView === "TRASH" ? (
                    <RefreshCw
                      size={14}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-green-400 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreFile(file.id);
                      }}
                    />
                  ) : (
                    <Eye
                      size={14}
                      className="text-zinc-500 dark:text-zinc-400 hover:text-blue-400 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className="hidden lg:block absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-50 group"
        style={{ left: `calc(100% - ${detailPanelWidth}px - 0.5px)` }}
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 flex items-center justify-center">
          <GripVertical
            size={16}
            className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>

      <div
        className="hidden lg:flex bg-zinc-50 dark:bg-zinc-900 flex-col h-full border-l border-zinc-300 dark:border-zinc-700 flex-shrink-0 relative"
        style={{ width: `${detailPanelWidth}px` }}
      >
        {viewMode === "EDITOR" && activeFile?.type === "file" ? (
          <MarkdownEditor
            key={activeFile.id}
            file={activeFile}
            closeFile={closeFile}
          />
        ) : (
          <FileDetailsPanel key={activeFile?.id} file={activeFile} />
        )}
      </div>

      <AnimatePresence>
        {isMobileDetailOpen && activeFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileDetailOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-zinc-50 dark:bg-zinc-900 rounded-t-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {viewMode === "EDITOR" && activeFile?.type === "file" ? (
                <div className="h-full">
                  <MarkdownEditor
                    key={activeFile.id}
                    file={activeFile}
                    closeFile={() => {
                      closeFile();
                      setIsMobileDetailOpen(false);
                    }}
                  />
                </div>
              ) : (
                <FileDetailsPanel
                  key={activeFile?.id}
                  file={activeFile}
                  isMobileOpen={isMobileDetailOpen}
                  onMobileClose={() => setIsMobileDetailOpen(false)}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
