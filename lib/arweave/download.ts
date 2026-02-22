import {
  getMasterWalletAddress,
  TurboNetworkError,
  TurboQueryError,
  queryByTags,
  GQLEdgeNode,
} from "./client";
import { formatISO, parseISO, toDate, isAfter } from "date-fns";
import { decryptData, deriveUserEncryptionKey } from "../crypto/encryption";
import { hashUsername } from "../utils";
import type {
  TurboFileMetadata,
  EncryptedData,
  UserRegistry,
  TurboTag,
  FolderMetadata,
  MultiPasswordConfig,
  PasswordSlot,
  FileItem,
} from "../types";
import { isFolderMetadata } from "../types";
import { downloadFile } from "../utils";

// Helper to fetch all pages
const fetchAllByTags = async (
  tags: TurboTag[],
  owner: string,
  limit: number = 100,
): Promise<GQLEdgeNode[]> => {
  let allResults: GQLEdgeNode[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const results = await queryByTags({
      tags,
      limit,
      owner,
      after: cursor,
    });

    if (results.length > 0) {
      allResults = [...allResults, ...results];
      cursor = results[results.length - 1].cursor;

      // If we got fewer results than limit, we're done
      if (results.length < limit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allResults;
};

export const downloadFileWithPassword = async (
  file: FileItem,
  username: string,
  password?: string,
): Promise<string> => {
  if (file.content && !file.isLocked) {
    downloadFile(file.name, file.content);
    return file.content;
  }

  if (!file.turboDataItemId) {
    throw new Error("File not yet uploaded to Arweave");
  }

  if (!password) {
    throw new Error("Password is required to decrypt this file.");
  }

  try {
    const encryptionKey = await deriveUserEncryptionKey(username, password);
    const decryptedContent = await downloadEncryptedFile(
      file.turboDataItemId,
      encryptionKey,
    );
    downloadFile(file.name, decryptedContent);
    return decryptedContent;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to download file.",
    );
  }
};

export const queryFilesByOwner = async (
  username: string,
): Promise<GQLEdgeNode[]> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();
    const hashedUsername = await hashUsername(username);

    const baseTags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "File-Data" },
      { name: "Master-Wallet", value: masterWalletAddress },
    ];

    const [plainResults, hashedResults] = await Promise.all([
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: username }],
        masterWalletAddress,
      ),
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: hashedUsername }],
        masterWalletAddress,
      ),
    ]);

    return [...plainResults, ...hashedResults];
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }
    console.error("Query files failed:", error);
    throw new TurboQueryError("Failed to query files from Arweave");
  }
};

export const queryFoldersByOwner = async (
  username: string,
): Promise<GQLEdgeNode[]> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();
    const hashedUsername = await hashUsername(username);

    const baseTags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "Folder-Metadata" },
      { name: "Master-Wallet", value: masterWalletAddress },
    ];

    const [plainResults, hashedResults] = await Promise.all([
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: username }],
        masterWalletAddress,
      ),
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: hashedUsername }],
        masterWalletAddress,
      ),
    ]);

    return [...plainResults, ...hashedResults];
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }

    throw new TurboQueryError("Failed to query folders from Arweave");
  }
};

export const queryDeletionMarkers = async (
  username: string,
): Promise<GQLEdgeNode[]> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();
    const hashedUsername = await hashUsername(username);

    const baseTags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "Deletion-Marker" },
      { name: "Master-Wallet", value: masterWalletAddress },
    ];

    const [plainResults, hashedResults] = await Promise.all([
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: username }],
        masterWalletAddress,
      ),
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: hashedUsername }],
        masterWalletAddress,
      ),
    ]);

    return [...plainResults, ...hashedResults];
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }

    throw new TurboQueryError("Failed to query deletion markers from Arweave");
  }
};

export const queryMetadataUpdates = async (
  username: string,
): Promise<GQLEdgeNode[]> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();
    const hashedUsername = await hashUsername(username);

    const baseTags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "Metadata-Update" },
      { name: "Master-Wallet", value: masterWalletAddress },
    ];

    const [plainResults, hashedResults] = await Promise.all([
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: username }],
        masterWalletAddress,
      ),
      fetchAllByTags(
        [...baseTags, { name: "Owner", value: hashedUsername }],
        masterWalletAddress,
      ),
    ]);

    return [...plainResults, ...hashedResults];
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }

    throw new TurboQueryError("Failed to query metadata updates from Arweave");
  }
};

