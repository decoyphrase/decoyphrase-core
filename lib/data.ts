import { LucideIcon } from "lucide-react";

export type FileType = "file" | "folder";
export type FileSubType =
  | "bookmark_folder"
  | "tag_folder"
  | "locked_folder"
  | "normal_folder"
  | "bookmark_file"
  | "tag_file"
  | "locked_file"
  | "normal_file";

export type ViewDisplayMode =
  | "list"
  | "small-icons"
  | "medium-icons"
  | "large-icons"
  | "extra-large-icons";

export interface FileItem {
  id: string;
  parentId: string | null;
  name: string;
  type: FileType;
  dateAccessed: string;
  dateCreated: string;
  dateModified: string;
  size: string;
  location: string;
  status: string;
  content?: string;
  isLocked?: boolean;
  lockExpiry?: string;
  colorTag?: string;
  isBookmarked?: boolean;
  isPinned?: boolean;
  encryptionKey?: string;
  note?: string;
  deletedAt?: string;
}

export const INITIAL_FILES: FileItem[] = [
  {
    id: "1",
    parentId: null,
    name: "Document 1",
    type: "file",
    dateAccessed: "12/9/2025 7:56 PM",
    dateCreated: "10/21/2025 3:23 AM",
    dateModified: "12/9/2025 5:03 PM",
    size: "214 bytes",
    location: "Documents",
    status: "Accessible",
    content: "This is a sample document content.",
    isBookmarked: true,
  },
  {
    id: "2",
    parentId: null,
    name: "Crypto",
    type: "folder",
    dateAccessed: "12/8/2098 3:43 PM",
    dateCreated: "10/20/2025 10:00 AM",
    dateModified: "12/8/2098 3:43 PM",
    size: "-",
    location: "Documents",
    status: "Protected",
    colorTag: "#ef4444",
  },
  {
    id: "3",
    parentId: null,
    name: "Ledger",
    type: "file",
    dateAccessed: "12/8/2102 1:56 PM",
    dateCreated: "11/05/2025 1:20 PM",
    dateModified: "12/8/2102 1:56 PM",
    size: "1.2 KB",
    location: "Documents",
    status: "Encrypted",
    encryptionKey: "1234",
    isLocked: true,
    content: "U2FsdGVkX1+vG7...",
  },
  {
    id: "7",
    parentId: null,
    name: "Social Media",
    type: "folder",
    dateAccessed: "12/6/2102 5:03 PM",
    dateCreated: "08/01/2025 12:00 PM",
    dateModified: "12/6/2102 5:03 PM",
    size: "-",
    location: "Documents",
    status: "Accessible",
    isPinned: true,
  },
];

export interface MenuItemType {
  label?: string;
  icon?: LucideIcon;
  action?: (arg?: unknown) => void;
  shortcut?: string;
  danger?: boolean;
  separator?: boolean;
  subMenu?: boolean;
  subMenuItems?: MenuItemType[];
  colorPicker?: boolean;
  isActive?: boolean;
  disabled?: boolean;
  href?: string;
  external?: boolean;
}

export const TAG_COLORS = [
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#3b82f6",
  "#ffffff",
  "#d946ef",
  "#06b6d4",
];
