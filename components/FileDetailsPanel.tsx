"use client";

import { useEffect, useState, useCallback } from "react";
import {
  format,
  intervalToDuration,
  parseISO,
  differenceInSeconds,
  toDate,
  isBefore,
  isAfter,
} from "date-fns";
import {
  Folder,
  Clock,
  ExternalLink,
  FolderOpen,
  Download,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  Bookmark,
  Palette,
  Check,
} from "lucide-react";
import { TAG_COLORS } from "@/lib/data";
import { ONE_SECOND_MS } from "@/lib/constants";
import { FileItem, isFolderItem, hasFolderMetadata } from "@/lib/types";
import { getFileTypeLabel, getFolderPath } from "@/lib/utils";
import { getFileIcon } from "@/lib/icons";
import FileStatusBadge from "./ui/FileStatusBadge";
import { useVault } from "@/context/VaultContext";
import { useArweave } from "@/context/ArweaveContext";
import { downloadFileWithPassword } from "@/lib/arweave/download";

interface FileDetailsPanelProps {
  file: FileItem | undefined;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface DetailRowProps {
  label: string;
  value: string;
  link?: string;
}

function DetailRow({ label, value, link }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr] py-1 gap-2">
      <span className="text-zinc-600 dark:text-zinc-400 text-xs">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 dark:text-blue-400 text-xs text-right truncate hover:underline flex items-center justify-end gap-1 touch-manipulation tap-highlight-transparent"
        >
          <span className="truncate">{value}</span>
          <ExternalLink size={10} className="flex-shrink-0" />
        </a>
      ) : (
        <span className="text-zinc-900 dark:text-zinc-50 text-xs text-right truncate">
          {value}
        </span>
      )}
    </div>
  );
}

function LockCountdown({ expiry }: { expiry: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const expiryDate = parseISO(expiry);
        const now = new Date();

        const diffInSeconds = differenceInSeconds(expiryDate, now);

        if (diffInSeconds <= 0) {
          setTimeLeft("Expired");
          return;
        }

        const duration = intervalToDuration({ start: now, end: expiryDate });
        // Ensure values are numbers (default to 0 if undefined)
        const days = duration.days ?? 0;
        const hours = duration.hours ?? 0;
        const minutes = duration.minutes ?? 0;
        const seconds = duration.seconds ?? 0;

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      } catch (err) {
        console.error("Error calculating lock time:", err);
        setTimeLeft("Calculatiing...");
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, ONE_SECOND_MS);

    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <div className="flex items-center gap-2 text-yellow-500 mt-4 p-3 bg-yellow-950/20 dark:bg-yellow-950/30 rounded border border-yellow-900/50 dark:border-yellow-700/50">
      <Clock size={14} className="flex-shrink-0" />
      <span className="text-xs">
        {timeLeft === "Expired" ? "Lock expired" : `Unlocks in ${timeLeft}`}
      </span>
    </div>
  );
}

function ConfirmationTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const calculateElapsed = () => {
      const start = toDate(startedAt);
      const now = new Date();
      // Only show elapsed if start is in the past
      if (isBefore(now, start)) {
        setElapsed("0s");
        return;
      }

      // Calculate total minutes to match previous logic if > 60 mins?
      // Previous logic was just minutes + seconds.
      // intervalToDuration days will be separate.
      // Let's stick to minutes and seconds as per original logic which seemed to assume short durations.
      // Or better, handle hours/days if it takes that long?
      // The original code: minutes = Math.floor(diff / 60000). So it summed hours into minutes.

      // Replicating "summed minutes" with date-fns:
      const duration = intervalToDuration({ start, end: now });
      const mins = duration.minutes || 0;
      const secs = duration.seconds || 0;

      if (mins > 0) {
        setElapsed(`${mins}m ${secs}s`);
      } else {
        setElapsed(`${secs}s`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, ONE_SECOND_MS);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-zinc-500 dark:text-zinc-400">Elapsed Time:</span>
      <span className="text-blue-600 dark:text-blue-400 font-medium">
        {elapsed}
      </span>
    </div>
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
          <Lock size={18} className="text-blue-500 flex-shrink-0" />
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
              <Lock
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

export default function FileDetailsPanel({
  file,

  onMobileClose,
}: FileDetailsPanelProps) {
  const {
    files,
    verifiedFileIds,
    toggleBookmark,
    setFileTag,
    deleteFile,
    openFile,
  } = useVault();
  const { username } = useArweave();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3 * ONE_SECOND_MS);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDownload = useCallback(
    async (password?: string) => {
      if (!file || !username) return;

      if (file.isLocked) {
        return;
      }

      if (!file.content && file.turboDataItemId) {
        if (!password) {
          setShowPasswordModal(true);
          return;
        }

        setIsProcessing(true);
        setError(null);

        try {
          await downloadFileWithPassword(file, username, password);
          setShowPasswordModal(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Download failed");
        } finally {
          setIsProcessing(false);
        }
      } else if (file.content) {
        try {
          await downloadFileWithPassword(file, username, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Download failed");
        }
      }
    },
    [file, username],
  );

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-4">
        <Folder size={48} strokeWidth={0.5} className="md:w-16 md:h-16" />
        <span className="mt-4 md:mt-6 text-xs md:text-sm font-mono tracking-widest uppercase text-center">
          Select an item
        </span>
      </div>
    );
  }

  const formatLockDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "MMM d, yyyy, h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getViewBlockUrl = (dataItemId: string) => {
    return `https://viewblock.io/arweave/tx/${dataItemId}`;
  };

  const shortenDataItemId = (id: string) => {
    return `${id.slice(0, 6)}...${id.slice(-6)}`;
  };

  const folderChildren = isFolderItem(file)
    ? files.filter((f) => f.parentId === file.id)
    : [];

  const folderPath = isFolderItem(file) ? getFolderPath(file.id, files) : "";

  const canDownload = file.type === "file" && !file.isLocked;

  return (
    <div
      className={`
        w-full h-full
        flex flex-col
        bg-zinc-50 dark:bg-zinc-900
        md:border-l border-zinc-200 dark:border-zinc-800
        overflow-y-auto no-scrollbar
        safe-bottom
      `}
    >
      {showPasswordModal && (
        <PasswordModal
          onSubmit={handleDownload}
          onCancel={() => {
            setShowPasswordModal(false);
            setError(null);
          }}
          isProcessing={isProcessing}
          error={error}
          title="Download File"
          message="Enter your password to decrypt and download this file."
        />
      )}

      {onMobileClose && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 sticky top-0 z-10 safe-top">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            File Details
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMobileClose();
            }}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 p-2 -mr-2 touch-target tap-highlight-transparent"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-8 md:py-16 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 px-4">
        {file.type === "folder" ? (
          <Folder
            size={64}
            strokeWidth={0.8}
            className="text-zinc-600 dark:text-zinc-400 mb-4 md:mb-6 w-16 h-16 md:w-20 md:h-20"
            style={{ color: file.colorTag }}
          />
        ) : (
          <div
            className="text-zinc-600 dark:text-zinc-400 mb-4 md:mb-6"
            style={{ color: file.colorTag }}
          >
            {getFileIcon(file.name, 64)}
          </div>
        )}
        <h2
          className="text-base md:text-lg font-medium px-4 md:px-8 text-center break-words max-w-full"
          style={{ color: file.colorTag || undefined }}
        >
          {file.name}
        </h2>

        {/* Mobile Open Button */}
        {file.type === "file" && !file.isLocked && onMobileClose && (
          <button
            onClick={() => {
              if (file.id) openFile(file.id);
            }}
            className="md:hidden mt-6 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          >
            <ExternalLink size={18} />
            <span>Open File</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-6 mt-6">
          <button
            onClick={() => {
              toggleBookmark(file.id);
              if (!file.isBookmarked) {
                setNotification({
                  message: "Added to Bookmarks",
                  type: "success",
                });
              } else {
                setNotification({
                  message: "Removed from Bookmarks",
                  type: "success",
                });
              }
            }}
            className={`flex flex-col items-center gap-2 text-xs transition-colors ${
              file.isBookmarked
                ? "text-blue-500"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <div
              className={`p-2 rounded-full ${
                file.isBookmarked
                  ? "bg-blue-500/10"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <Bookmark
                size={18}
                className={file.isBookmarked ? "fill-current" : ""}
              />
            </div>
            <span>Bookmark</span>
          </button>

          <button
            onClick={() => setShowTagPicker(true)}
            className="flex flex-col items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            <div
              className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-colors"
              style={{
                backgroundColor: file.colorTag
                  ? `${file.colorTag}20`
                  : undefined,
                color: file.colorTag || undefined,
              }}
            >
              <Palette size={18} />
            </div>
            <span>Tag</span>
          </button>

          <button
            onClick={() => {
              if (confirm("Hide this file? You can find it in Hidden Files.")) {
                deleteFile(file.id);
                setNotification({ message: "File hidden", type: "success" });
              }
            }}
            className="flex flex-col items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-500 transition-colors"
          >
            <div className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Eye size={18} />
            </div>
            <span>Hide</span>
          </button>
        </div>
        <div className="mt-3">
          <FileStatusBadge
            status={file.isDeleted || file.deletedAt ? "deleted" : file.status}
            progress={file.uploadProgress || file.confirmationProgress}
            estimatedTime={file.estimatedConfirmationTime}
            error={file.uploadError}
          />
        </div>

        {file.status === "pending-confirmation" && (
          <div className="w-full px-4 mt-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Loader2 size={14} className="animate-spin flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Blockchain Confirmation
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Status:
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Waiting for block
                  </span>
                </div>
                {file.turboDataItemId && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Tx ID:
                    </span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">
                      {shortenDataItemId(file.turboDataItemId)}
                    </span>
                  </div>
                )}
                {file.estimatedConfirmationTime && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Est. Time:
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {file.estimatedConfirmationTime}
                    </span>
                  </div>
                )}
                {file.confirmationStartedAt && (
                  <ConfirmationTimer startedAt={file.confirmationStartedAt} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4 justify-center px-4">
          {canDownload && (
            <button
              onClick={() => handleDownload()}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs md:text-sm transition-colors touch-target touch-manipulation tap-highlight-transparent"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          )}
        </div>

        {file.isLocked && (
          <div className="mt-4 w-full px-4">
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-yellow-950/20 border border-yellow-700/50 text-yellow-600 dark:text-yellow-400 rounded-md text-xs md:text-sm">
              <Lock size={14} className="flex-shrink-0" />
              <span>Download Disabled (Locked)</span>
            </div>
            {file.lockExpiry && <LockCountdown expiry={file.lockExpiry} />}
          </div>
        )}

        {(file.isDeleted || file.deletedAt) && (
          <div className="mt-4 w-full px-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                <Eye size={14} className="flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Hide Item (Hidden Files)
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                This item is currently hidden. On Arweave, data is permanent,
                but hide markers remove it from your main vault view.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FIX Bug 4: Check if lock has expired - expired locks should allow access */}
      {file.isLocked &&
      // Only show protected view if lock is NOT expired
      (!file.lockExpiry || !isAfter(new Date(), parseISO(file.lockExpiry))) &&
      !verifiedFileIds.has(file.id) &&
      (!file.id || !verifiedFileIds.has(file.id)) &&
      (!file.turboDataItemId || !verifiedFileIds.has(file.turboDataItemId)) ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
            <Lock size={32} className="text-yellow-500" />
          </div>
          <h3 className="text-zinc-900 dark:text-zinc-50 font-bold mb-2">
            File Details Protected
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-[200px] leading-relaxed">
            This file is locked. Please double-click the file in the explorer to
            verify your password and view its details.
          </p>
          {file.turboDataItemId && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  if (file.id) openFile(file.id);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Unlock File
              </button>
              {file.turboDataItemId && (
                <a
                  href={getViewBlockUrl(file.turboDataItemId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 opacity-75 hover:opacity-100"
                >
                  <span>View on Viewblock</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 md:p-6 lg:p-8 font-mono text-xs">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            {file.type === "folder" ? (
              <Folder
                size={14}
                className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
              />
            ) : (
              <div className="text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                {getFileIcon(file.name, 14)}
              </div>
            )}
            <span
              className="font-bold text-xs md:text-sm truncate"
              style={{ color: file.colorTag || undefined }}
            >
              {file.name}
            </span>
          </div>

          <h3 className="text-zinc-500 dark:text-zinc-400 font-bold mb-3 md:mb-4 uppercase tracking-wider text-xs">
            Details
          </h3>

          <div className="space-y-1 mb-6 md:mb-8">
            <DetailRow
              label="Type"
              value={
                file.type === "folder"
                  ? "File Folder"
                  : getFileTypeLabel(file.name)
              }
            />
            <DetailRow label="Size" value={file.size || "Unknown"} />
            {file.turboDataItemId ? (
              <DetailRow
                label="Location"
                value={`Arweave (${shortenDataItemId(file.turboDataItemId)})`}
                link={getViewBlockUrl(file.turboDataItemId)}
              />
            ) : (
              <DetailRow
                label="Location"
                value={file.location || "Local Storage (Pending)"}
              />
            )}
            <DetailRow
              label="Status"
              value={
                file.isDeleted || file.deletedAt
                  ? "Hidden"
                  : file.status === "pending-confirmation"
                    ? "Confirming..."
                    : file.status
              }
            />
            {file.status === "confirmed" &&
              file.confirmationStartedAt &&
              file.confirmationFinishedAt && (
                <DetailRow
                  label="Conf. Time"
                  value={`${Math.ceil(
                    (file.confirmationFinishedAt - file.confirmationStartedAt) /
                      60000,
                  )} mins`}
                />
              )}
            {file.owner && <DetailRow label="Owner" value={file.owner} />}
            {isFolderItem(file) && (
              <>
                <DetailRow
                  label="Items Inside"
                  value={folderChildren.length.toString()}
                />
                {folderPath && (
                  <DetailRow label="Folder Path" value={folderPath} />
                )}
                {hasFolderMetadata(file) && (
                  <DetailRow
                    label="Children"
                    value={file.folderMetadata.children.length.toString()}
                  />
                )}
              </>
            )}
            {file.isLocked && (
              <>
                <DetailRow label="Lock Date" value={file.dateModified} />
                <DetailRow
                  label="Lock Until"
                  value={
                    file.lockExpiry
                      ? formatLockDate(file.lockExpiry)
                      : "Permanent"
                  }
                />
                {file.turboDataItemId && (
                  <DetailRow
                    label="File Tx"
                    value={`Tx: ${shortenDataItemId(file.turboDataItemId)}`}
                    link={getViewBlockUrl(file.turboDataItemId)}
                  />
                )}
                {file.lockUpdateTxId && (
                  <DetailRow
                    label="Lock Tx"
                    value={`Tx: ${shortenDataItemId(file.lockUpdateTxId)}`}
                    link={getViewBlockUrl(file.lockUpdateTxId)}
                  />
                )}
              </>
            )}
          </div>

          {isFolderItem(file) && folderChildren.length > 0 && (
            <div className="pt-4 md:pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-bold mb-3 md:mb-4 uppercase tracking-wider flex items-center gap-2 text-xs">
                <FolderOpen size={12} className="flex-shrink-0" />
                <span>Folder Contents</span>
              </h3>
              <div className="space-y-2">
                {folderChildren.slice(0, 5).map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 py-1"
                  >
                    {child.type === "folder" ? (
                      <Folder size={10} className="flex-shrink-0" />
                    ) : (
                      <div className="flex-shrink-0">
                        {getFileIcon(child.name, 10)}
                      </div>
                    )}
                    <span className="truncate text-xs">{child.name}</span>
                  </div>
                ))}
                {folderChildren.length > 5 && (
                  <div className="text-zinc-500 dark:text-zinc-400 text-[10px] pt-2">
                    +{folderChildren.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1 pt-4 md:pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <DetailRow label="Date created" value={file.dateCreated} />
            <DetailRow label="Date modified" value={file.dateModified} />
            <DetailRow label="Date accessed" value={file.dateAccessed} />
          </div>

          {file.note && (
            <div className="pt-6 md:pt-8">
              <h3 className="text-zinc-500 dark:text-zinc-400 font-bold mb-3 md:mb-4 uppercase tracking-wider text-xs">
                Notes
              </h3>
              <div className="text-zinc-600 dark:text-zinc-400 text-xs whitespace-pre-wrap leading-relaxed break-words">
                {file.note}
              </div>
            </div>
          )}

          {file.turboDataItemId && (
            <div className="pt-4 md:pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-4 md:mt-6">
              <div className="bg-blue-950/10 dark:bg-blue-950/20 border border-blue-900/30 dark:border-blue-800/50 rounded-lg p-3">
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-2">
                  {isFolderItem(file)
                    ? "FOLDER METADATA ON ARWEAVE"
                    : "STORED ON ARWEAVE VIA TURBO"}
                </div>
                <div className="text-[10px] text-zinc-600 dark:text-zinc-400">
                  Permanently stored and encrypted on blockchain
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showTagPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
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
                  onClick={() => {
                    setFileTag(file.id, color);
                    setShowTagPicker(false);
                  }}
                  className="w-full aspect-square rounded-full hover:ring-2 ring-zinc-400 transition-all touch-manipulation tap-highlight-transparent flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {file.colorTag === color && (
                    <Check size={16} className="text-white drop-shadow-md" />
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  setFileTag(file.id, "");
                  setShowTagPicker(false);
                }}
                className="w-full aspect-square rounded-full border-2 border-dashed border-zinc-400 hover:border-zinc-600 flex items-center justify-center text-zinc-500 hover:text-zinc-700"
                title="Remove Tag"
              >
                <X size={16} />
              </button>
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

      {notification && (
        <div className="fixed bottom-4 right-4 z-[100] md:bottom-8 md:right-8">
          <div
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border
              ${
                notification.type === "success"
                  ? "bg-green-950/90 border-green-700 text-green-200"
                  : "bg-red-950/90 border-red-700 text-red-200"
              }
            `}
          >
            {notification.type === "success" ? (
              <Check size={16} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="flex-shrink-0" />
            )}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
