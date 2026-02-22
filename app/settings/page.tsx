"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  User,
  Info,
  Shield,
  Plus,
  Lock,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { useTurbo } from "@/context/ArweaveContext";
import { formatISO, getTime } from "date-fns";

function SettingsContent() {
  const router = useRouter();
  const { files, stats, addBackupPassword, removeBackupPassword } = useVault();
  const { username, masterWalletAddress, passwordSlots, isAuthenticated } =
    useTurbo();

  // Removed automatic redirect to allow access to settings even if password is not cached.
  // Password will be requested when needed for specific actions.
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showAddPasswordModal, setShowAddPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSlot, setPasswordSlot] = useState<"secondary" | "tertiary">(
    "secondary",
  );
  const [addPasswordError, setAddPasswordError] = useState<string | null>(null);
  const [addPasswordSuccess, setAddPasswordSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { activePasswordSlot } = useTurbo();

  // Show loading state if authenticated but username not yet loaded
  if (isAuthenticated && !username) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">
          Loading settings...
        </div>
      </div>
    );
  }

  const handleExportVault = () => {
    const vaultData = {
      exportDate: formatISO(new Date()),
      version: "2.0-turbo",
      username,
      masterWalletAddress,
      files: files.filter(
        (f) => f.owner === username && !f.isDeleted && !f.deletedAt,
      ),
    };

    const dataStr = JSON.stringify(vaultData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vault-backup-${username}-${getTime(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleImportVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        files?: Array<{ owner?: string }>;
      };

      if (data.files && Array.isArray(data.files) && username) {
        const userFiles = data.files.filter(
          (f) => f.owner === username || !f.owner,
        );
        localStorage.setItem(
          `vault_files_${username}`,
          JSON.stringify(userFiles),
        );
        window.location.reload();
      } else {
        alert("Invalid vault file format");
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import vault data");
    }
  };

  const handleClearAllData = () => {
    if (username) {
      localStorage.removeItem(`vault_files_${username}`);
      window.location.reload();
    }
  };

  const handleAddBackupPassword = async () => {
    setAddPasswordError(null);

    if (!newPassword || newPassword.length < 8) {
      setAddPasswordError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setAddPasswordError("Passwords do not match");
      return;
    }

    try {
      await addBackupPassword(newPassword, passwordSlot);
      setAddPasswordSuccess(true);
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowAddPasswordModal(false);
        setAddPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      setAddPasswordError(
        error instanceof Error ? error.message : "Failed to add password",
      );
    }
  };

  const handleRemoveBackupPassword = async (slot: "secondary" | "tertiary") => {
    const ok = confirm(
      `Are you sure you want to remove ${slot} password? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      await removeBackupPassword(slot);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to remove password",
      );
    }
  };

  const storagePercentage = (stats.totalDocuments / 500) * 100;

  const hasSecondaryPassword = passwordSlots.some(
    (s) => s.slot === "secondary" && s.isActive,
  );
  const hasTertiaryPassword = passwordSlots.some(
    (s) => s.slot === "tertiary" && s.isActive,
  );

  return (
    <div className="h-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-mono overflow-y-auto safe-top safe-bottom">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <button
            onClick={() => router.push("/")}
            className="hover:bg-zinc-200 dark:hover:bg-zinc-800 p-2 rounded transition-colors touch-target tap-highlight-transparent"
          >
            <ArrowLeft size={18} className="text-zinc-600 dark:text-zinc-400" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
        </div>

        <div className="space-y-4 md:space-y-6 pb-20">
          <section className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <User
                size={18}
                className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
              />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Account Information
              </h2>
            </div>

            <div className="space-y-3">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs mb-1">
                  Username
                </div>
                <div className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 break-all">
                  {username}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-purple-950/10 dark:bg-purple-950/20 border border-purple-900/30 dark:border-purple-800/50 rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <Shield size={18} className="text-purple-500 flex-shrink-0" />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Multi-Password Management
              </h2>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Create backup passwords for plausible deniability. Each password
              unlocks a different set of files.
            </p>

            <div className="space-y-2 md:space-y-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Key size={16} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Primary Password
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Main vault access
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-500 text-xs font-semibold">
                  <Lock size={12} className="flex-shrink-0" />
                  Active
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Key size={16} className="text-orange-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Secondary Password
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Backup vault access
                    </div>
                  </div>
                </div>
                {hasSecondaryPassword ? (
                  <div className="flex items-center gap-2 md:gap-3">
                    {activePasswordSlot === "secondary" ? (
                      <div className="flex items-center gap-2 text-green-500 text-xs font-semibold">
                        <Lock size={12} className="flex-shrink-0" />
                        Current Vault
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-500/70 text-xs font-semibold">
                        <CheckCircle size={12} className="flex-shrink-0" />
                        Configured
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveBackupPassword("secondary")}
                      className="text-red-500 hover:text-red-600 text-xs font-medium touch-target tap-highlight-transparent"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPasswordSlot("secondary");
                      setShowAddPasswordModal(true);
                    }}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium touch-target tap-highlight-transparent"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Key size={16} className="text-purple-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      Tertiary Password
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Additional backup
                    </div>
                  </div>
                </div>
                {hasTertiaryPassword ? (
                  <div className="flex items-center gap-2 md:gap-3">
                    {activePasswordSlot === "tertiary" ? (
                      <div className="flex items-center gap-2 text-green-500 text-xs font-semibold">
                        <Lock size={12} className="flex-shrink-0" />
                        Current Vault
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-500/70 text-xs font-semibold">
                        <CheckCircle size={12} className="flex-shrink-0" />
                        Configured
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveBackupPassword("tertiary")}
                      className="text-red-500 hover:text-red-600 text-xs font-medium touch-target tap-highlight-transparent"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPasswordSlot("tertiary");
                      setShowAddPasswordModal(true);
                    }}
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium touch-target tap-highlight-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-blue-500"
                    disabled={!hasSecondaryPassword}
                  >
                    <Plus size={12} />
                    Add
                  </button>
                )}
              </div>
            </div>

            <div className="bg-purple-950/20 border border-purple-700/50 rounded p-3 text-xs text-purple-600 dark:text-purple-400">
              <div className="flex items-start gap-2">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  Each password provides access to a different file set.
                  Secondary and tertiary passwords can be used for plausible
                  deniability.
                </div>
              </div>
            </div>
          </section>

          <section className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <Database
                size={18}
                className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
              />
              <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Vault Statistics
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 text-sm mb-4 md:mb-6">
              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs mb-1">
                  Total Files
                </div>
                <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.totalDocuments}
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Max 500 Files (Legacy)
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs mb-1">
                  Storage Usage (File Count)
                </div>
                <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.totalDocuments} Files
                </div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Max 500 Files
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs mb-1">
                  Bookmarked
                </div>
                <div className="text-xl md:text-2xl font-bold text-blue-500">
                  {stats.totalBookmarks}
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="text-zinc-600 dark:text-zinc-400 text-xs mb-1">
                  Locked Files
                </div>
                <div className="text-xl md:text-2xl font-bold text-yellow-500">
                  {stats.totalLockedFiles}
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 p-3 md:p-4 rounded border border-zinc-300 dark:border-zinc-700">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Storage Usage ({stats.totalDocuments}/500 Files)
                </span>
                <span className="text-zinc-900 dark:text-zinc-50 font-semibold">
                  {storagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storagePercentage > 80
                      ? "bg-red-500"
                      : storagePercentage > 50
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="bg-blue-950/10 dark:bg-blue-950/20 border border-blue-900/30 dark:border-blue-800/50 rounded-lg p-4 md:p-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-3 uppercase tracking-wider">
                  About the Files You Hide
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  When you hide a file in this vault, it is removed from your
                  main view but remains on the Arweave permaweb. Because Arweave
                  is immutable, data cannot be truly deleted. Hiding simply
                  removes the reference from your personal vault index properly.
                </p>
                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 ml-4 list-disc">
                  <li>Hidden items remain on-chain and can be re-synced</li>
                  <li>
                    Hidden items are accessible from the Hidden Files view
                  </li>
                  <li>Hide markers help keep your main vault clean</li>
                  <li>Changes may take time to confirm on-chain via Turbo</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-3 md:mb-4">
              Backup & Restore
            </h2>

            <div className="space-y-2 md:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                    Export Vault
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Download your encrypted vault data as JSON
                  </div>
                </div>
                <button
                  onClick={handleExportVault}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold transition-colors text-zinc-50 touch-target touch-manipulation tap-highlight-transparent"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>

              {exportSuccess && (
                <div className="flex items-center gap-2 text-green-500 text-xs md:text-sm p-3 bg-green-950/20 rounded border border-green-900">
                  <CheckCircle size={16} className="flex-shrink-0" />
                  Vault exported successfully!
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                    Import Vault
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Restore vault from backup file
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-600 dark:hover:bg-zinc-600 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold cursor-pointer transition-colors text-zinc-900 dark:text-zinc-50 touch-target touch-manipulation tap-highlight-transparent">
                  <Upload size={14} />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportVault}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="bg-red-950/20 border border-red-900 rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <h2 className="text-base md:text-lg font-bold text-red-400 dark:text-red-500">
                Danger Zone
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 bg-zinc-50 dark:bg-zinc-900 rounded border border-red-900">
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                    Clear Local Cache
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Remove cached files. Data on blockchain remains safe.
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold transition-colors text-zinc-50 flex-shrink-0 touch-target touch-manipulation tap-highlight-transparent"
                >
                  <Trash2 size={14} />
                  Clear Cache
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-red-900 shadow-2xl w-full max-w-sm md:max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <h3 className="text-zinc-900 dark:text-zinc-50 font-bold text-base md:text-lg">
                Confirm Clear Cache
              </h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4 md:mb-6 text-xs md:text-sm">
              This will clear all cached files from local storage. Your files on
              Arweave blockchain remain permanently safe and can be re-synced.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 px-3 md:px-4 py-2 rounded transition-colors text-sm touch-target tap-highlight-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllData}
                className="bg-red-600 hover:bg-red-700 text-zinc-50 px-3 md:px-4 py-2 rounded font-bold transition-colors text-sm touch-target touch-manipulation tap-highlight-transparent"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 shadow-2xl w-full max-w-sm md:max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={20} className="text-purple-500 flex-shrink-0" />
              <h3 className="text-zinc-900 dark:text-zinc-50 font-bold text-base md:text-lg">
                Add {passwordSlot === "secondary" ? "Secondary" : "Tertiary"}{" "}
                Password
              </h3>
            </div>

            {addPasswordError && (
              <div className="mb-4 p-3 bg-red-950/20 border border-red-700/50 rounded text-xs md:text-sm text-red-600 dark:text-red-400">
                {addPasswordError}
              </div>
            )}

            {addPasswordSuccess && (
              <div className="mb-4 p-3 bg-green-950/20 border border-green-700/50 rounded text-xs md:text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle size={16} className="flex-shrink-0" />
                Password added successfully!
              </div>
            )}

            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div>
                <label className="block text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 touch-manipulation"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 touch-manipulation"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddPasswordModal(false);
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setAddPasswordError(null);
                }}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 px-3 md:px-4 py-2 rounded transition-colors text-sm touch-target tap-highlight-transparent"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBackupPassword}
                disabled={!newPassword || !confirmNewPassword}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 md:px-4 py-2 rounded font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target touch-manipulation tap-highlight-transparent"
              >
                Add Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
