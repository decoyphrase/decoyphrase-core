"use client";

import { useRef, useState } from "react";
import {
  Home,
  Bookmark,
  FileText,
  User,
  Settings,
  LogOut,
  Download,
  Heart,
  Moon,
  Sun,
  HelpCircle,
  PanelLeftClose,
  Map,
  ChevronRight,
  Pin,
  X,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import { MenuDropdown } from "./ui/MenuComponents";
import { MenuItemType } from "@/lib/data";
import { HELP_MENU_ITEMS } from "@/lib/config/menu";
import { useTheme } from "next-themes";
import { useVault } from "@/context/VaultContext";
import { useArweave } from "@/context/ArweaveContext";
import Logo from "./Logo";
import { UI_LABELS } from "@/lib/constants";
import { FilesIcon } from "@/lib/icons";

export type ViewState = "HOME" | "DOCUMENTS" | "TRASH" | "BOOKMARKS";

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export default function Sidebar({
  currentView,
  onChangeView,
  isMobileMenuOpen,
  onToggleMobileMenu,
}: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { isSidebarCollapsed, toggleSidebarCollapse, stats, files, openFile } =
    useVault();
  const { username, isAuthenticated, logout } = useArweave();

  const pinnedFiles = files.filter((f) => f.isPinned && !f.deletedAt);

  const navItemClass =
    "flex items-center gap-3 px-3 py-2 md:py-2 rounded-md cursor-pointer transition-colors text-sm font-medium mb-1 touch-target tap-highlight-transparent";
  const activeClass =
    "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50";
  const inactiveClass =
    "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800";

  const handleThemeSelect = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setIsThemeMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const profileMenuItems: MenuItemType[] = [
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      action: () => {
        setIsProfileMenuOpen(false);
        onToggleMobileMenu();
      },
    },
    {
      label: "Theme",
      icon: Moon,
      action: () => {
        setIsThemeMenuOpen(!isThemeMenuOpen);
      },
      subMenuItems: [
        {
          label: "Light",
          icon: Sun,
          action: () => handleThemeSelect("light"),
          isActive: theme === "light",
        },
        {
          label: "Dark",
          icon: Moon,
          action: () => handleThemeSelect("dark"),
          isActive: theme === "dark",
        },
        {
          label: "System",
          icon: Sun,
          action: () => handleThemeSelect("system"),
          isActive: theme === "system",
        },
      ],
    },
    {
      label: "Donate",
      icon: Heart,
      href: "https://decoyphrase.arweave.net/donate/",
      external: true,
      action: () => {
        setIsProfileMenuOpen(false);
      },
    },
    {
      label: UI_LABELS.DOWNLOAD_DECOY_GENERATOR,
      icon: Download,
      href: "https://decoyphrase.arweave.net/download/",
      external: true,
      action: () => {
        setIsProfileMenuOpen(false);
      },
    },
    { separator: true },
    {
      label: "Help",
      icon: HelpCircle,
      action: () => {
        setIsHelpMenuOpen(!isHelpMenuOpen);
      },
      subMenuItems: HELP_MENU_ITEMS,
    },
    ...(isAuthenticated
      ? [
          { separator: true },
          {
            label: "Logout",
            icon: LogOut,
            action: async () => {
              await logout();
              setIsProfileMenuOpen(false);
              onToggleMobileMenu();
            },
            danger: true,
          },
        ]
      : []),
  ];

  const handleLogoClick = () => {
    if (isSidebarCollapsed && window.innerWidth >= 768) {
      toggleSidebarCollapse();
    }
  };

  const handleNavClick = (view: ViewState) => {
    onChangeView(view);
    if (window.innerWidth < 768) {
      onToggleMobileMenu();
    }
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onToggleMobileMenu}
        />
      )}

      <div
        className={clsx(
          "bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full font-mono flex-shrink-0 transition-all duration-300 ease-in-out",
          "fixed md:relative inset-y-0 left-0 z-9999 md:z-0",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed ? "w-64 md:w-20" : "w-64",
        )}
      >
        <div className="p-4 md:p-6 pb-4 flex items-center justify-between">
          <Logo
            className={clsx(
              "w-6 h-6 cursor-pointer",
              isSidebarCollapsed && window.innerWidth >= 768 && "mx-auto",
            )}
            onClick={handleLogoClick}
          />
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:block text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded touch-target"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded touch-target"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar">
          <div
            onClick={() => handleNavClick("HOME")}
            className={clsx(
              navItemClass,
              currentView === "HOME" ? activeClass : inactiveClass,
              isSidebarCollapsed &&
                window.innerWidth >= 768 &&
                "justify-center",
            )}
            title={
              isSidebarCollapsed && window.innerWidth >= 768
                ? UI_LABELS.HOME
                : undefined
            }
          >
            <Home size={18} strokeWidth={1.5} />
            {(!isSidebarCollapsed || window.innerWidth < 768) && (
              <span>{UI_LABELS.HOME}</span>
            )}
          </div>
          <div
            onClick={() => handleNavClick("BOOKMARKS")}
            className={clsx(
              navItemClass,
              currentView === "BOOKMARKS" ? activeClass : inactiveClass,
              isSidebarCollapsed &&
                window.innerWidth >= 768 &&
                "justify-center",
            )}
            title={
              isSidebarCollapsed && window.innerWidth >= 768
                ? UI_LABELS.BOOKMARKS
                : undefined
            }
          >
            <Bookmark size={18} strokeWidth={1.5} />
            {(!isSidebarCollapsed || window.innerWidth < 768) && (
              <span>{UI_LABELS.BOOKMARKS}</span>
            )}
          </div>

          {(!isSidebarCollapsed || window.innerWidth < 768) &&
            pinnedFiles.length > 0 && (
              <>
                <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Pin size={12} />
                  Pinned
                </div>

                {pinnedFiles.slice(0, 10).map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      openFile(file.id);
                      if (window.innerWidth < 768) {
                        onToggleMobileMenu();
                      }
                    }}
                    className={clsx(
                      navItemClass,
                      inactiveClass,
                      "pl-6 text-xs",
                    )}
                    title={file.name}
                  >
                    <FileText size={14} strokeWidth={1.5} />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </>
            )}

          {(!isSidebarCollapsed || window.innerWidth < 768) && (
            <div className="mt-6 mb-2 px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Storage
            </div>
          )}

          <div
            onClick={() => handleNavClick("DOCUMENTS")}
            className={clsx(
              navItemClass,
              currentView === "DOCUMENTS" ? activeClass : inactiveClass,
              isSidebarCollapsed &&
                window.innerWidth >= 768 &&
                "justify-center mt-6",
            )}
            title={
              isSidebarCollapsed && window.innerWidth >= 768
                ? UI_LABELS.FILES
                : undefined
            }
          >
            <FilesIcon width={18} height={18} />
            {(!isSidebarCollapsed || window.innerWidth < 768) && (
              <span>{UI_LABELS.FILES}</span>
            )}
          </div>

          {stats.totalMappings > 0 && (
            <div
              className={clsx(
                navItemClass,
                inactiveClass,
                isSidebarCollapsed &&
                  window.innerWidth >= 768 &&
                  "justify-center",
              )}
              title={
                isSidebarCollapsed && window.innerWidth >= 768
                  ? "Mappings"
                  : undefined
              }
            >
              <Map size={18} strokeWidth={1.5} />
              {(!isSidebarCollapsed || window.innerWidth < 768) && (
                <span className="flex items-center justify-between w-full">
                  Mappings
                  <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    {stats.totalMappings}
                  </span>
                </span>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 safe-bottom">
          <div
            onClick={() => handleNavClick("TRASH")}
            className={clsx(
              "flex items-center gap-2 cursor-pointer mb-4 text-sm px-2 transition-colors rounded-md py-2 touch-target",
              currentView === "TRASH"
                ? "text-red-400 dark:text-red-600"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              isSidebarCollapsed &&
                window.innerWidth >= 768 &&
                "justify-center",
            )}
            title={
              isSidebarCollapsed && window.innerWidth >= 768
                ? "Hidden Files"
                : undefined
            }
          >
            <Eye size={16} strokeWidth={1.5} />
            {(!isSidebarCollapsed || window.innerWidth < 768) && (
              <span>Hidden Files</span>
            )}
          </div>

          <div className="relative">
            <div
              ref={profileRef}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={clsx(
                "flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 px-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors p-2 -mx-2 touch-target",
                isSidebarCollapsed &&
                  window.innerWidth >= 768 &&
                  "justify-center",
              )}
              title={
                isSidebarCollapsed && window.innerWidth >= 768
                  ? "Profile"
                  : undefined
              }
            >
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-zinc-900 dark:text-zinc-50" />
              </div>
              {(!isSidebarCollapsed || window.innerWidth < 768) && (
                <>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {isAuthenticated ? username : "Not Logged In"}
                    </p>
                  </div>
                  <ChevronRight
                    className={clsx(
                      "text-zinc-500 dark:text-zinc-400 transition-transform",
                      isProfileMenuOpen ? "rotate-90" : "",
                    )}
                    size={16}
                  />
                </>
              )}
            </div>

            {true && (
              <MenuDropdown
                isOpen={isProfileMenuOpen}
                onClose={() => setIsProfileMenuOpen(false)}
                items={profileMenuItems}
                anchorRef={profileRef}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
