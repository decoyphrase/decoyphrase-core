import { getMasterWalletAddress, TurboNetworkError } from "./client";
import { encryptData } from "../crypto/encryption";
import { hashUsername } from "../utils";
import { formatISO } from "date-fns";
import type {
  TurboUploadResult,
  TurboTag,
  FolderMetadata,
  MetadataUpdateOptions,
  DeletionMetadata,
} from "../types";
import {
  MVP_FILE_SIZE_LIMIT as FILE_SIZE_LIMIT,
  MVP_FOLDER_METADATA_SIZE_LIMIT,
  MVP_METADATA_UPDATE_SIZE_LIMIT,
} from "../types";
import { UPLOAD_TIMEOUT_MS } from "../constants";

interface UploadOptions {
  content: string;
  encryptionKey: string;
  username: string;
  fileName: string;
  fileType?: string;
  metadata?: Record<string, string>;
  isUpdate?: boolean;
  originalFileId?: string;
  currentVersion?: number;
  parentFolderId?: string;
  isLocked?: boolean;
  lockExpiry?: string;
}

interface FolderUploadOptions {
  folderMetadata: FolderMetadata;
  encryptionKey: string;
  username: string;
  isUpdate?: boolean;
  originalFolderId?: string;
  currentVersion?: number;
  isLocked?: boolean;
  lockExpiry?: string;
}

interface UploadResult {
  dataItemId: string;
  status: "pending" | "confirmed";
  timestamp: number;
  uploadResult: TurboUploadResult;
  fileVersion: number;
  parentFileId?: string;
  tempId?: string;
}

type UploadSuccessCallback = (result: UploadResult) => void;

export class UploadError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export class FileSizeExceededError extends UploadError {
  constructor(fileSize: number, maxSize: number) {
    super(
      `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      "FILE_SIZE_EXCEEDED",
    );
  }
}

export class FolderSizeExceededError extends UploadError {
  constructor(metadataSize: number, maxSize: number) {
    super(
      `Folder metadata size ${metadataSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      "FOLDER_SIZE_EXCEEDED",
    );
  }
}

export class MetadataSizeExceededError extends UploadError {
  constructor(metadataSize: number, maxSize: number) {
    super(
      `Metadata size ${metadataSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      "METADATA_SIZE_EXCEEDED",
    );
  }
}

const validateFileSize = (content: string): void => {
  const contentSize = new Blob([content]).size;
  if (contentSize > FILE_SIZE_LIMIT) {
    throw new FileSizeExceededError(contentSize, FILE_SIZE_LIMIT);
  }
};

const validateFolderMetadataSize = (metadata: FolderMetadata): void => {
  const metadataString = JSON.stringify(metadata);
  const metadataSize = new Blob([metadataString]).size;
  if (metadataSize > MVP_FOLDER_METADATA_SIZE_LIMIT) {
    throw new FolderSizeExceededError(
      metadataSize,
      MVP_FOLDER_METADATA_SIZE_LIMIT,
    );
  }
};

const validateMetadataUpdateSize = (content: string): void => {
  const contentSize = new Blob([content]).size;
  if (contentSize > MVP_METADATA_UPDATE_SIZE_LIMIT) {
    throw new MetadataSizeExceededError(
      contentSize,
      MVP_METADATA_UPDATE_SIZE_LIMIT,
    );
  }
};

export const uploadMetadataUpdate = async (
  options: MetadataUpdateOptions,
  onSuccess?: UploadSuccessCallback,
): Promise<UploadResult> => {
  const {
    fileId,
    username,
    encryptionKey,
    changeType,
    newName,
    oldName,
    currentVersion = 0,
    metadata = {},
    isLocked,
    lockExpiry,
  } = options;

  try {
    const masterWalletAddress = await getMasterWalletAddress();

    const metadataPayload = {
      fileId,
      changeType,
      newName,
      oldName,
      timestamp: formatISO(new Date()),
      metadata,
    };

    const metadataString = JSON.stringify(metadataPayload);
    validateMetadataUpdateSize(metadataString);

    const encryptedData = await encryptData(metadataString, encryptionKey);
    const encryptedPayload = JSON.stringify(encryptedData);

    const newVersion = currentVersion + 1;

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "Metadata-Update" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Owner", value: await hashUsername(username) },
      { name: "File-Id", value: fileId },
      { name: "Change-Type", value: changeType },
      { name: "Encrypted", value: "true" },
      { name: "Created-At", value: formatISO(new Date()) },
      { name: "File-Version", value: String(newVersion) },
      { name: "Parent-File-Id", value: fileId },
    ];

    if (isLocked !== undefined) {
      tags.push({ name: "Is-Locked", value: String(isLocked) });
    }

    if (lockExpiry) {
      tags.push({ name: "Lock-Expiry", value: lockExpiry });
    }

    if (metadata["Is-Bookmarked"] !== undefined) {
      tags.push({ name: "Is-Bookmarked", value: metadata["Is-Bookmarked"] });
    }

    if (metadata["Color-Tag"] !== undefined) {
      tags.push({ name: "Color-Tag", value: metadata["Color-Tag"] });
    }

    if (metadata["Is-Pinned"] !== undefined) {
      tags.push({ name: "Is-Pinned", value: metadata["Is-Pinned"] });
    }

    if (newName) {
      // Removed plaintext New-Name tag
      try {
        const encryptedNewName = await encryptData(newName, encryptionKey);
        tags.push({
          name: "Encrypted-New-Name",
          value: JSON.stringify(encryptedNewName),
        });
      } catch {}
    }

    if (oldName) {
      // Removed plaintext Original-Name tag
    }

    const dataBuffer = new TextEncoder().encode(encryptedPayload);

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";

    const uploadResponse = await fetch(`${apiUrl}/api/turbo/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: Buffer.from(dataBuffer).toString("base64"),
        tags,
      }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    const uploadResult: UploadResult = {
      dataItemId: result.dataItemId,
      status: "pending",
      timestamp: Date.now(),
      uploadResult: {
        id: result.dataItemId,
        owner: "",
        dataCaches: [],
        fastFinalityIndexes: [],
        timestamp: Date.now(),
      } as unknown as TurboUploadResult,
      fileVersion: newVersion,
      parentFileId: fileId,
    };

    if (onSuccess) {
      onSuccess(uploadResult);
    }

    return uploadResult;
  } catch (error) {
    console.error("Metadata update failed:", {
      error,
      fileId,
      changeType,
      username,
      timestamp: formatISO(new Date()),
    });

    if (error instanceof MetadataSizeExceededError) {
      throw error;
    }

    if (error instanceof TurboNetworkError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new TurboNetworkError(
          "Metadata update timeout. Please try again.",
        );
      }

      if (error.message.includes("insufficient")) {
        throw new UploadError(
          "Insufficient credits for metadata update. Please contact support.",
          "INSUFFICIENT_CREDITS",
        );
      }

      throw new UploadError(
        `Failed to upload metadata update: ${error.message}`,
        "METADATA_UPDATE_ERROR",
      );
    }

