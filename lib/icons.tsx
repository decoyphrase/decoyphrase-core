import FileDocumentLogo from "@/components/FileDocumentLogo";
import {
  FileText,
  FileJson,
  FileCode,
  Image as ImageIcon,
  FolderOpen,
  Grid3x3,
  Grid2x2,
  LayoutGrid,
  List,
  Upload,
} from "lucide-react";
import { ReactNode } from "react";

export function getFileIcon(fileName: string, size: number): ReactNode {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const commonProps = { size, strokeWidth: size > 20 ? 1 : 1.5 };

  switch (ext) {
    case "json":
      return <FileJson {...commonProps} />;
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <FileCode {...commonProps} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return <ImageIcon {...commonProps} />;
    default:
      return <FileText {...commonProps} />;
  }
}

export function getFolderIcon(size: number, hasContent?: boolean): ReactNode {
  const commonProps = { size, strokeWidth: size > 20 ? 1 : 1.5 };
  return hasContent ? (
    <FolderOpen {...commonProps} />
  ) : (
    <FolderOpen {...commonProps} />
  );
}

export function getViewIcon(mode: string, size: number = 16): ReactNode {
  switch (mode) {
    case "extra-large-icons":
      return <Grid3x3 size={size} strokeWidth={1.5} />;
    case "large-icons":
      return <Grid2x2 size={size} strokeWidth={1.5} />;
    case "medium-icons":
    case "small-icons":
      return <LayoutGrid size={size} strokeWidth={1.5} />;
    case "list":
      return <List size={size} strokeWidth={1.5} />;
    default:
      return <List size={size} strokeWidth={1.5} />;
  }
}

export const ImportIcon = Upload;

export const FilesIcon = FileDocumentLogo;
