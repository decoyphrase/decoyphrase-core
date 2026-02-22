import { PasswordSlot } from "./types";
import {
  millisecondsInMinute,
  millisecondsInHour,
  millisecondsInDay,
} from "date-fns/constants";

export const ONE_SECOND_MS = 1000;

export const BLOCKCHAIN_INDEXING_TIME_MS = 5 * millisecondsInMinute;

export const POLLING_INTERVAL_MS = 30 * ONE_SECOND_MS;

export const POLLING_INTERVAL_INITIAL_MS = 10 * ONE_SECOND_MS;

export const POLLING_INTERVAL_MAX_MS = 60 * ONE_SECOND_MS;

export const MAX_POLLING_ATTEMPTS = 15;

export const PENDING_FILE_EXPIRY_MS = 24 * millisecondsInHour;

export const MAX_RETRY_ATTEMPTS = 3;

export const CONFIRMATION_PROGRESS_INCREMENT = 6.67;

export const MAX_PASSWORD_SLOTS = 3;

export const MIN_ACTIVE_PASSWORDS = 1;

export const STORAGE_KEYS = {
  PENDING_FILES: "decoyphrase_pending_files",
  SESSION: "decoyphrase_session",
  CONFIRMED_IDS: "decoyphrase_confirmed_ids",
  DELETED_IDS: "decoyphrase_deleted_ids",
  RENAMED_IDS: "decoyphrase_renamed_ids",
  BOOKMARKED_IDS: "decoyphrase_bookmarked_ids",
  PINNED_IDS: "decoyphrase_pinned_ids",
  LOCKED_IDS: "decoyphrase_locked_ids",
  PASSWORD_SLOTS: "decoyphrase_password_slots",
  FILE_TAGS: "decoyphrase_file_tags",
  FILES_CACHE: "decoyphrase_files_cache",
} as const;

export const GRAPHQL_ENDPOINT = "https://arweave.net/graphql";

export const ARWEAVE_GATEWAY = "https://arweave.net";

export const TURBO_UPLOAD_ENDPOINT = "https://upload.ardrive.io";

export const CACHE_TTL_MS = 1 * millisecondsInMinute;

export const UPLOAD_TIMEOUT_MS = 2 * millisecondsInMinute;

export const METADATA_OPERATION_TIMEOUT_MS = 1 * millisecondsInMinute;

export const DELETION_MARKER_EXPIRY_MS = 30 * millisecondsInDay;

export const METADATA_UPDATE_RETRY_DELAY_MS = 5000;

export const MAX_METADATA_UPDATE_RETRIES = 3;

export const ESTIMATED_CONFIRMATION_TIMES = {
  MIN: 2,
  MAX: 5,
  UNIT: "minutes",
} as const;

export const PASSWORD_SLOT_LABELS: Record<PasswordSlot, string> = {
  primary: "Primary Password",
  secondary: "Secondary Password",
  tertiary: "Tertiary Password",
};

export const UI_LABELS = {
  FILES: "Files",
  LOCKED_DOCUMENTS: "LOCKED DOCUMENTS",
  ENCRYPTED_DOCUMENTS: "ENCRYPTED DOCUMENTS",
  LOCKED_FILES: "Locked Files",
  DOCUMENTS: "Documents",
  HOME: "Home",
  BOOKMARKS: "Bookmarks",
  RECYCLE_BIN: "Hidden Files",
  DOWNLOAD_DECOY_GENERATOR: "Download Decoy Generator",
} as const;

export const LOCK_WARNING_MESSAGE =
  "⚠️ Warning: Locking requires a blockchain transaction which takes 4-10 minutes. Once confirmed, the file cannot be unlocked until the expiry date.";

export const PASSWORD_SLOT_WARNING =
  "⚠️ Warning: You must have at least one active password. Removing all passwords will lock you out of your account.";

export const OPERATION_MESSAGES = {
  DELETE_SUCCESS: "File marked as deleted on Arweave",
  DELETE_PENDING: "Deletion marker uploading to blockchain",
  DELETE_FAILED: "Failed to mark file as deleted",
  RENAME_SUCCESS: "File renamed on Arweave",
  RENAME_PENDING: "Rename operation uploading to blockchain",
  RENAME_FAILED: "Failed to rename file",
  RESTORE_SUCCESS: "File restored successfully",
  RESTORE_FAILED: "Failed to restore file",
  PASSWORD_REMOVE_FAILED: "Failed to remove backup password",
} as const;

export const ERROR_CODES = {
  FILE_SIZE_EXCEEDED: "FILE_SIZE_EXCEEDED",
  FOLDER_SIZE_EXCEEDED: "FOLDER_SIZE_EXCEEDED",
  METADATA_SIZE_EXCEEDED: "METADATA_SIZE_EXCEEDED",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  NETWORK_ERROR: "NETWORK_ERROR",
  UPLOAD_ERROR: "UPLOAD_ERROR",
  DELETION_ERROR: "DELETION_ERROR",
  RENAME_ERROR: "RENAME_ERROR",
  ENCRYPTION_ERROR: "ENCRYPTION_ERROR",
  DECRYPTION_ERROR: "DECRYPTION_ERROR",
  INVALID_PASSWORD_SLOT: "INVALID_PASSWORD_SLOT",
} as const;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const USERNAME_MIN_LENGTH = 3;

export const USERNAME_MAX_LENGTH = 32;

export const USERNAME_VALIDATION_ERRORS = {
  TOO_SHORT: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
  TOO_LONG: `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`,
  INVALID_CHARS: "Username can only contain letters, numbers, and underscores",
  REQUIRED: "Username is required",
  NOT_FOUND: "Username not found",
} as const;

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_VALIDATION_ERRORS = {
  TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  REQUIRED: "Password is required",
  MISMATCH: "Passwords do not match",
  SLOT_FULL: "This password slot is already in use",
  SLOT_EMPTY: "This password slot is empty",
  CANNOT_REMOVE_LAST: "Cannot remove the last active password",
  INVALID_CURRENT: "Current password is incorrect",
} as const;

export function validateUsername(username: string): string | null {
  if (!username) {
    return USERNAME_VALIDATION_ERRORS.REQUIRED;
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return USERNAME_VALIDATION_ERRORS.TOO_SHORT;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return USERNAME_VALIDATION_ERRORS.TOO_LONG;
  }
  if (!USERNAME_REGEX.test(username)) {
    return USERNAME_VALIDATION_ERRORS.INVALID_CHARS;
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return PASSWORD_VALIDATION_ERRORS.REQUIRED;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_VALIDATION_ERRORS.TOO_SHORT;
  }
  return null;
}

export function validatePasswordSlot(slot: string): slot is PasswordSlot {
  return slot === "primary" || slot === "secondary" || slot === "tertiary";
}

export function sanitizeUsername(username: string): string {
  return username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, USERNAME_MAX_LENGTH);
}

export function getPasswordSlotPriority(slot: PasswordSlot): number {
  switch (slot) {
    case "primary":
      return 1;
    case "secondary":
      return 2;
    case "tertiary":
      return 3;
    default:
      return 99;
  }
}
