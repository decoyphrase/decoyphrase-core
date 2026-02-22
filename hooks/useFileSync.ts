"use client";

import { useEffect, useCallback, useRef } from "react";
import { pollForTransaction } from "@/lib/arweave/client";
import {
  getPendingFiles,
  removePendingFile,
  addConfirmedId,
  updatePendingFileStatus,
} from "@/lib/utils";
import {
  POLLING_INTERVAL_MS,
  MAX_POLLING_ATTEMPTS,
  ONE_SECOND_MS,
} from "@/lib/constants";
import type { PendingFile } from "@/lib/types";
import { isFolderItem } from "@/lib/types";
import { differenceInMilliseconds, getTime } from "date-fns";
import { millisecondsInMinute } from "date-fns/constants";

interface UseFileSyncOptions {
  username: string | null;
  isAuthenticated: boolean;
  onFileConfirmed?: (fileId: string, tempId?: string) => void;
  onFileFailed?: (fileId: string) => void;
  onProgressUpdate?: (fileId: string, progress: number) => void;
  onFolderConfirmed?: (folderId: string, tempId?: string) => void;
  onFolderFailed?: (folderId: string) => void;
}

interface UseFileSyncReturn {
  manualSync: () => void;
  activePolls: number;
}

export function useFileSync({
  username,
  isAuthenticated,
  onFileConfirmed,
  onFileFailed,
  onProgressUpdate,
  onFolderConfirmed,
  onFolderFailed,
}: UseFileSyncOptions): UseFileSyncReturn {
  const activePolls = useRef<Set<string>>(new Set());
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const callbacksRef = useRef({
    onFileConfirmed,
    onFileFailed,
    onProgressUpdate,
    onFolderConfirmed,
    onFolderFailed,
  });

  useEffect(() => {
    callbacksRef.current = {
      onFileConfirmed,
      onFileFailed,
      onProgressUpdate,
      onFolderConfirmed,
      onFolderFailed,
    };
  }, [
    onFileConfirmed,
    onFileFailed,
    onProgressUpdate,
    onFolderConfirmed,
    onFolderFailed,
  ]);

  const startPolling = useCallback(
    async (pendingFile: PendingFile) => {
      const fileId = pendingFile.fileItem.turboDataItemId;
      if (!fileId || activePolls.current.has(fileId) || !username) {
        return;
      }

      activePolls.current.add(fileId);

      const isFolder = isFolderItem(pendingFile.fileItem);
      const tempId =
        pendingFile.fileItem.tempParentId || pendingFile.fileItem.id;

      const MAX_AGE = 30 * millisecondsInMinute;
      const fileAge = differenceInMilliseconds(
        getTime(new Date()),
        pendingFile.uploadTimestamp,
      );

      if (fileAge > MAX_AGE) {
        console.warn(
          `Pending file ${fileId} expired (age: ${Math.floor(fileAge / millisecondsInMinute)}min)`,
        );
        removePendingFile(username, fileId);
        activePolls.current.delete(fileId);

        if (isFolder && callbacksRef.current.onFolderFailed) {
          callbacksRef.current.onFolderFailed(fileId);
        } else if (callbacksRef.current.onFileFailed) {
          callbacksRef.current.onFileFailed(fileId);
        }
        return;
      }

      try {
        updatePendingFileStatus(username, fileId, "pending-confirmation", {
          confirmationProgress: 0,
        });

        const confirmed = await pollForTransaction(fileId, {
          maxAttempts: MAX_POLLING_ATTEMPTS,
          onProgress: (attempt: number, progress: number) => {
            if (callbacksRef.current.onProgressUpdate) {
              callbacksRef.current.onProgressUpdate(fileId, progress);
            }

            updatePendingFileStatus(username, fileId, "pending-confirmation", {
              confirmationProgress: progress,
            });
          },
        });

        if (confirmed) {
          if (callbacksRef.current.onProgressUpdate) {
            callbacksRef.current.onProgressUpdate(fileId, 100);
          }

          updatePendingFileStatus(username, fileId, "confirmed", {
            confirmationProgress: 100,
            status: "confirmed",
          });

          addConfirmedId(username, fileId);
          removePendingFile(username, fileId);

          if (isFolder) {
            if (callbacksRef.current.onFolderConfirmed) {
              callbacksRef.current.onFolderConfirmed(
                fileId,
                tempId !== fileId ? tempId : undefined,
              );
            }
          } else {
            if (callbacksRef.current.onFileConfirmed) {
              callbacksRef.current.onFileConfirmed(
                fileId,
                tempId !== fileId ? tempId : undefined,
              );
            }
          }
        } else {
          updatePendingFileStatus(username, fileId, "failed", {
            uploadError:
              "Confirmation timeout or failed after maximum attempts",
          });

          if (isFolder) {
            if (callbacksRef.current.onFolderFailed) {
              callbacksRef.current.onFolderFailed(fileId);
            }
          } else {
            if (callbacksRef.current.onFileFailed) {
              callbacksRef.current.onFileFailed(fileId);
            }
          }
        }
      } catch (error) {
        console.error(`Polling failed for ${fileId}:`, error);

        updatePendingFileStatus(username, fileId, "failed", {
          uploadError: error instanceof Error ? error.message : "Unknown error",
        });

        if (isFolder) {
          if (callbacksRef.current.onFolderFailed) {
            callbacksRef.current.onFolderFailed(fileId);
          }
        } else {
          if (callbacksRef.current.onFileFailed) {
            callbacksRef.current.onFileFailed(fileId);
          }
        }
      } finally {
        activePolls.current.delete(fileId);
      }
    },
    [username],
  );

  const processPendingFiles = useCallback(() => {
    if (!username || !isAuthenticated) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const now = getTime(new Date());
    if (now - lastSyncTimeRef.current < 5000) {
      return;
    }

    lastSyncTimeRef.current = now;
    const pendingFiles = getPendingFiles(username);

    const EXPIRY_TIME = 30 * millisecondsInMinute;
    const activePendingFiles = pendingFiles.filter((pf) => {
      const age = now - pf.uploadTimestamp;
      return age < EXPIRY_TIME;
    });

    activePendingFiles.forEach((pendingFile) => {
      const fileId = pendingFile.fileItem.turboDataItemId;
      if (fileId && !activePolls.current.has(fileId)) {
        startPolling(pendingFile);
      }
    });
  }, [username, isAuthenticated, startPolling]);

  useEffect(() => {
    if (!username || !isAuthenticated) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      activePolls.current.clear();
      isInitializedRef.current = false;
      return;
    }

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const initTimer = setTimeout(() => {
        processPendingFiles();
      }, ONE_SECOND_MS);

      return () => clearTimeout(initTimer);
    }

    syncIntervalRef.current = setInterval(() => {
      processPendingFiles();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [username, isAuthenticated, processPendingFiles]);

  const manualSync = useCallback(() => {
    processPendingFiles();
  }, [processPendingFiles]);

  return {
    manualSync,
    activePolls: activePolls.current.size,
  };
}
