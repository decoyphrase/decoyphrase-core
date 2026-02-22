"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  registerUser,
  loginUser,
  saveSession,
  getSession,
  clearSession,
  addPasswordSlot,
  removePasswordSlot,
  getUserRegistry,
  UserNotFoundError,
  InvalidPasswordError,
  AuthenticationError,
  TransactionSigningError,
} from "@/lib/arweave/wallet";
import {
  TurboNetworkError,
  TurboQueryError,
  TurboWalletError,
  checkTurboConnection,
  getTurboBalance,
} from "@/lib/arweave/client";
import { deriveUserEncryptionKey } from "@/lib/crypto/encryption";
import type {
  TurboContextType,
  TurboBalanceInfo,
  PasswordSlot,
  PasswordSlotInfo,
} from "@/lib/types";
import { getMasterWalletAddress } from "@/lib/arweave/client";
import {
  validateUsername,
  validatePassword,
  sanitizeUsername,
  STORAGE_KEYS,
} from "@/lib/constants";
import { formatISO } from "date-fns";

const TurboContext = createContext<TurboContextType | undefined>(undefined);

export const useTurbo = () => {
  const context = useContext(TurboContext);
  if (!context) {
    throw new Error("useTurbo must be used within TurboProvider");
  }
  return context;
};

export const useArweave = useTurbo;

