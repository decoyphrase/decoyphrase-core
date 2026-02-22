"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import DashboardView from "@/components/DashboardView";
import FileExplorerView from "@/components/FileExplorerView";
import { useVault } from "@/context/VaultContext";
import { useTurbo } from "@/context/ArweaveContext";
import { useFileSync } from "@/hooks/useFileSync";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Info,
  WifiOff,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  Shield,
} from "lucide-react";
import Logo from "@/components/Logo";
import {
  validateUsername,
  validatePassword,
  PASSWORD_VALIDATION_ERRORS,
} from "@/lib/constants";

function AuthPrompt() {
  const {
    login,
    register,
    isLoggingIn,
    isRegistering,
    isCheckingUser,
    isNetworkError,
    error,
    errorType,
    retryLastAction,
  } = useTurbo();
  const { setVaultPassword } = useVault();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secondaryPassword, setSecondaryPassword] = useState("");
  const [tertiaryPassword, setTertiaryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecondaryPassword, setShowSecondaryPassword] = useState(false);
  const [showTertiaryPassword, setShowTertiaryPassword] = useState(false);
  const [useMultiPassword, setUseMultiPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const apiUrl = "https://decoyphrase-backend.vercel.app";
        // You could theoretically hit any endpoint or a specific /status endpoint
        const res = await fetch(`${apiUrl}/api/turbo/balance`, {
          method: "OPTIONS", // Fast preflight check
        });
        if (!res.ok) {
          setInitError(
            "Backend is disconnected. Please ensure the backend server is running at https://decoyphrase-backend.vercel.app.",
          );
        }
      } catch (err) {
        console.error("Initialization check failed:", err);
        setInitError("Cannot connect to backend server.");
      }
    };
    checkInitialization();
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value) {
      const validationError = validateUsername(value);
      setUsernameError(validationError);
    } else {
      setUsernameError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      setUsernameError(usernameValidation);
      setLocalError(usernameValidation);
      return;
    }

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setLocalError(passwordValidation);
      return;
    }

    if (!isLoginMode) {
      if (password !== confirmPassword) {
        setLocalError(PASSWORD_VALIDATION_ERRORS.MISMATCH);
        return;
      }

      if (useMultiPassword) {
        if (secondaryPassword) {
          const secondaryValidation = validatePassword(secondaryPassword);
          if (secondaryValidation) {
            setLocalError(`Secondary password: ${secondaryValidation}`);
            return;
          }
          if (secondaryPassword === password) {
            setLocalError(
              "Secondary password must be different from primary password",
            );
            return;
          }
        }

        if (tertiaryPassword) {
          const tertiaryValidation = validatePassword(tertiaryPassword);
          if (tertiaryValidation) {
            setLocalError(`Tertiary password: ${tertiaryValidation}`);
            return;
          }
          if (
            tertiaryPassword === password ||
            tertiaryPassword === secondaryPassword
          ) {
            setLocalError(
              "Tertiary password must be different from other passwords",
            );
            return;
          }
        }
      }
    }

    setLastAction({ username, password });

    try {
      if (isLoginMode) {
        await login(username, password);
        setVaultPassword(password);
      } else {
        const passwords: {
          primary: string;
          secondary?: string;
          tertiary?: string;
        } = {
          primary: password,
        };

        if (useMultiPassword) {
          if (secondaryPassword) {
            passwords.secondary = secondaryPassword;
          }
          if (tertiaryPassword) {
            passwords.tertiary = tertiaryPassword;
          }
        }

        await register(username, passwords);
        setVaultPassword(password);
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const handleRetry = async () => {
    if (!lastAction) return;

    retryLastAction();
    setLocalError(null);

    try {
      if (isLoginMode) {
        await login(lastAction.username, lastAction.password);
      } else {
        await register(lastAction.username, { primary: lastAction.password });
      }
    } catch (err) {
      console.error("Retry error:", err);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setLocalError(null);
    setUsernameError(null);
    setPassword("");
    setConfirmPassword("");
    setSecondaryPassword("");
    setTertiaryPassword("");
    setUseMultiPassword(false);
    retryLastAction();
  };

  const displayError = localError || error;
  const isProcessing = isLoggingIn || isRegistering || isCheckingUser;

  if (initError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-950/20 border border-red-900/50 dark:border-red-700/50 rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={24}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <div>
                <h2 className="text-base md:text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                  Configuration Error
                </h2>
                <p className="text-xs md:text-sm text-red-600 dark:text-red-400 mb-4">
                  {initError}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Please contact the administrator or check your environment
                  configuration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 overflow-y-auto safe-top safe-bottom">
      <div className="max-w-md w-full p-4 sm:p-6 md:p-8 my-4 md:my-8">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-500/10 mb-3 md:mb-4">
            <Logo className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-xs md:text-sm">
            {isLoginMode
              ? "Sign in to access your encrypted vault"
              : "Register to create your encrypted vault"}
          </p>
        </div>

        {!isLoginMode && (
          <div className="bg-blue-950/20 border border-blue-900/50 dark:border-blue-700/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Info
                size={16}
                className="text-blue-500 flex-shrink-0 mt-0.5 md:mt-0"
              />
              <div className="text-xs md:text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <p className="font-semibold">First-time Registration</p>
                <p className="text-xs">
                  Your account will be created on Arweave blockchain via Turbo.
                  You can login immediately, but full blockchain confirmation
                  may take 4-10 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoginMode && useMultiPassword && (
          <div className="bg-purple-950/20 border border-purple-900/50 dark:border-purple-700/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Shield
                size={16}
                className="text-purple-500 flex-shrink-0 mt-0.5 md:mt-0"
              />
              <div className="text-xs md:text-sm text-purple-600 dark:text-purple-400 space-y-1">
                <p className="font-semibold">
                  Multi-Password Plausible Deniability
                </p>
                <p className="text-xs">
                  Create up to 3 passwords that unlock different file sets. Each
                  password shows only its associated files, maintaining
                  deniability.
                </p>
              </div>
            </div>
          </div>
        )}

        {isNetworkError && (
          <div className="bg-orange-950/20 border border-orange-900/50 dark:border-orange-700/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-start gap-2 md:gap-3">
              <WifiOff
                size={16}
                className="text-orange-500 flex-shrink-0 mt-0.5 md:mt-0"
              />
              <div className="flex-1">
                <div className="text-xs md:text-sm text-orange-600 dark:text-orange-400 space-y-2">
                  <p className="font-semibold">Network Connection Issue</p>
                  <p className="text-xs">
                    Unable to connect to Turbo/Arweave network. Please check
                    your internet connection.
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  disabled={isProcessing}
                  className="mt-3 flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 disabled:opacity-50 touch-target tap-highlight-transparent"
                >
                  <RefreshCw size={14} />
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Username
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter your username"
                maxLength={32}
                autoComplete="username"
                spellCheck="false"
                className={`w-full pl-10 pr-4 py-2 md:py-2.5 bg-white dark:bg-zinc-800 border ${
                  usernameError
                    ? "border-red-500 dark:border-red-400"
                    : "border-zinc-300 dark:border-zinc-700"
                } rounded-lg text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 ${
                  usernameError ? "focus:ring-red-500" : "focus:ring-zinc-500"
                } focus:border-transparent touch-manipulation`}
                disabled={isProcessing}
              />
            </div>
            {usernameError && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                {usernameError}
              </p>
            )}
            {!usernameError && username && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Only letters, numbers, and underscores allowed
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {isLoginMode ? "Password" : "Primary Password"}
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
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                spellCheck="false"
                data-1p-ignore="true"
                data-lpignore="true"
                className="w-full pl-10 pr-12 py-2 md:py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent touch-manipulation"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-target tap-highlight-transparent"
                disabled={isProcessing}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Confirm Primary Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  spellCheck="false"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="w-full pl-10 pr-12 py-2 md:py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent touch-manipulation"
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-target tap-highlight-transparent"
                  disabled={isProcessing}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {!isLoginMode && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setUseMultiPassword(!useMultiPassword)}
                disabled={isProcessing}
                className="flex items-center gap-2 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 disabled:opacity-50 touch-target tap-highlight-transparent"
              >
                {useMultiPassword ? <Trash2 size={14} /> : <Plus size={14} />}
                {useMultiPassword
                  ? "Remove backup passwords"
                  : "Add backup passwords (optional)"}
              </button>
            </div>
          )}

          {!isLoginMode && useMultiPassword && (
            <>
              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Secondary Password (Optional)
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type={showSecondaryPassword ? "text" : "password"}
                    value={secondaryPassword}
                    onChange={(e) => setSecondaryPassword(e.target.value)}
                    placeholder="Enter secondary password"
                    autoComplete="new-password"
                    spellCheck="false"
                    className="w-full pl-10 pr-12 py-2 md:py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent touch-manipulation"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowSecondaryPassword(!showSecondaryPassword)
                    }
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-target tap-highlight-transparent"
                    disabled={isProcessing}
                  >
                    {showSecondaryPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Tertiary Password (Optional)
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type={showTertiaryPassword ? "text" : "password"}
                    value={tertiaryPassword}
                    onChange={(e) => setTertiaryPassword(e.target.value)}
                    placeholder="Enter tertiary password"
                    autoComplete="new-password"
                    spellCheck="false"
                    className="w-full pl-10 pr-12 py-2 md:py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent touch-manipulation"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowTertiaryPassword(!showTertiaryPassword)
                    }
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-target tap-highlight-transparent"
                    disabled={isProcessing}
                  >
                    {showTertiaryPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {displayError && !isNetworkError && (
            <div
              className={`rounded-lg p-3 ${
                errorType === "user-not-found"
                  ? "bg-yellow-950/20 border border-yellow-900/50 dark:border-yellow-700/50"
                  : "bg-red-950/20 border border-red-900/50 dark:border-red-700/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className={`flex-shrink-0 mt-0.5 ${
                    errorType === "user-not-found"
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                />
                <p
                  className={`text-xs md:text-sm ${
                    errorType === "user-not-found"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {displayError}
                </p>
              </div>
            </div>
          )}

          {isCheckingUser && !isNetworkError && (
            <div className="bg-blue-950/20 border border-blue-900/50 dark:border-blue-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-blue-500 animate-spin" />
                <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">
                  {isLoginMode
                    ? "Verifying credentials on blockchain..."
                    : "Creating account on blockchain via Turbo..."}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing || !!usernameError}
            className="w-full flex items-center justify-center gap-2 bg-zinc-600 hover:bg-zinc-700 text-white px-6 py-2.5 md:py-3 rounded-lg text-sm md:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target touch-manipulation tap-highlight-transparent"
          >
            {isProcessing && <Loader2 size={16} className="animate-spin" />}
            {isLoggingIn
              ? "Signing in..."
              : isRegistering
                ? "Creating account..."
                : isLoginMode
                  ? "Sign In"
                  : "Create Account"}
          </button>
        </form>

        <div className="mt-4 md:mt-6 text-center">
          <button
            onClick={toggleMode}
            disabled={isProcessing}
            className="text-xs md:text-sm text-zinc-500 hover:text-zinc-600 disabled:opacity-50 touch-target tap-highlight-transparent"
          >
            {isLoginMode ? (
              <>
                Don&apos;t have an account?{" "}
                <span className="font-semibold text-zinc-700">Register</span>
              </>
            ) : (
              "Already have an account? Sign in"
            )}
          </button>
        </div>

        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Powered by Turbo
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
            Your data is encrypted with your password and stored on Arweave
            blockchain via Turbo subsidized uploads.
            <br />
            Zero-knowledge architecture ensures only you can access your files.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const {
    currentView,
    setView,
    syncFiles,
    updateParentMapping,
    processUploadQueue,
  } = useVault();
  const { isAuthenticated, username } = useTurbo();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasTriggeredSyncRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileConfirmed = useCallback(
    (fileId: string, tempId?: string) => {
      console.log(
        `File confirmed: ${fileId}${tempId ? ` (was: ${tempId})` : ""}`,
      );
      if (!hasTriggeredSyncRef.current) {
        hasTriggeredSyncRef.current = true;

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          syncFiles();
          hasTriggeredSyncRef.current = false;
        }, 2000);
      }
    },
    [syncFiles],
  );

  const handleFolderConfirmed = useCallback(
    (folderId: string, tempId?: string) => {
      console.log(
        `Folder confirmed: ${folderId}${tempId ? ` (was: ${tempId})` : ""}`,
      );

      if (tempId && tempId !== folderId) {
        updateParentMapping(tempId, folderId);
        processUploadQueue();
      }

      if (!hasTriggeredSyncRef.current) {
        hasTriggeredSyncRef.current = true;

        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          syncFiles();
          processUploadQueue();
          hasTriggeredSyncRef.current = false;
        }, 2000);
      }
    },
    [syncFiles, updateParentMapping, processUploadQueue],
  );

  const handleFileFailed = useCallback((fileId: string) => {
    console.error(`File confirmation failed: ${fileId}`);
  }, []);

  const handleFolderFailed = useCallback((folderId: string) => {
    console.error(`Folder confirmation failed: ${folderId}`);
  }, []);

  const handleProgressUpdate = useCallback(
    (fileId: string, progress: number) => {
      console.log(`File ${fileId} confirmation progress: ${progress}%`);
    },
    [],
  );

  useFileSync({
    username,
    isAuthenticated,
    onFileConfirmed: handleFileConfirmed,
    onFolderConfirmed: handleFolderConfirmed,
    onFileFailed: handleFileFailed,
    onFolderFailed: handleFolderFailed,
    onProgressUpdate: handleProgressUpdate,
  });

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!isAuthenticated) {
    return <AuthPrompt />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      <div className="z-1">
        <Sidebar
          currentView={currentView}
          onChangeView={setView}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={handleToggleMobileMenu}
        />
      </div>

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar onToggleMobileMenu={handleToggleMobileMenu} />

        <div className="flex-1 overflow-hidden relative bg-zinc-50 dark:bg-zinc-900">
          <AnimatePresence mode="wait">
            {currentView === "HOME" ? (
              <DashboardView key="home" />
            ) : (
              <FileExplorerView key="files" />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return <AppContent />;
}
