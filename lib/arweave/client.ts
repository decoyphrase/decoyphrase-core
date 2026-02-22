import type {
  JWKInterface,
  TurboBalanceInfo,
  TurboTag,
  TransactionStatus,
} from "../types";
import {
  POLLING_INTERVAL_INITIAL_MS,
  POLLING_INTERVAL_MAX_MS,
  MAX_POLLING_ATTEMPTS,
  CACHE_TTL_MS,
  ONE_SECOND_MS,
} from "../constants";
import { differenceInMilliseconds, getTime } from "date-fns";

const queryCache: Map<string, { data: unknown; timestamp: number }> = new Map();

export class TurboNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurboNetworkError";
  }
}

export class TurboQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurboQueryError";
  }
}

export class TurboConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurboConfigError";
  }
}

export class TurboWalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurboWalletError";
  }
}

const REQUIRED_JWK_FIELDS: (keyof JWKInterface)[] = [
  "kty",
  "e",
  "n",
  "d",
  "p",
  "q",
  "dp",
  "dq",
  "qi",
];

export const validateJWK = (
  jwk: JWKInterface,
): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  for (const field of REQUIRED_JWK_FIELDS) {
    if (!jwk[field] || jwk[field] === "") {
      missing.push(field);
    }
  }

  if (jwk.kty !== "RSA") {
    missing.push("kty must be RSA");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const initializeMasterWallet = (_jwk: JWKInterface): void => {
  // Deprecated client-side
};

export const getMasterWalletJWK = (): JWKInterface => {
  throw new TurboConfigError(
    "Master wallet JWK is only accessible on the server",
  );
};

export const getTurboClient = () => {
  throw new TurboConfigError("Turbo client is only accessible on the server");
};

export const checkTurboConnection = async (): Promise<boolean> => {
  try {
    const res = await fetch(
      "https://decoyphrase-backend.vercel.app/api/turbo/balance",
      {
        headers: {
          Authorization:
            "Bearer nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==",
        },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
};

export const getMasterWalletAddress = async (): Promise<string> => {
  const addr = "xDvJOjfTGLW74jS5Khct1pa_hhc_FiF63rZeFC7IH8Q";
  if (!addr) {
    throw new Error("Master wallet address not configured");
  }
  return addr;
};

export const getTurboBalance = async (): Promise<TurboBalanceInfo> => {
  try {
    const res = await fetch(
      "https://decoyphrase-backend.vercel.app/api/turbo/balance",
      {
        headers: {
          Authorization:
            "Bearer nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch balance: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      winc: data.winc,
    };
  } catch (err: unknown) {
    throw new TurboNetworkError(
      `Failed to fetch balance: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

interface QueryByTagsOptions {
  tags: TurboTag[];
  limit?: number;
  owner?: string;
  after?: string;
}

export interface GQLEdgeNode {
  id: string;
  cursor: string;
  tags: Array<{ name: string; value: string }>;
  owner?: {
    address: string;
  };
  block?: {
    height: number;
    timestamp: number;
  };
  data: {
    size: string;
  };
}

export const queryByTags = async (
  options: QueryByTagsOptions,
): Promise<GQLEdgeNode[]> => {
  const cacheKey = JSON.stringify(options);
  const cached = queryCache.get(cacheKey);

  if (cached && getTime(new Date()) - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as GQLEdgeNode[];
  }

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const Arweave = (await import("arweave")).default;
      const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
        timeout: 10000, // 10s timeout
      });

      const tagsQuery = options.tags
        .map((tag) => `{ name: "${tag.name}", values: ["${tag.value}"] }`)
        .join("\n            ");

      const ownerFilter = options.owner ? `owners: ["${options.owner}"]` : "";
      const afterFilter = options.after ? `after: "${options.after}"` : "";

      const query = `
        query {
          transactions(
            tags: [
              ${tagsQuery}
            ]
            ${ownerFilter}
            ${afterFilter}
            first: ${options.limit || 100}
            sort: HEIGHT_DESC
          ) {
            edges {
              cursor
              node {
                id
                tags {
                  name
                  value
                }
                owner {
                  address
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }
      `;

      const response = await arweave.api.post("/graphql", { query });

      if (!response?.data?.data?.transactions?.edges) {
        throw new TurboQueryError("Invalid response structure from Arweave");
      }

      const result = response.data.data.transactions.edges.map(
        (edge: { cursor: string; node: Omit<GQLEdgeNode, "cursor"> }) => ({
          ...edge.node,
          cursor: edge.cursor,
        }),
      );

      queryCache.set(cacheKey, {
        data: result,
        timestamp: getTime(new Date()),
      });

      return result;
    } catch (error) {
      console.warn(`Arweave query attempt ${attempt + 1} failed:`, error);
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, ONE_SECOND_MS * (attempt + 1)),
        ); // 1s, 2s, 3s backoff
      }
    }
  }

  throw new TurboQueryError(
    `Failed to query Arweave GraphQL after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
};

export const clearQueryCache = (): void => {
  queryCache.clear();
};

export const checkTransactionStatus = async (
  txId: string,
): Promise<TransactionStatus> => {
  try {
    const response = await fetch(`https://arweave.net/${txId}/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        id: txId,
        status: "pending",
        confirmationProgress: 0,
        lastChecked: getTime(new Date()),
      };
    }

    const data = (await response.json()) as {
      confirmed?: {
        number_of_confirmations?: number;
      };
    };

    const confirmations = data?.confirmed?.number_of_confirmations || 0;
    const isConfirmed = confirmations >= 25;

    return {
      id: txId,
      status: isConfirmed ? "confirmed" : "pending",
      confirmationProgress: isConfirmed
        ? 100
        : Math.min((confirmations / 25) * 100, 95),
      lastChecked: getTime(new Date()),
    };
  } catch (error) {
    console.warn(
      "Check transaction status failed (retrying):",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      id: txId,
      status: "pending",
      confirmationProgress: 0,
      lastChecked: getTime(new Date()),
    };
  }
};

interface PollingOptions {
  maxAttempts?: number;
  initialInterval?: number;
  maxInterval?: number;
  onProgress?: (attempt: number, progress: number) => void;
}

export const pollForTransaction = async (
  txId: string,
  options: PollingOptions = {},
): Promise<boolean> => {
  const {
    maxAttempts = MAX_POLLING_ATTEMPTS,
    initialInterval = POLLING_INTERVAL_INITIAL_MS,
    maxInterval = POLLING_INTERVAL_MAX_MS,
    onProgress,
  } = options;

  let interval = initialInterval;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await checkTransactionStatus(txId);

      const progress = Math.min(status.confirmationProgress, 100);

      if (onProgress) {
        onProgress(attempt + 1, progress);
      }

      if (
        status.status === "confirmed" &&
        status.confirmationProgress === 100
      ) {
        const verifyResponse = await fetch(`https://arweave.net/${txId}`, {
          method: "HEAD",
        });

        if (verifyResponse.ok) {
          return true;
        }
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        interval = Math.min(interval * 1.5, maxInterval);
      }
    } catch {
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        interval = Math.min(interval * 1.5, maxInterval);
      }
    }
  }

  return false;
};

export const getFileByDataItemId = async (
  dataItemId: string,
): Promise<string | null> => {
  try {
    const response = await fetch(`https://arweave.net/${dataItemId}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.text();
    return data;
  } catch {
    return null;
  }
};

export const waitForIndexing = async (
  dataItemId: string,
  maxWaitMs: number = 300000,
): Promise<boolean> => {
  const startTime = getTime(new Date());
  const pollInterval = 15000;

  while (differenceInMilliseconds(getTime(new Date()), startTime) < maxWaitMs) {
    try {
      const data = await getFileByDataItemId(dataItemId);
      if (data) {
        return true;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false;
};

export const queryFolderHierarchy = async (
  username: string,
): Promise<Map<string, string[]>> => {
  const cacheKey = `folder_hierarchy_${username}`;
  const cached = queryCache.get(cacheKey);

  if (cached && getTime(new Date()) - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as Map<string, string[]>;
  }

  try {
    const masterWalletAddress = await getMasterWalletAddress();

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "Data-Type", value: "Folder-Metadata" },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Owner", value: username },
    ];

    const results = await queryByTags({
      tags,
      limit: 100,
      owner: masterWalletAddress,
    });

    const hierarchy = new Map<string, string[]>();

    results.forEach((node) => {
      const tags: Record<string, string> = {};
      node.tags.forEach((tag) => {
        tags[tag.name] = tag.value;
      });

      const folderId = node.id;
      const parentId = tags["Parent-Folder"] || "root";

      if (!hierarchy.has(parentId)) {
        hierarchy.set(parentId, []);
      }
      hierarchy.get(parentId)!.push(folderId);
    });

    queryCache.set(cacheKey, {
      data: hierarchy,
      timestamp: getTime(new Date()),
    });

    return hierarchy;
  } catch {
    return new Map();
  }
};