    throw new UploadError(
      "Unknown error during metadata update",
      "UNKNOWN_ERROR",
    );
  }
};

export const markFileAsDeleted = async (
  deletionMetadata: DeletionMetadata,
  encryptionKey: string,
  username: string,
  onSuccess?: UploadSuccessCallback,
): Promise<UploadResult> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();

    const metadataString = JSON.stringify(deletionMetadata);
    validateMetadataUpdateSize(metadataString);

    const encryptedData = await encryptData(metadataString, encryptionKey);
    const encryptedPayload = JSON.stringify(encryptedData);

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "Deletion-Marker" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Owner", value: await hashUsername(username) },
      { name: "Item-Id", value: deletionMetadata.itemId },
      { name: "Item-Name", value: deletionMetadata.itemName },
      { name: "Item-Type", value: deletionMetadata.itemType },
      { name: "Deleted-At", value: deletionMetadata.deletedAt },
      { name: "Deleted-By", value: deletionMetadata.deletedBy },
      { name: "Encrypted", value: "true" },
      { name: "Is-Deleted", value: "true" },
      { name: "File-Version", value: String(deletionMetadata.fileVersion) },
    ];

    if (deletionMetadata.parentFileId) {
      tags.push({
        name: "Parent-File-Id",
        value: deletionMetadata.parentFileId,
      });
    }

    if (deletionMetadata.parentId) {
      tags.push({ name: "Parent-Folder", value: deletionMetadata.parentId });
    }

    const dataBuffer = new TextEncoder().encode(encryptedPayload);

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";

    const uploadResponse = await fetch(`${apiUrl}/api/turbo/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: Buffer.from(dataBuffer).toString("base64"),
        tags,
      }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    const uploadResult: UploadResult = {
      dataItemId: result.dataItemId,
      status: "pending",
      timestamp: Date.now(),
      uploadResult: {
        id: result.dataItemId,
        owner: "",
        dataCaches: [],
        fastFinalityIndexes: [],
        timestamp: Date.now(),
      } as unknown as TurboUploadResult,
      fileVersion: deletionMetadata.fileVersion + 1,
      parentFileId: deletionMetadata.parentFileId,
    };

    if (onSuccess) {
      onSuccess(uploadResult);
    }

    return uploadResult;
  } catch (error) {
    console.error("Deletion marker upload failed:", {
      error,
      itemId: deletionMetadata.itemId,
      username,
      timestamp: formatISO(new Date()),
    });

    if (error instanceof MetadataSizeExceededError) {
      throw error;
    }

    if (error instanceof TurboNetworkError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new TurboNetworkError(
          "Deletion marker upload timeout. Please try again.",
        );
      }

      if (error.message.includes("insufficient")) {
        throw new UploadError(
          "Insufficient credits for deletion. Please contact support.",
          "INSUFFICIENT_CREDITS",
        );
      }

      throw new UploadError(
        `Failed to upload deletion marker: ${error.message}`,
        "DELETION_ERROR",
      );
    }

    throw new UploadError(
      "Unknown error during deletion marker upload",
      "UNKNOWN_ERROR",
    );
  }
};

export const uploadFolderMetadata = async (
  options: FolderUploadOptions,
  onSuccess?: UploadSuccessCallback,
): Promise<UploadResult> => {
  const {
    folderMetadata,
    encryptionKey,
    username,
    isUpdate = false,
    originalFolderId,
    currentVersion = 0,
    isLocked,
    lockExpiry,
  } = options;

  try {
    validateFolderMetadataSize(folderMetadata);

    const masterWalletAddress = await getMasterWalletAddress();

    const metadataString = JSON.stringify(folderMetadata);
    const encryptedData = await encryptData(metadataString, encryptionKey);
    const encryptedPayload = JSON.stringify(encryptedData);

    const newVersion = isUpdate ? currentVersion + 1 : 1;
    const parentId = isUpdate ? originalFolderId || "" : "";

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "Folder-Metadata" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Owner", value: await hashUsername(username) },
      // Removed plaintext Folder-Name tag
      {
        name: "Encrypted-Name",
        value: JSON.stringify(
          await encryptData(folderMetadata.folderName, encryptionKey),
        ),
      },
      { name: "Folder-Path", value: folderMetadata.folderPath },
      { name: "Encrypted", value: "true" },
      { name: "Created-At", value: folderMetadata.createdAt },
      { name: "File-Version", value: String(newVersion) },
      { name: "Is-Update", value: String(isUpdate) },
      { name: "Is-Deleted", value: String(folderMetadata.isDeleted || false) },
    ];

    if (isLocked !== undefined) {
      tags.push({ name: "Is-Locked", value: String(isLocked) });
    }

    if (lockExpiry) {
      tags.push({ name: "Lock-Expiry", value: lockExpiry });
    }

    if (parentId) {
      tags.push({ name: "Parent-Folder-Id", value: parentId });
    }

    if (folderMetadata.parentId) {
      tags.push({ name: "Parent-Folder", value: folderMetadata.parentId });
    }

    if (folderMetadata.isDeleted && folderMetadata.deletedAt) {
      tags.push({ name: "Deleted-At", value: folderMetadata.deletedAt });
    }

    const dataBuffer = new TextEncoder().encode(encryptedPayload);

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";

    const uploadResponse = await fetch(`${apiUrl}/api/turbo/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: Buffer.from(dataBuffer).toString("base64"),
        tags,
      }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    const uploadResult: UploadResult = {
      dataItemId: result.dataItemId,
      status: "pending",
      timestamp: Date.now(),
      uploadResult: {
        id: result.dataItemId,
        owner: "",
        dataCaches: [],
        fastFinalityIndexes: [],
        timestamp: Date.now(),
      } as unknown as TurboUploadResult,
      fileVersion: newVersion,
      parentFileId: parentId || undefined,
      tempId: folderMetadata.folderId,
    };

    if (onSuccess) {
      onSuccess(uploadResult);
    }

    return uploadResult;
  } catch (error) {
    console.error("Folder upload failed:", {
      error,
      folderName: folderMetadata.folderName,
      username,
      timestamp: formatISO(new Date()),
    });

    if (error instanceof FolderSizeExceededError) {
      throw error;
    }

    if (error instanceof TurboNetworkError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new TurboNetworkError("Folder upload timeout. Please try again.");
      }

      if (error.message.includes("insufficient")) {
        throw new UploadError(
          "Insufficient credits for folder upload. Please contact support.",
          "INSUFFICIENT_CREDITS",
        );
      }

      throw new UploadError(
        `Failed to upload folder: ${error.message}`,
        "FOLDER_UPLOAD_ERROR",
      );
    }

    throw new UploadError(
      "Unknown error during folder upload",
      "UNKNOWN_ERROR",
    );
  }
};

