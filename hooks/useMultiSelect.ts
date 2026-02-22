import { useState, useCallback, useRef, useEffect } from "react";
import type {
  SelectionState,
  SelectionBox,
  FileItem,
  FilePosition,
} from "@/lib/types";
import {
  getFilesInBoundingBox,
  getRangeSelection,
  collectFilePositions,
} from "@/lib/utils";

interface UseMultiSelectOptions {
  files: FileItem[];
  onSelectionChange?: (selectedIds: Set<string>) => void;
  disabled?: boolean;
}

interface UseMultiSelectReturn {
  selectionState: SelectionState;
  isFileSelected: (fileId: string) => boolean;
  handleFileClick: (fileId: string, event: React.MouseEvent) => void;
  handleMouseDown: (event: React.MouseEvent) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  handleMouseUp: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  getSelectedFiles: () => FileItem[];
}

export function useMultiSelect({
  files,
  onSelectionChange,
  disabled = false,
}: UseMultiSelectOptions): UseMultiSelectReturn {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedFileIds: new Set<string>(),
    isSelecting: false,
    selectionBox: null,
    lastSelectedId: null,
    anchorId: null,
  });

  const containerRef = useRef<HTMLElement | null>(null);
  const filePositionsRef = useRef<FilePosition[]>([]);
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectionState.selectedFileIds);
    }
  }, [selectionState.selectedFileIds, onSelectionChange]);

  const selectAll = useCallback(() => {
    if (disabled) return;
    const allIds = new Set(files.map((f) => f.id));
    setSelectionState((prev) => ({
      ...prev,
      selectedFileIds: allIds,
      lastSelectedId: files[files.length - 1]?.id || null,
    }));
  }, [files, disabled]);

  const clearSelection = useCallback(() => {
    setSelectionState((prev) => ({
      ...prev,
      selectedFileIds: new Set(),
      lastSelectedId: null,
      anchorId: null,
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        selectAll();
      }

      if (e.key === "Escape") {
        clearSelection();
      }

      if (e.key === "Delete" && selectionState.selectedFileIds.size > 0) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    disabled,
    selectAll,
    clearSelection,
    selectionState.selectedFileIds.size,
  ]);

  const isFileSelected = useCallback(
    (fileId: string): boolean => {
      return selectionState.selectedFileIds.has(fileId);
    },
    [selectionState.selectedFileIds],
  );

  const handleFileClick = useCallback(
    (fileId: string, event: React.MouseEvent) => {
      if (disabled) return;

      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        setSelectionState((prev) => {
          const newSelection = new Set(prev.selectedFileIds);
          if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
          } else {
            newSelection.add(fileId);
          }
          return {
            ...prev,
            selectedFileIds: newSelection,
            lastSelectedId: fileId,
            anchorId: fileId,
          };
        });
      } else if (event.shiftKey && selectionState.lastSelectedId) {
        const rangeIds = getRangeSelection(
          files,
          selectionState.lastSelectedId,
          fileId,
        );
        setSelectionState((prev) => {
          const newSelection = new Set(prev.selectedFileIds);
          rangeIds.forEach((id) => newSelection.add(id));
          return {
            ...prev,
            selectedFileIds: newSelection,
            lastSelectedId: fileId,
          };
        });
      } else {
        setSelectionState({
          selectedFileIds: new Set([fileId]),
          isSelecting: false,
          selectionBox: null,
          lastSelectedId: fileId,
          anchorId: fileId,
        });
      }
    },
    [disabled, files, selectionState.lastSelectedId],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;
      if (event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target as HTMLElement;
      if (target.closest("[data-file-id]")) return;

      isMouseDownRef.current = true;

      const container = (event.currentTarget as HTMLElement).querySelector(
        "[data-files-container]",
      );
      if (container) {
        containerRef.current = container as HTMLElement;
        filePositionsRef.current = collectFilePositions(containerRef.current);
      }

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setSelectionState((prev) => ({
        ...prev,
        isSelecting: true,
        selectionBox: {
          startX: event.clientX + scrollLeft,
          startY: event.clientY + scrollTop,
          currentX: event.clientX + scrollLeft,
          currentY: event.clientY + scrollTop,
        },
        selectedFileIds: new Set(),
      }));
    },
    [disabled],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (disabled || !isMouseDownRef.current || !selectionState.isSelecting)
        return;
      if (!selectionState.selectionBox) return;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setSelectionState((prev) => {
        if (!prev.selectionBox) return prev;

        const updatedBox: SelectionBox = {
          ...prev.selectionBox,
          currentX: event.clientX + scrollLeft,
          currentY: event.clientY + scrollTop,
        };

        const selectedIds = getFilesInBoundingBox(
          filePositionsRef.current,
          updatedBox,
        );

        return {
          ...prev,
          selectionBox: updatedBox,
          selectedFileIds: new Set(selectedIds),
        };
      });
    },
    [disabled, selectionState.isSelecting, selectionState.selectionBox],
  );

  const handleMouseUp = useCallback(() => {
    if (disabled) return;

    isMouseDownRef.current = false;

    setSelectionState((prev) => ({
      ...prev,
      isSelecting: false,
      selectionBox: null,
      lastSelectedId:
        prev.selectedFileIds.size === 1
          ? Array.from(prev.selectedFileIds)[0]
          : prev.lastSelectedId,
    }));
  }, [disabled]);

  const getSelectedFiles = useCallback((): FileItem[] => {
    return files.filter((f) => selectionState.selectedFileIds.has(f.id));
  }, [files, selectionState.selectedFileIds]);

  return {
    selectionState,
    isFileSelected,
    handleFileClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    selectAll,
    clearSelection,
    getSelectedFiles,
  };
}