export const queryAllItemsByOwner = async (
  username: string,
): Promise<{ files: GQLEdgeNode[]; deletedItemIds: Set<string> }> => {
  try {
    const [files, folders, deletionMarkers, metadataUpdates] =
      await Promise.all([
        queryFilesByOwner(username),
        queryFoldersByOwner(username),
        queryDeletionMarkers(username),
        queryMetadataUpdates(username),
      ]);

    const deletedItemIds = new Set<string>();
    deletionMarkers.forEach((marker) => {
      const tags: Record<string, string> = {};
      marker.tags.forEach((tag) => {
        tags[tag.name] = tag.value;
      });
      const itemId = tags["Item-Id"];
      if (itemId) {
        deletedItemIds.add(itemId);
      }
    });

    const metadataChanges = new Map<string, GQLEdgeNode>();
    metadataUpdates.forEach((update) => {
      const tags: Record<string, string> = {};
      update.tags.forEach((tag) => {
        tags[tag.name] = tag.value;
      });
      const fileId = tags["File-Id"];
      if (!fileId) return;

      const existingUpdate = metadataChanges.get(fileId);
      if (!existingUpdate) {
        metadataChanges.set(fileId, update);
        return;
      }

      const existingTags: Record<string, string> = {};
      existingUpdate.tags.forEach((tag) => {
        existingTags[tag.name] = tag.value;
      });
      const existingVersion = parseInt(existingTags["File-Version"] || "0");
      const currentVersion = parseInt(tags["File-Version"] || "0");

      if (currentVersion > existingVersion) {
        metadataChanges.set(fileId, update);
      }
    });

    // FIX Issue 1: Include ALL files (including deleted) so they appear in Hidden Files
    // Mark files that are in deletedItemIds by adding Is-Deleted tag
    const allFilesWithDeletionStatus = files.map((file) => {
      const fileTags: Record<string, string> = {};
      file.tags.forEach((tag) => {
        fileTags[tag.name] = tag.value;
      });
      const parentFileId = fileTags["Parent-File-Id"] || file.id;
      const isDeletedByMarker =
        deletedItemIds.has(file.id) || deletedItemIds.has(parentFileId);

      if (isDeletedByMarker) {
        // Add Is-Deleted tag to the file
        const newTags = [...file.tags];
        const existingDeletedTag = newTags.find((t) => t.name === "Is-Deleted");
        if (!existingDeletedTag) {
          newTags.push({ name: "Is-Deleted", value: "true" });
        }
        return { ...file, tags: newTags };
      }
      return file;
    });

    // FIX Issue 1: Include ALL folders (including deleted) so they appear in Hidden Files
    const allFoldersWithDeletionStatus = folders.map((folder) => {
      const folderTags: Record<string, string> = {};
      folder.tags.forEach((tag) => {
        folderTags[tag.name] = tag.value;
      });
      const isDeletedByTag = folderTags["Is-Deleted"] === "true";
      const parentFolderId = folderTags["Parent-Folder-Id"] || folder.id;
      const isDeletedByMarker =
        deletedItemIds.has(folder.id) || deletedItemIds.has(parentFolderId);

      if (isDeletedByTag || isDeletedByMarker) {
        // Ensure Is-Deleted tag is set
        const newTags = [...folder.tags];
        const existingDeletedTag = newTags.find((t) => t.name === "Is-Deleted");
        if (!existingDeletedTag) {
          newTags.push({ name: "Is-Deleted", value: "true" });
        } else if (existingDeletedTag.value !== "true") {
          existingDeletedTag.value = "true";
        }
        return { ...folder, tags: newTags };
      }
      return folder;
    });

    const itemsWithMetadata = [
      ...allFilesWithDeletionStatus,
      ...allFoldersWithDeletionStatus,
    ].map((item) => {
      const itemTags: Record<string, string> = {};
      item.tags.forEach((tag) => {
        itemTags[tag.name] = tag.value;
      });

      const itemId = itemTags["Parent-File-Id"] || item.id;
      const metadataUpdate = metadataChanges.get(itemId);

      if (!metadataUpdate) return item;

      const updateTags: Record<string, string> = {};
      metadataUpdate.tags.forEach((tag) => {
        updateTags[tag.name] = tag.value;
      });

      const newName = updateTags["New-Name"];
      const encryptedNewName = updateTags["Encrypted-New-Name"];
      const isLocked = updateTags["Is-Locked"];
      const lockExpiry = updateTags["Lock-Expiry"];
      const isBookmarked = updateTags["Is-Bookmarked"];
      const isPinned = updateTags["Is-Pinned"];
      const colorTag = updateTags["Color-Tag"];
      const note = updateTags["Note"];
      const isDeleted = updateTags["Is-Deleted"];

      const currentTagMap = new Map(item.tags.map((t) => [t.name, t.value]));

      if (newName) {
        currentTagMap.set("File-Name", newName);
        if (currentTagMap.has("Folder-Name")) {
          currentTagMap.set("Folder-Name", newName);
        }
      }

      if (encryptedNewName) {
        currentTagMap.set("Encrypted-Name", encryptedNewName);
      }

      if (isLocked !== undefined) currentTagMap.set("Is-Locked", isLocked);
      if (lockExpiry !== undefined)
        currentTagMap.set("Lock-Expiry", lockExpiry);
      if (isBookmarked !== undefined)
        currentTagMap.set("Is-Bookmarked", isBookmarked);
      if (isPinned !== undefined) currentTagMap.set("Is-Pinned", isPinned);
      if (colorTag !== undefined) currentTagMap.set("Color-Tag", colorTag);
      if (note !== undefined) currentTagMap.set("Note", note);
      if (isDeleted !== undefined) currentTagMap.set("Is-Deleted", isDeleted);

      const updatedTags = Array.from(currentTagMap.entries()).map(
        ([name, value]) => ({ name, value }),
      );

      return {
        ...item,
        tags: updatedTags,
      };
    });

    return { files: itemsWithMetadata, deletedItemIds };
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }

    throw new TurboQueryError("Failed to query items from Arweave");
  }
};

