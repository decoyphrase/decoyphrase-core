"use client";

import {
  FileText,
  Bookmark,
  Lock,
  Folder,
  Clock,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useVault } from "@/context/VaultContext";
import FileStatusBadge from "@/components/ui/FileStatusBadge";
import { getFolderStats } from "@/lib/utils";
import DisclaimerModal from "@/components/DisclaimerModal";

export default function DashboardView() {
  const {
    files,
    stats,
    openFileFromAnywhere,
    setView,
    isSyncing,
    navigateToFolder,
  } = useVault();
  const recentFiles = files
    .filter((f) => f.type === "file" && !f.deletedAt && !f.isDeleted)
    .slice(0, 5);

  const recentFolders = files
    .filter((f) => f.type === "folder" && !f.deletedAt && !f.isDeleted)
    .slice(0, 3);

  const folderStats = getFolderStats(files);

  const getIcon = (label: string) => {
    switch (label) {
      case "Files":
        return (
          <FileText
            size={32}
            strokeWidth={1}
            className="w-6 h-6 md:w-8 md:h-8"
          />
        );
      case "Bookmarks":
        return (
          <Bookmark
            size={32}
            strokeWidth={1}
            className="w-6 h-6 md:w-8 md:h-8"
          />
        );
      case "LOCKED DOCUMENTS":
        return (
          <Lock size={32} strokeWidth={1} className="w-6 h-6 md:w-8 md:h-8" />
        );
      case "Locked Folders":
        return (
          <Folder size={32} strokeWidth={1} className="w-6 h-6 md:w-8 md:h-8" />
        );
      default:
        return (
          <FileText
            size={32}
            strokeWidth={1}
            className="w-6 h-6 md:w-8 md:h-8"
          />
        );
    }
  };

  const STATS_DATA = [
    {
      label: "Files",
      count: stats.totalDocuments,
      onClick: () => setView("DOCUMENTS"),
    },
    {
      label: "Bookmarks",
      count: stats.totalBookmarks,
      onClick: () => setView("BOOKMARKS"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-mono overflow-y-auto h-full no-scrollbar safe-bottom"
    >
      {isSyncing && (
        <div className="mb-4 md:mb-6 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
            Syncing files and folders from Arweave...
          </span>
        </div>
      )}

      {(stats.totalPending > 0 || stats.totalConfirmed > 0) && (
        <div className="mb-4 md:mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-yellow-950/10 dark:bg-yellow-950/20 border border-yellow-900/30 dark:border-yellow-800/50 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock
                size={14}
                className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
              />
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                PENDING CONFIRMATION
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.totalPending}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Waiting for blockchain
            </p>
          </div>

          <div className="bg-green-950/10 dark:bg-green-950/20 border border-green-900/30 dark:border-green-800/50 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2
                size={14}
                className="text-green-600 dark:text-green-400 flex-shrink-0"
              />
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                CONFIRMED ON CHAIN
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.totalConfirmed}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Permanent storage
            </p>
          </div>

          <div className="bg-purple-950/10 dark:bg-purple-950/20 border border-purple-900/30 dark:border-purple-800/50 rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen
                size={14}
                className="text-purple-600 dark:text-purple-400 flex-shrink-0"
              />
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                FOLDERS ON CHAIN
              </span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {stats.totalFoldersOnChain}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {folderStats.foldersPending} pending
            </p>
          </div>
        </div>
      )}

      <h2 className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg mb-3 md:mb-4 font-bold tracking-wide">
        Total Items
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        {STATS_DATA.map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            className="bg-zinc-100 dark:bg-zinc-800 p-4 md:p-6 rounded-lg border border-zinc-300 dark:border-zinc-700 flex justify-between items-end min-h-[120px] md:min-h-[140px] hover:border-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer touch-manipulation tap-highlight-transparent"
          >
            <div className="flex flex-col h-full justify-between">
              <div className="text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
                {stat.label}
              </div>
              <div className="text-4xl md:text-6xl font-normal text-zinc-900 dark:text-zinc-50">
                {stat.count}
              </div>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400 mb-2">
              {getIcon(stat.label)}
            </div>
          </div>
        ))}
      </div>

      {recentFolders.length > 0 && (
        <>
          <h2 className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg mb-3 md:mb-4 font-bold tracking-wide">
            Recent Folders
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            {recentFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                className="bg-zinc-100 dark:bg-zinc-800 p-3 md:p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer touch-manipulation tap-highlight-transparent"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Folder
                    size={20}
                    className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {folder.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {folder.dateModified}
                    </div>
                  </div>
                </div>
                <FileStatusBadge
                  status={folder.status}
                  progress={
                    folder.uploadProgress || folder.confirmationProgress
                  }
                  estimatedTime={folder.estimatedConfirmationTime}
                  error={folder.uploadError}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg mb-3 md:mb-4 font-bold tracking-wide">
        Recent Files
      </h2>

      <div className="w-full">
        <div className="hidden md:grid grid-cols-[1fr_auto_auto] text-zinc-600 dark:text-zinc-400 text-xs px-4 pb-3 border-b border-transparent">
          <span>Name</span>
          <span>Status</span>
          <span>Date accessed</span>
        </div>
        <div className="flex flex-col">
          {recentFiles.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-xs md:text-sm">
              No files yet. Create your first file to get started.
            </div>
          ) : (
            recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => openFileFromAnywhere(file.id)}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-start md:items-center gap-2 md:gap-4 px-3 md:px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded group cursor-pointer border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors touch-manipulation tap-highlight-transparent"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <FileText
                    size={18}
                    className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-zinc-900 dark:text-zinc-50 text-sm font-medium truncate">
                      {file.name}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5 truncate">
                      {file.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between md:contents gap-2">
                  <FileStatusBadge
                    status={file.status}
                    progress={file.uploadProgress || file.confirmationProgress}
                    estimatedTime={file.estimatedConfirmationTime}
                    error={file.uploadError}
                  />
                  <span className="text-zinc-600 dark:text-zinc-400 text-xs flex-shrink-0">
                    {file.dateAccessed}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <DisclaimerModal onAccept={() => {}} />
    </motion.div>
  );
}
