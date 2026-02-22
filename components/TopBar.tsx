"use client";

import { Home, Search, ChevronRight, Menu, X } from "lucide-react";
import { useVault, BreadcrumbItem } from "@/context/VaultContext";
import { Fragment, useState, useRef, useEffect } from "react";

interface TopBarProps {
  onToggleMobileMenu?: () => void;
}

export default function TopBar({ onToggleMobileMenu }: TopBarProps) {
  const {
    currentView,
    breadcrumbs,
    navigateToFolder,
    setView,
    searchQuery,
    setSearchQuery,
  } = useVault();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const visibleBreadcrumbs =
    breadcrumbs.length > 3
      ? [breadcrumbs[0], breadcrumbs[breadcrumbs.length - 1]]
      : breadcrumbs;

  const hasHiddenCrumbs = breadcrumbs.length > 3;

  return (
    <div className="h-14 md:h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 md:px-6 bg-zinc-50 dark:bg-zinc-900 justify-between flex-shrink-0 gap-2 md:gap-4 safe-top">
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 p-2 -ml-2 touch-target tap-highlight-transparent"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-1 text-zinc-600 dark:text-zinc-400 text-sm font-mono bg-white dark:bg-zinc-800 px-3 md:px-4 py-1.5 md:py-2 rounded border border-zinc-300 dark:border-zinc-700 shadow-sm flex-1 max-w-2xl overflow-hidden">
          <div
            onClick={() => setView("HOME")}
            className="flex items-center gap-2 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors flex-shrink-0 touch-target tap-highlight-transparent"
          >
            <Home size={14} />
            <span
              className={
                currentView === "HOME" ? "text-zinc-900 dark:text-zinc-50" : ""
              }
            >
              Home
            </span>
          </div>

          {currentView === "DOCUMENTS" &&
            visibleBreadcrumbs.map((crumb: BreadcrumbItem, idx: number) => (
              <Fragment key={crumb.id}>
                <ChevronRight
                  size={14}
                  className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                />
                {hasHiddenCrumbs && idx === 0 && breadcrumbs.length > 3 && (
                  <>
                    <span
                      onClick={() => navigateToFolder(crumb.id)}
                      className="cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors truncate touch-target tap-highlight-transparent"
                    >
                      {crumb.name}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">
                      ...
                    </span>
                  </>
                )}
                {(!hasHiddenCrumbs || idx === 1) && (
                  <span
                    onClick={() => navigateToFolder(crumb.id)}
                    className={`cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors truncate touch-target tap-highlight-transparent ${
                      idx === visibleBreadcrumbs.length - 1 ||
                      (hasHiddenCrumbs && idx === 1)
                        ? "text-zinc-900 dark:text-zinc-50"
                        : ""
                    }`}
                  >
                    {crumb.name}
                  </span>
                )}
              </Fragment>
            ))}
        </div>

        <div className="sm:hidden flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 flex-1">
          <Home
            size={14}
            className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
          />
          {currentView === "DOCUMENTS" && breadcrumbs.length > 0 ? (
            <>
              <ChevronRight
                size={14}
                className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
              />
              <span className="text-xs text-zinc-900 dark:text-zinc-50 truncate">
                {breadcrumbs[breadcrumbs.length - 1].name}
              </span>
            </>
          ) : (
            <span className="text-xs text-zinc-900 dark:text-zinc-50">
              {currentView === "HOME"
                ? "Home"
                : currentView === "TRASH"
                  ? "Hidden Files"
                  : currentView === "BOOKMARKS"
                    ? "Bookmarks"
                    : currentView === "DOCUMENTS"
                      ? "Files"
                      : currentView}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`relative transition-all duration-200 ${
            isSearchExpanded ? "w-full" : "w-auto"
          }`}
        >
          <button
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            className="sm:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 p-2 touch-target tap-highlight-transparent"
            aria-label="Search"
          >
            {isSearchExpanded ? <X size={18} /> : <Search size={18} />}
          </button>

          {isSearchExpanded && (
            <div className="sm:hidden absolute right-0 top-12 w-screen max-w-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-2 z-50">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-400"
                  size={14}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    currentView === "HOME" ? "Search Home" : "Search Documents"
                  }
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 pl-9 pr-4 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:border-blue-500 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="hidden sm:block relative w-48 lg:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 dark:text-zinc-400"
              size={14}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                currentView === "HOME" ? "Search Home" : "Search Documents"
              }
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 pl-9 pr-4 py-2 rounded-md text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:border-blue-500 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