export const uploadEncryptedFile = async (
  options: UploadOptions,
  onSuccess?: UploadSuccessCallback,
): Promise<UploadResult> => {
  const {
    content,
    encryptionKey,
    username,
    fileName,
    fileType,
    metadata,
    isUpdate = false,
    originalFileId,
    currentVersion = 0,
    parentFolderId,
    isLocked,
    lockExpiry,
  } = options;

  try {
    validateFileSize(content);

    const masterWalletAddress = await getMasterWalletAddress();

    const encryptedData = await encryptData(content, encryptionKey);
    const encryptedPayload = JSON.stringify(encryptedData);

    const newVersion = isUpdate ? currentVersion + 1 : 1;
    const parentId = isUpdate ? originalFileId || "" : "";

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "File-Data" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Owner", value: await hashUsername(username) },
      // Removed plaintext File-Name tag
      {
        name: "Encrypted-Name",
        value: JSON.stringify(await encryptData(fileName, encryptionKey)),
      },
      { name: "Encrypted", value: "true" },
      { name: "Created-At", value: formatISO(new Date()) },
      { name: "File-Version", value: String(newVersion) },
      { name: "Is-Update", value: String(isUpdate) },
    ];

    if (isLocked !== undefined) {
      tags.push({ name: "Is-Locked", value: String(isLocked) });
    }

    if (lockExpiry) {
      tags.push({ name: "Lock-Expiry", value: lockExpiry });
    }

    if (parentId) {
      tags.push({ name: "Parent-File-Id", value: parentId });
    }

    if (parentFolderId) {
      tags.push({ name: "Parent-Folder", value: parentFolderId });
    }

    if (fileType) {
      tags.push({ name: "File-Type", value: fileType });
    }

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        tags.push({ name: key, value });
      });
    }

    const dataBuffer = new TextEncoder().encode(encryptedPayload);

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";

    const uploadResponse = await fetch(`${apiUrl}/api/turbo/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: Buffer.from(dataBuffer).toString("base64"),
        tags,
      }),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    const uploadResult: UploadResult = {
      dataItemId: result.dataItemId,
      status: "pending",
      timestamp: Date.now(),
      uploadResult: {
        id: result.dataItemId,
        owner: "",
        dataCaches: [],
        fastFinalityIndexes: [],
        timestamp: Date.now(),
      } as unknown as TurboUploadResult,
      fileVersion: newVersion,
      parentFileId: parentId || undefined,
    };

    if (onSuccess) {
      onSuccess(uploadResult);
    }

    return uploadResult;
  } catch (error) {
    if (error instanceof FileSizeExceededError) {
      throw error;
    }

    if (error instanceof TurboNetworkError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new TurboNetworkError("Upload timeout. Please try again.");
      }

      if (error.message.includes("insufficient")) {
        throw new UploadError(
          "Insufficient credits for upload. Please contact support.",
          "INSUFFICIENT_CREDITS",
        );
      }

      throw new UploadError(
        `Failed to upload file: ${error.message}`,
        "UPLOAD_ERROR",
      );
    }

    throw new UploadError("Unknown error during file upload", "UNKNOWN_ERROR");
  }
};

export const getDataItemStatus = async (
  dataItemId: string,
): Promise<{
  status: string;
  confirmed: boolean;
}> => {
  try {
    const response = await fetch(`https://arweave.net/${dataItemId}/status`);

    if (!response.ok) {
      return {
        status: "pending",
        confirmed: false,
      };
    }

    const data = (await response.json()) as { status: string };

    return {
      status: data.status || "pending",
      confirmed: data.status === "confirmed",
    };
  } catch {
    return {
      status: "unknown",
      confirmed: false,
    };
  }
};

export const waitForConfirmation = async (
  dataItemId: string,
  maxAttempts = 30,
  interval = 10000,
): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await getDataItemStatus(dataItemId);
      if (status.confirmed) {
        return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
};
