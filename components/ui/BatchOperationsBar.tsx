"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, Tag, Bookmark, X, CheckSquare } from "lucide-react";

interface BatchOperationsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onTag: () => void;
  onBookmark: () => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export default function BatchOperationsBar({
  selectedCount,
  onDelete,
  onTag,
  onBookmark,
  onClear,
}: BatchOperationsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 safe-bottom"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-900 dark:bg-zinc-800 border border-zinc-700 dark:border-zinc-600 rounded-lg shadow-2xl px-3 md:px-6 py-2 md:py-3 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4">
          <div className="flex items-center justify-between md:justify-start gap-2 text-zinc-50 font-medium">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs md:text-sm">
                {selectedCount} item{selectedCount > 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={onClear}
              className="md:hidden p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-zinc-50 touch-target tap-highlight-transparent"
              title="Clear Selection"
            >
              <X size={16} />
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-zinc-700 dark:bg-zinc-600" />

          <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTag();
              }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-zinc-50 text-xs touch-target touch-manipulation tap-highlight-transparent"
              title="Add Tags"
            >
              <Tag size={14} />
              <span className="hidden sm:inline">Tag</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-zinc-50 text-xs touch-target touch-manipulation tap-highlight-transparent"
              title="Bookmark"
            >
              <Bookmark size={14} />
              <span className="hidden sm:inline">Bookmark</span>
            </button>

            <div className="w-px h-6 bg-zinc-700 dark:bg-zinc-600 hidden sm:block" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 hover:bg-blue-900/50 rounded transition-colors text-zinc-400 hover:text-blue-400 text-xs touch-target touch-manipulation tap-highlight-transparent"
              title="Hide"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Hide</span>
            </button>
          </div>

          <div className="hidden md:block w-px h-6 bg-zinc-700 dark:bg-zinc-600" />

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onClear}
              className="p-2 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-zinc-50 touch-target tap-highlight-transparent"
              title="Clear Selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
