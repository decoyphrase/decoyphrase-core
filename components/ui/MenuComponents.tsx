"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import { MenuItemType, TAG_COLORS } from "@/lib/data";
import Link from "next/link";

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItemType[];
  position?: { x: number; y: number };
  anchorRef?: React.RefObject<HTMLElement | null>;
  isSubMenu?: boolean;
  parentMenuRef?: React.RefObject<HTMLDivElement | null>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
}

export function MenuDropdown({
  isOpen,
  onClose,
  items,
  position,
  anchorRef,
  isSubMenu = false,
  parentMenuRef,
  onMouseEnter,
}: MenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubMenuIndex, setActiveSubMenuIndex] = useState<number | null>(
    null,
  );
  const [subMenuRects, setSubMenuRects] = useState<
    Map<number, { left: number; top: number }>
  >(new Map());
  const subMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const PADDING = 8;

    menu.style.position = "fixed";
    menu.style.margin = "0";

    if (position) {
      let x = position.x;
      let y = position.y;

      if (x + menuRect.width > viewportWidth - PADDING) {
        x = Math.max(PADDING, viewportWidth - menuRect.width - PADDING);
      }
      if (x < PADDING) {
        x = PADDING;
      }

      if (y + menuRect.height > viewportHeight - PADDING) {
        y = Math.max(PADDING, viewportHeight - menuRect.height - PADDING);
      }
      if (y < PADDING) {
        y = PADDING;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      return;
    }

    if (anchorRef?.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();

      let x = anchorRect.left;
      let y = anchorRect.bottom + 4;

      if (x + menuRect.width > viewportWidth - PADDING) {
        x = Math.max(PADDING, anchorRect.right - menuRect.width);
      }
      if (x < PADDING) {
        x = PADDING;
      }

      const spaceBelow = viewportHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;

      if (spaceBelow < menuRect.height + PADDING && spaceAbove > spaceBelow) {
        y = anchorRect.top - menuRect.height - 4;
        if (y < PADDING) {
          y = PADDING;
        }
      } else {
        if (y + menuRect.height > viewportHeight - PADDING) {
          y = Math.max(PADDING, viewportHeight - menuRect.height - PADDING);
        }
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [isOpen, position, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        const clickedOnParent = parentMenuRef?.current?.contains(target);

        if (!isSubMenu && !clickedOnParent) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener(
        "touchstart",
        handleClickOutside as (e: Event) => void,
      );
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener(
        "touchstart",
        handleClickOutside as (e: Event) => void,
      );
    };
  }, [isOpen, onClose, isSubMenu, parentMenuRef]);

  useEffect(() => {
    return () => {
      if (subMenuTimeoutRef.current) {
        clearTimeout(subMenuTimeoutRef.current);
      }
    };
  }, []);

  const handleSubMenuPosition = (itemIndex: number) => {
    const itemElement = itemRefs.current.get(itemIndex);
    if (!itemElement) return;

    const itemRect = itemElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const SUBMENU_WIDTH = 240;
    const SUBMENU_HEIGHT = 300;
    const PADDING = 8;

    let left = itemRect.right + 4;
    let top = itemRect.top - 4;

    const spaceRight = viewportWidth - itemRect.right;
    const spaceLeft = itemRect.left;

    if (spaceRight < SUBMENU_WIDTH + PADDING && spaceLeft > spaceRight) {
      left = itemRect.left - SUBMENU_WIDTH - 4;
    }

    if (left < PADDING) {
      left = PADDING;
    }

    if (left + SUBMENU_WIDTH > viewportWidth - PADDING) {
      left = viewportWidth - SUBMENU_WIDTH - PADDING;
    }

    const spaceBelow = viewportHeight - itemRect.top;
    if (spaceBelow < SUBMENU_HEIGHT + PADDING) {
      top = Math.max(PADDING, viewportHeight - SUBMENU_HEIGHT - PADDING);
    }

    if (top < PADDING) {
      top = PADDING;
    }

    setSubMenuRects((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemIndex, { left, top });
      return newMap;
    });
  };

  const handleMouseEnterItem = (idx: number, hasSubMenu: boolean) => {
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current);
      subMenuTimeoutRef.current = null;
    }

    if (hasSubMenu) {
      setActiveSubMenuIndex(idx);
      handleSubMenuPosition(idx);
    } else {
      setActiveSubMenuIndex(null);
    }
  };

  const handleMouseLeaveItem = () => {
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current);
    }

    subMenuTimeoutRef.current = setTimeout(() => {
      setActiveSubMenuIndex(null);
    }, 200);
  };

  const handleMouseEnterSubMenu = () => {
    if (subMenuTimeoutRef.current) {
      clearTimeout(subMenuTimeoutRef.current);
      subMenuTimeoutRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed min-w-[200px] md:min-w-[220px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xl py-1"
      style={{ zIndex: isSubMenu ? 70 : 50 }}
      onMouseEnter={onMouseEnter}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${idx}`}
              className="h-[1px] bg-zinc-300 dark:bg-zinc-700 my-1 mx-2"
            />
          );
        }

        if (item.colorPicker) {
          return (
            <div key={`colorpicker-${idx}`} className="px-3 py-2">
              <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-2 uppercase font-bold tracking-wider px-1">
                Tags
              </div>
              <div className="grid grid-cols-4 md:flex md:flex-wrap gap-2 px-1">
                {TAG_COLORS.map((color) => (
                  <div
                    key={color}
                    onClick={() => {
                      item.action?.(color);
                      onClose();
                    }}
                    className="w-5 h-5 md:w-4 md:h-4 rounded-full cursor-pointer hover:scale-110 transition-transform border border-transparent hover:border-zinc-900 dark:hover:border-zinc-50 touch-manipulation tap-highlight-transparent"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          );
        }

        const Icon = item.icon;
        const hasSubMenu = !!item.subMenuItems && item.subMenuItems.length > 0;
        const isSubMenuActive = activeSubMenuIndex === idx;
        const subMenuRect = subMenuRects.get(idx);
        const isDisabled = item.disabled;

        if (item.href && !isDisabled) {
          return (
            <div
              key={`item-${idx}`}
              className="relative"
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(idx, el);
                }
              }}
              onMouseEnter={() =>
                !isDisabled && handleMouseEnterItem(idx, hasSubMenu)
              }
              onMouseLeave={() => !isDisabled && handleMouseLeaveItem()}
            >
              <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => {
                  if (item.action) item.action();
                  onClose();
                }}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 mx-1 rounded text-xs md:text-sm select-none relative touch-manipulation tap-highlight-transparent ${
                  isDisabled
                    ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                    : item.danger
                      ? "text-red-400 hover:bg-red-950/20 cursor-pointer"
                      : "text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                } ${isSubMenuActive && !isDisabled ? "bg-zinc-200 dark:bg-zinc-700" : ""} ${
                  item.isActive ? "text-zinc-900 dark:text-zinc-50" : ""
                }`}
              >
                {Icon && (
                  <Icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.isActive && (
                  <Check size={14} className="text-blue-500 flex-shrink-0" />
                )}
                {hasSubMenu && (
                  <ChevronRight
                    size={14}
                    className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                  />
                )}
                {item.shortcut && (
                  <span className="hidden md:inline text-[10px] text-zinc-600 dark:text-zinc-400 font-mono flex-shrink-0">
                    {item.shortcut}
                  </span>
                )}
              </Link>
            </div>
          );
        }

        return (
          <div
            key={`item-${idx}`}
            className="relative"
            ref={(el) => {
              if (el) {
                itemRefs.current.set(idx, el);
              }
            }}
            onMouseEnter={() =>
              !isDisabled && handleMouseEnterItem(idx, hasSubMenu)
            }
            onMouseLeave={() => !isDisabled && handleMouseLeaveItem()}
          >
            <div
              onClick={() => {
                if (!hasSubMenu && item.action && !isDisabled) {
                  item.action();
                  onClose();
                }
              }}
              className={`flex items-center gap-2 md:gap-3 px-3 py-2 mx-1 rounded text-xs md:text-sm select-none relative touch-manipulation tap-highlight-transparent ${
                isDisabled
                  ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  : item.danger
                    ? "text-red-400 hover:bg-red-950/20 cursor-pointer"
                    : "text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              } ${isSubMenuActive && !isDisabled ? "bg-zinc-200 dark:bg-zinc-700" : ""} ${
                item.isActive ? "text-zinc-900 dark:text-zinc-50" : ""
              }`}
            >
              {Icon && (
                <Icon size={16} strokeWidth={1.5} className="flex-shrink-0" />
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {item.isActive && (
                <Check size={14} className="text-blue-500 flex-shrink-0" />
              )}
              {hasSubMenu && (
                <ChevronRight
                  size={14}
                  className="text-zinc-600 dark:text-zinc-400 flex-shrink-0"
                />
              )}
              {item.shortcut && (
                <span className="hidden md:inline text-[10px] text-zinc-600 dark:text-zinc-400 font-mono flex-shrink-0">
                  {item.shortcut}
                </span>
              )}
            </div>

            {hasSubMenu && isSubMenuActive && subMenuRect && (
              <MenuDropdown
                isOpen={true}
                onClose={onClose}
                items={item.subMenuItems!}
                isSubMenu={true}
                parentMenuRef={menuRef}
                position={{ x: subMenuRect.left, y: subMenuRect.top }}
                onMouseEnter={handleMouseEnterSubMenu}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