export const queryUserByUsername = async (
  username: string,
): Promise<GQLEdgeNode | null> => {
  try {
    const masterWalletAddress = await getMasterWalletAddress();

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "User-Registry" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Username", value: username },
    ];

    const results = await queryByTags({
      tags,
      limit: 10,
      owner: masterWalletAddress,
    });

    if (!results || results.length === 0) {
      return null;
    }

    const latestResult = results.reduce((latest, current) => {
      const latestTags: Record<string, string> = {};
      latest.tags.forEach((tag) => {
        latestTags[tag.name] = tag.value;
      });

      const currentTags: Record<string, string> = {};
      current.tags.forEach((tag) => {
        currentTags[tag.name] = tag.value;
      });

      const latestDateStr =
        latestTags["Created-At"] || latestTags["Updated-At"];
      const currentDateStr =
        currentTags["Created-At"] || currentTags["Updated-At"];

      const latestDate = latestDateStr ? parseISO(latestDateStr) : toDate(0);
      const currentDate = currentDateStr ? parseISO(currentDateStr) : toDate(0);

      return isAfter(currentDate, latestDate) ? current : latest;
    });

    return latestResult;
  } catch (error) {
    if (error instanceof TurboQueryError) {
      throw error;
    }

    throw new TurboQueryError("Failed to query user from Arweave");
  }
};

export const getFileMetadata = (
  transaction: GQLEdgeNode,
): TurboFileMetadata => {
  const tags: Record<string, string> = {};
  transaction.tags.forEach((tag) => {
    tags[tag.name] = tag.value;
  });

  const dataType = tags["Data-Type"] as
    | "File-Data"
    | "Folder-Metadata"
    | undefined;

  return {
    dataItemId: transaction.id,
    fileName: tags["File-Name"] || tags["Folder-Name"],
    encryptedName: tags["Encrypted-Name"],
    fileType: tags["File-Type"],
    dataType,
    createdAt: tags["Created-At"] || formatISO(new Date()),
    walletAddress: tags["Master-Wallet"] || "",
    owner: tags["Owner"],
    isLocked: tags["Is-Locked"] === "true",
    lockExpiry: tags["Lock-Expiry"],
    isBookmarked: tags["Is-Bookmarked"] === "true",
    isPinned: tags["Is-Pinned"] === "true",
    colorTag: tags["Color-Tag"],
    note: tags["Note"],
    isMapping: tags["Is-Mapping"] === "true",
    fileVersion: tags["File-Version"] ? parseInt(tags["File-Version"]) : 1,
    parentFileId: tags["Parent-File-Id"] || tags["Parent-Folder-Id"],
    previousVersionId: tags["Previous-Version-Id"],
    folderPath: tags["Folder-Path"],
    parentFolderId: tags["Parent-Folder"],
    isDeleted: tags["Is-Deleted"] === "true",
    deletedAt: tags["Deleted-At"],
    size: transaction.data?.size,
  };
};

