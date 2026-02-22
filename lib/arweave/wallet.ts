import {
  getMasterWalletAddress,
  TurboNetworkError,
  TurboQueryError,
  TurboWalletError,
} from "./client";
import {
  encryptData,
  decryptData,
  deriveUserEncryptionKey,
  verifyPasswordSlot,
} from "../crypto/encryption";
import { formatISO, add, isAfter, parseISO } from "date-fns";
import { millisecondsInMinute } from "date-fns/constants";
import { queryUserByUsername, downloadUserRegistry } from "./download";
import type {
  UserRegistry,
  TurboTag,
  PasswordSlot,
  MultiPasswordConfig,
} from "../types";
import { MAX_PASSWORD_SLOTS } from "../constants";

const SESSION_STORAGE_KEY = "decoy_session";
const PENDING_USER_PREFIX = "decoy_pending_user_";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPasswordError";
  }
}

export class TransactionSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionSigningError";
  }
}

export const registerUser = async (
  username: string,
  passwords: { primary: string; secondary?: string; tertiary?: string },
): Promise<void> => {
  try {
    const existingUser = await queryUserByUsername(username);
    if (existingUser) {
      throw new AuthenticationError(
        "Username already exists. Please choose a different username.",
      );
    }

    const primaryKey = await deriveUserEncryptionKey(
      username,
      passwords.primary,
    );

    const userData = {
      username,
      createdAt: formatISO(new Date()),
      passwordSlots: ["primary"] as PasswordSlot[],
    };

    if (passwords.secondary) {
      userData.passwordSlots.push("secondary");
    }

    if (passwords.tertiary) {
      userData.passwordSlots.push("tertiary");
    }

    const encryptedUserData = await encryptData(
      JSON.stringify(userData),
      primaryKey,
    );

    const passwordConfig: MultiPasswordConfig = {
      primary: encryptedUserData,
    };

    if (passwords.secondary) {
      const secondaryKey = await deriveUserEncryptionKey(
        username,
        passwords.secondary,
      );
      passwordConfig.secondary = await encryptData(
        JSON.stringify(userData),
        secondaryKey,
      );
    }

    if (passwords.tertiary) {
      const tertiaryKey = await deriveUserEncryptionKey(
        username,
        passwords.tertiary,
      );
      passwordConfig.tertiary = await encryptData(
        JSON.stringify(userData),
        tertiaryKey,
      );
    }

    const userRegistry: UserRegistry = {
      username,
      passwords: passwordConfig,
      activeSlots: userData.passwordSlots,
      createdAt: formatISO(new Date()),
      lastLogin: formatISO(new Date()),
    };

    const pendingKey = `${PENDING_USER_PREFIX}${username}`;
    localStorage.setItem(pendingKey, JSON.stringify(userRegistry));

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";

    const uploadResponse = await fetch(
      `${apiUrl}/api/turbo/wallet/initialize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          username,
          publicKey: "stub-public-key-for-registration-if-needed",
          // This is where you would normally send the actual public key
          // But since we are moving the wallet handling to the backend,
          // The backend `initialize` route will handle emitting the initial transaction.
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!uploadResponse.ok) {
      throw new Error("Backend initialization failed");
    }

    setTimeout(() => {
      localStorage.removeItem(pendingKey);
    }, 10 * millisecondsInMinute);
  } catch (error) {
    if (error instanceof TurboNetworkError) {
      throw new TurboNetworkError(
        "Unable to connect to Turbo network. Please check your internet connection and try again.",
      );
    }

    if (
      error instanceof AuthenticationError ||
      error instanceof TurboWalletError ||
      error instanceof TransactionSigningError
    ) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new TurboNetworkError("Registration timeout. Please try again.");
      }
    }

    throw new AuthenticationError("Failed to register user. Please try again.");
  }
};

export const loginUser = async (
  username: string,
  password: string,
): Promise<{ slot: PasswordSlot; registry: UserRegistry }> => {
  try {
    const pendingKey = `${PENDING_USER_PREFIX}${username}`;
    const pendingData = localStorage.getItem(pendingKey);

    let userRegistry: UserRegistry | null = null;

    if (pendingData) {
      try {
        userRegistry = JSON.parse(pendingData) as UserRegistry;
      } catch {
        localStorage.removeItem(pendingKey);
      }
    }

    if (!userRegistry) {
      try {
        const userTransaction = await queryUserByUsername(username);

        if (!userTransaction) {
          throw new UserNotFoundError(
            "Username not found. Please register first or wait for blockchain confirmation if you just registered.",
          );
        }

        userRegistry = await downloadUserRegistry(userTransaction.id);
      } catch (error) {
        if (error instanceof TurboNetworkError) {
          throw new TurboNetworkError(
            "Unable to connect to Turbo network. Please check your internet connection and try again.",
          );
        }

        if (error instanceof TurboQueryError) {
          throw new TurboNetworkError(
            "Failed to query user data from Arweave. The network might be experiencing issues. Please try again.",
          );
        }

        if (error instanceof UserNotFoundError) {
          throw error;
        }

        throw new AuthenticationError(
          "Failed to retrieve user data. Please try again.",
        );
      }
    }

    if (!userRegistry) {
      throw new UserNotFoundError(
        "User data not available. Please try again later.",
      );
    }

    const slots: PasswordSlot[] = ["primary", "secondary", "tertiary"];
    let authenticatedSlot: PasswordSlot | null = null;

    for (const slot of slots) {
      const encryptedData = userRegistry.passwords[slot];
      if (!encryptedData) continue;

      try {
        const encryptionKey = await deriveUserEncryptionKey(username, password);
        await decryptData(encryptedData, encryptionKey);
        authenticatedSlot = slot;
        break;
      } catch {
        continue;
      }
    }

    if (!authenticatedSlot) {
      throw new InvalidPasswordError("Invalid password. Please try again.");
    }

    return { slot: authenticatedSlot, registry: userRegistry };
  } catch (error) {
    if (
      error instanceof TurboNetworkError ||
      error instanceof UserNotFoundError ||
      error instanceof InvalidPasswordError ||
      error instanceof AuthenticationError
    ) {
      throw error;
    }

    throw new AuthenticationError("Login failed. Please try again.");
  }
};

export const addPasswordSlot = async (
  username: string,
  currentPassword: string,
  newPassword: string,
  slot: PasswordSlot,
): Promise<void> => {
  try {
    const userRegistry = await getUserRegistry(username);
    if (!userRegistry) {
      throw new UserNotFoundError("User not found");
    }

    if (userRegistry.passwords[slot]) {
      throw new AuthenticationError("This password slot is already in use");
    }

    if (userRegistry.activeSlots.length >= MAX_PASSWORD_SLOTS) {
      throw new AuthenticationError(
        `Maximum ${MAX_PASSWORD_SLOTS} passwords allowed`,
      );
    }

    const currentKey = await deriveUserEncryptionKey(username, currentPassword);
    let isValid = false;
    let matchedSlot: PasswordSlot | null = null;

    for (const activeSlot of userRegistry.activeSlots) {
      const encryptedData = userRegistry.passwords[activeSlot];
      if (encryptedData) {
        isValid = await verifyPasswordSlot(
          username,
          currentPassword,
          encryptedData,
        );
        if (isValid) {
          matchedSlot = activeSlot;
          break;
        }
      }
    }

    if (!isValid || !matchedSlot) {
      throw new InvalidPasswordError("Current password is incorrect");
    }

    const slotData = userRegistry.passwords[matchedSlot];
    if (!slotData) {
      throw new Error("Critical error: Matched slot data missing");
    }

    const userData = await decryptData(slotData, currentKey);
    const parsedUserData = JSON.parse(userData);

    // Update internal slots record if not present
    if (
      parsedUserData.passwordSlots &&
      Array.isArray(parsedUserData.passwordSlots)
    ) {
      if (!parsedUserData.passwordSlots.includes(slot)) {
        parsedUserData.passwordSlots.push(slot);
      }
    } else {
      parsedUserData.passwordSlots = [...userRegistry.activeSlots, slot];
    }

    const newKey = await deriveUserEncryptionKey(username, newPassword);
    const newEncryptedData = await encryptData(
      JSON.stringify(parsedUserData),
      newKey,
    );

    const updatedPasswords = { ...userRegistry.passwords };
    updatedPasswords[slot] = newEncryptedData;

    const updatedRegistry: UserRegistry = {
      ...userRegistry,
      passwords: updatedPasswords,
      activeSlots: [...userRegistry.activeSlots, slot],
      lastLogin: formatISO(new Date()),
    };

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";
    const masterWalletAddress = await getMasterWalletAddress();

    const registryPayload = JSON.stringify({
      username,
      passwords: updatedPasswords,
      activeSlots: updatedRegistry.activeSlots,
      createdAt: updatedRegistry.createdAt,
    });

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "User-Registry" },
      { name: "Username", value: username },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Updated-At", value: updatedRegistry.lastLogin },
      { name: "Password-Slots", value: updatedRegistry.activeSlots.join(",") },
      { name: "Operation", value: "add-password" },
    ];

    const dataBuffer = new TextEncoder().encode(registryPayload);

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
      signal: AbortSignal.timeout(60000),
    });

    if (!uploadResponse.ok) {
      throw new Error("Backend upload failed for adding password slot");
    }
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof InvalidPasswordError ||
      error instanceof UserNotFoundError
    ) {
      throw error;
    }
    throw new AuthenticationError("Failed to add backup password");
  }
};

export const removePasswordSlot = async (
  username: string,
  currentPassword: string,
  slot: PasswordSlot,
): Promise<void> => {
  try {
    if (slot === "primary") {
      throw new AuthenticationError("Cannot remove primary password");
    }

    const userRegistry = await getUserRegistry(username);
    if (!userRegistry) {
      throw new UserNotFoundError("User not found");
    }

    if (!userRegistry.passwords[slot]) {
      throw new AuthenticationError("This password slot is empty");
    }

    if (userRegistry.activeSlots.length <= 1) {
      throw new AuthenticationError("Cannot remove the last active password");
    }

    let isValid = false;

    for (const activeSlot of userRegistry.activeSlots) {
      const encryptedData = userRegistry.passwords[activeSlot];
      if (encryptedData) {
        isValid = await verifyPasswordSlot(
          username,
          currentPassword,
          encryptedData,
        );
        if (isValid) break;
      }
    }

    if (!isValid) {
      throw new InvalidPasswordError("Current password is incorrect");
    }

    const updatedPasswords = { ...userRegistry.passwords };
    delete updatedPasswords[slot];

    const updatedRegistry: UserRegistry = {
      ...userRegistry,
      passwords: updatedPasswords,
      activeSlots: userRegistry.activeSlots.filter((s) => s !== slot),
      lastLogin: formatISO(new Date()),
    };

    const apiUrl = "https://decoyphrase-backend.vercel.app";
    const apiKey =
      "nH8LY4ceiP/MEEjhdRNDcKlFUR/jpWt5GNEcaoKOVuVnCQhLhCJNbegSnrB3ev5k1PJmV7PmS9IiqJfyj75nJQ==";
    const masterWalletAddress = await getMasterWalletAddress();

    const registryPayload = JSON.stringify({
      username,
      passwords: updatedPasswords,
      activeSlots: updatedRegistry.activeSlots,
      createdAt: updatedRegistry.createdAt,
    });

    const tags: TurboTag[] = [
      { name: "App-Name", value: "DecoyPhrase" },
      { name: "App-Version", value: "2.0.0" },
      { name: "Content-Type", value: "application/json" },
      { name: "Data-Type", value: "User-Registry" },
      { name: "Username", value: username },
      { name: "Master-Wallet", value: masterWalletAddress },
      { name: "Updated-At", value: updatedRegistry.lastLogin },
      { name: "Password-Slots", value: updatedRegistry.activeSlots.join(",") },
      { name: "Operation", value: "remove-password" },
    ];

    const dataBuffer = new TextEncoder().encode(registryPayload);

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
      signal: AbortSignal.timeout(60000),
    });

    if (!uploadResponse.ok) {
      throw new Error("Backend upload failed for removing password slot");
    }
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof InvalidPasswordError ||
      error instanceof UserNotFoundError
    ) {
      throw error;
    }
    throw new AuthenticationError("Failed to remove backup password");
  }
};

export const getUserRegistry = async (
  username: string,
): Promise<UserRegistry | null> => {
  try {
    const pendingKey = `${PENDING_USER_PREFIX}${username}`;
    const pendingData = localStorage.getItem(pendingKey);

    if (pendingData) {
      try {
        return JSON.parse(pendingData) as UserRegistry;
      } catch {
        localStorage.removeItem(pendingKey);
      }
    }

    const userTransaction = await queryUserByUsername(username);

    if (!userTransaction) {
      return null;
    }

    return await downloadUserRegistry(userTransaction.id);
  } catch {
    return null;
  }
};

export const saveSession = (
  username: string,
  masterWalletAddress: string,
  activePasswordSlot: PasswordSlot,
): void => {
  const session = {
    username,
    masterWalletAddress,
    activePasswordSlot,
    expiresAt: formatISO(add(new Date(), { hours: 24 })),
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const getSession = (): {
  username: string;
  masterWalletAddress: string;
  activePasswordSlot: PasswordSlot;
  expiresAt: string;
} | null => {
  try {
    const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as {
      username: string;
      masterWalletAddress: string;
      activePasswordSlot: PasswordSlot;
      expiresAt: string;
    };

    const expiresAt = parseISO(session.expiresAt);

    if (isAfter(new Date(), expiresAt)) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};
