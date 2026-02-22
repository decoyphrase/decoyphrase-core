"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SelectionBox } from "@/lib/types";
import { getSelectionBounds } from "@/lib/utils";

interface SelectionOverlayProps {
  selectionBox: SelectionBox | null;
  isSelecting: boolean;
}

export default function SelectionOverlay({
  selectionBox,
  isSelecting,
}: SelectionOverlayProps) {
  if (!isSelecting || !selectionBox) return null;

  const bounds = getSelectionBounds(selectionBox);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  if (width < 5 || height < 5) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed pointer-events-none z-50"
        style={{
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 rounded">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