export const getUserRegistryMetadata = (
  transaction: GQLEdgeNode,
): { username: string; createdAt: string; dataItemId: string } => {
  const tags: Record<string, string> = {};
  transaction.tags.forEach((tag) => {
    tags[tag.name] = tag.value;
  });

  return {
    dataItemId: transaction.id,
    username: tags["Username"] || "",
    createdAt: tags["Created-At"] || formatISO(new Date()),
  };
};

export const downloadEncryptedFile = async (
  dataItemId: string,
  encryptionKey: string,
): Promise<string> => {
  try {
    const response = await fetch(`https://arweave.net/${dataItemId}`);

    if (!response.ok) {
      throw new TurboNetworkError(
        `Failed to fetch data item: ${response.statusText}`,
      );
    }

    const data = await response.text();

    if (!data) {
      throw new TurboNetworkError("No data received from Arweave");
    }

    const encryptedData = JSON.parse(data) as EncryptedData;
    const decryptedContent = await decryptData(encryptedData, encryptionKey);

    return decryptedContent;
  } catch (error) {
    if (error instanceof TurboNetworkError) {
      throw error;
    }

    throw new TurboQueryError("Failed to download and decrypt file");
  }
};

export const downloadFolderMetadata = async (
  dataItemId: string,
  encryptionKey: string,
): Promise<FolderMetadata> => {
  try {
    const response = await fetch(`https://arweave.net/${dataItemId}`);

    if (!response.ok) {
      throw new TurboNetworkError(
        `Failed to fetch data item: ${response.statusText}`,
      );
    }

    const data = await response.text();

    if (!data) {
      throw new TurboNetworkError("No data received from Arweave");
    }

    const encryptedData = JSON.parse(data) as EncryptedData;
    const decryptedContent = await decryptData(encryptedData, encryptionKey);
    const metadata = JSON.parse(decryptedContent) as unknown;

    if (!isFolderMetadata(metadata)) {
      throw new TurboQueryError("Invalid folder metadata format");
    }

    return metadata;
  } catch (error) {
    if (error instanceof TurboNetworkError) {
      throw error;
    }

    throw new TurboQueryError("Failed to download and decrypt folder metadata");
  }
};

export const downloadUserRegistry = async (
  dataItemId: string,
): Promise<UserRegistry> => {
  try {
    const response = await fetch(`https://arweave.net/${dataItemId}`);

    if (!response.ok) {
      throw new TurboNetworkError(
        `Failed to fetch data item: ${response.statusText}`,
      );
    }

    const data = await response.text();

    if (!data) {
      throw new TurboNetworkError("No data received from Arweave");
    }

    const registryData = JSON.parse(data) as
      | {
          username: string;
          passwords: MultiPasswordConfig;
          activeSlots: PasswordSlot[];
          createdAt: string;
        }
      | {
          username: string;
          encryptedData: EncryptedData;
          createdAt: string;
        };

    if ("passwords" in registryData) {
      return {
        username: registryData.username,
        passwords: registryData.passwords,
        activeSlots: registryData.activeSlots,
        createdAt: registryData.createdAt,
        lastLogin: formatISO(new Date()),
      };
    }

    return {
      username: registryData.username,
      passwords: {
        primary: registryData.encryptedData,
      },
      activeSlots: ["primary"],
      createdAt: registryData.createdAt,
      lastLogin: formatISO(new Date()),
    };
  } catch (error) {
    if (error instanceof TurboNetworkError) {
      throw error;
    }

    throw new TurboQueryError("Failed to download user registry from Arweave");
  }
};