export const TurboProvider = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [activePasswordSlot, setActivePasswordSlot] =
    useState<PasswordSlot | null>("primary");
  const [masterWalletAddress, setMasterWalletAddress] = useState<string | null>(
    null,
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [balance, setBalance] = useState<TurboBalanceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    "auth" | "network" | "user-not-found" | "wallet" | "upload" | null
  >(null);
  const [passwordSlots, setPasswordSlots] = useState<PasswordSlotInfo[]>([
    { slot: "primary", isActive: true, createdAt: formatISO(new Date()) },
  ]);
  const [needsPasswordVerification, setNeedsPasswordVerification] =
    useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = getSession();
      if (session) {
        try {
          setUsername(session.username);
          setMasterWalletAddress(session.masterWalletAddress);
          setActivePasswordSlot(session.activePasswordSlot || "primary");
          // FIX Bug 2: Signal that password verification is needed after session restore
          // This ensures the correct encryption key is derived for the active slot
          setNeedsPasswordVerification(true);
        } catch (err) {
          console.error("Failed to restore session:", err);
          clearSession();
        }
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const initializeMasterWallet = async () => {
      try {
        const address = await getMasterWalletAddress();
        setMasterWalletAddress(address);
      } catch (err) {
        console.error("Failed to get master wallet address:", err);
        if (err instanceof TurboWalletError) {
          setError("Wallet configuration error. Please check your setup.");
          setErrorType("wallet");
        }
      }
    };

    if (!masterWalletAddress) {
      initializeMasterWallet();
    }
  }, [masterWalletAddress]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (username) {
        const registry = await getUserRegistry(username);
        if (registry) {
          const slots: PasswordSlotInfo[] = registry.activeSlots.map((s) => ({
            slot: s,
            isActive: true,
            createdAt: registry.createdAt,
          }));
          setPasswordSlots(slots);
        }
      }
    };
    fetchSlots();
  }, [username]);

  const refreshBalance = useCallback(async () => {
    try {
      const balanceInfo = await getTurboBalance();
      setBalance(balanceInfo);
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  }, []);

  useEffect(() => {
    if (username && masterWalletAddress) {
      refreshBalance();
    }
  }, [username, masterWalletAddress, refreshBalance]);

  const mapErrorToUserMessage = (
    err: unknown,
  ): {
    message: string;
    type: "auth" | "network" | "user-not-found" | "wallet" | "upload";
  } => {
    if (err instanceof TurboWalletError) {
      return {
        message:
          "Wallet configuration error. Please contact support or check your wallet setup.",
        type: "wallet",
      };
    }

    if (err instanceof TransactionSigningError) {
      return {
        message:
          "Transaction signing failed. Your wallet may be corrupted. Please contact support.",
        type: "wallet",
      };
    }

    if (err instanceof TurboNetworkError) {
      return {
        message:
          "Unable to connect to Turbo/Arweave network. Please check your internet connection.",
        type: "network",
      };
    }

    if (err instanceof TurboQueryError) {
      return {
        message:
          "Arweave network is experiencing issues. Please try again in a few moments.",
        type: "network",
      };
    }

    if (err instanceof UserNotFoundError) {
      return {
        message: err.message,
        type: "user-not-found",
      };
    }

    if (err instanceof InvalidPasswordError) {
      return {
        message: "Invalid password. Please try again.",
        type: "auth",
      };
    }

    if (err instanceof AuthenticationError) {
      return {
        message: err.message,
        type: "auth",
      };
    }

    if (err instanceof Error) {
      return {
        message: err.message,
        type: "auth",
      };
    }

    return {
      message: "An unexpected error occurred. Please try again.",
      type: "auth",
    };
  };

  const register = async (
    username: string,
    passwords: { primary: string; secondary?: string; tertiary?: string },
  ) => {
    setIsRegistering(true);
    setIsCheckingUser(true);
    setError(null);
    setErrorType(null);
    setIsNetworkError(false);

    try {
      const usernameValidation = validateUsername(username);
      if (usernameValidation) {
        throw new AuthenticationError(usernameValidation);
      }

      const passwordValidation = validatePassword(passwords.primary);
      if (passwordValidation) {
        throw new AuthenticationError(passwordValidation);
      }

      if (passwords.secondary) {
        const secondaryValidation = validatePassword(passwords.secondary);
        if (secondaryValidation) {
          throw new AuthenticationError(
            `Secondary password: ${secondaryValidation}`,
          );
        }
      }

      if (passwords.tertiary) {
        const tertiaryValidation = validatePassword(passwords.tertiary);
        if (tertiaryValidation) {
          throw new AuthenticationError(
            `Tertiary password: ${tertiaryValidation}`,
          );
        }
      }

      const sanitizedUsername = sanitizeUsername(username);

      const isConnected = await checkTurboConnection();
      if (!isConnected) {
        throw new TurboNetworkError(
          "Cannot connect to Turbo network. Please check your internet connection.",
        );
      }

      await registerUser(sanitizedUsername, passwords);

      const address = await getMasterWalletAddress();
      setUsername(sanitizedUsername);
      setMasterWalletAddress(address);
      setActivePasswordSlot("primary");
      saveSession(sanitizedUsername, address, "primary");

      const slots: PasswordSlotInfo[] = [
        {
          slot: "primary",
          isActive: true,
          createdAt: formatISO(new Date()),
        },
      ];
      if (passwords.secondary) {
        slots.push({
          slot: "secondary",
          isActive: true,
          createdAt: formatISO(new Date()),
        });
      }
      if (passwords.tertiary) {
        slots.push({
          slot: "tertiary",
          isActive: true,
          createdAt: formatISO(new Date()),
        });
      }
      setPasswordSlots(slots);

      await refreshBalance();
    } catch (err) {
      const { message, type } = mapErrorToUserMessage(err);
      setError(message);
      setErrorType(type);
      setIsNetworkError(type === "network");
      console.error("Register error:", err);
      throw err;
    } finally {
      setIsRegistering(false);
      setIsCheckingUser(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setIsCheckingUser(true);
    setError(null);
    setErrorType(null);
    setIsNetworkError(false);

    try {
      const usernameValidation = validateUsername(username);
      if (usernameValidation) {
        throw new AuthenticationError(usernameValidation);
      }

      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        throw new AuthenticationError(passwordValidation);
      }

      const sanitizedUsername = sanitizeUsername(username);

      const isConnected = await checkTurboConnection();
      if (!isConnected) {
        throw new TurboNetworkError(
          "Cannot connect to Turbo network. Please check your internet connection.",
        );
      }

      const { slot, registry } = await loginUser(sanitizedUsername, password);

      const address = await getMasterWalletAddress();
      setUsername(sanitizedUsername);
      setMasterWalletAddress(address);
      setActivePasswordSlot(slot);

      const slots: PasswordSlotInfo[] = registry.activeSlots.map((s) => ({
        slot: s,
        isActive: true,
        createdAt: registry.createdAt,
      }));
      setPasswordSlots(slots);

      saveSession(sanitizedUsername, address, slot);
      await refreshBalance();
    } catch (err) {
      const { message, type } = mapErrorToUserMessage(err);
      setError(message);
      setErrorType(type);
      setIsNetworkError(type === "network");
      console.error("Login error:", err);
      throw err;
    } finally {
      setIsLoggingIn(false);
      setIsCheckingUser(false);
    }
  };

  const addBackupPassword = async (
    currentPassword: string,
    newPassword: string,
    slot: PasswordSlot,
  ) => {
    if (!username) {
      throw new AuthenticationError("No user logged in");
    }

    try {
      const passwordValidation = validatePassword(newPassword);
      if (passwordValidation) {
        throw new AuthenticationError(passwordValidation);
      }

      await addPasswordSlot(username, currentPassword, newPassword, slot);

      setPasswordSlots((prev) => [
        ...prev,
        { slot, isActive: true, createdAt: formatISO(new Date()) },
      ]);
    } catch (err) {
      const { message } = mapErrorToUserMessage(err);
      setError(message);
      throw err;
    }
  };

  const removeBackupPassword = async (
    currentPassword: string,
    slot: PasswordSlot,
  ) => {
    if (!username) {
      throw new AuthenticationError("No user logged in");
    }

    try {
      await removePasswordSlot(username, currentPassword, slot);

      setPasswordSlots((prev) => prev.filter((s) => s.slot !== slot));
    } catch (err) {
      const { message } = mapErrorToUserMessage(err);
      setError(message);
      throw err;
    }
  };

  const listPasswordSlots = useCallback(async (): Promise<
    PasswordSlotInfo[]
  > => {
    return passwordSlots;
  }, [passwordSlots]);

  const logout = async () => {
    try {
      if (username) {
        // Fix for Issue 3B: Clear local vault cache to prevent secondary password from loading primary files
        if (activePasswordSlot) {
          localStorage.removeItem(
            `${STORAGE_KEYS.FILES_CACHE}_${username}_${activePasswordSlot}`,
          );
        }
      }

      setUsername(null);
      setActivePasswordSlot("primary");
      setError(null);
      setErrorType(null);
      setIsNetworkError(false);
      setBalance(null);
      setPasswordSlots([
        {
          slot: "primary",
          isActive: true,
          createdAt: formatISO(new Date()),
        },
      ]);
      clearSession();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const retryLastAction = useCallback(() => {
    setError(null);
    setErrorType(null);
    setIsNetworkError(false);
  }, []);

  const getUserEncryptionKey = useCallback(
    async (password: string): Promise<string> => {
      if (!username) {
        throw new Error("No user logged in");
      }
      return await deriveUserEncryptionKey(username, password);
    },
    [username],
  );

  return (
    <TurboContext.Provider
      value={{
        username,
        activePasswordSlot,
        passwordSlots,
        masterWalletAddress,
        isAuthenticated: !!username && !!masterWalletAddress,
        isLoggingIn,
        isRegistering,
        isCheckingUser,
        isNetworkError,
        balance,
        error,
        errorType,
        login,
        register,
        logout,
        addBackupPassword,
        removeBackupPassword,
        listPasswordSlots,
        retryLastAction,
        getUserEncryptionKey,
        refreshBalance,
        needsPasswordVerification,
        clearPasswordVerification: () => setNeedsPasswordVerification(false),
      }}
    >
      {children}
    </TurboContext.Provider>
  );
};

export const ArweaveProvider = TurboProvider;
