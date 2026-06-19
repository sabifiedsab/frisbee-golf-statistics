"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Terminal, CloudSun, Check } from "lucide-react";

const hoverQuery = "(hover: hover) and (pointer: fine)";
const subscribe = (callback: () => void) => {
  const mq = window.matchMedia(hoverQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
};
const getSnapshot = () => window.matchMedia(hoverQuery).matches;
const getServerSnapshot = () => false;

const themes = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "matrix", label: "Matrix", icon: Terminal },
  { key: "sunny", label: "Sunny", icon: CloudSun },
] as const;

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const useHover = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || useHover) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, useHover]);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function selectTheme(key: string) {
    setTheme(key);
    setOpen(false);
  }

  // Current theme — undefined during SSR, resolves on client. Default to "light" icon.
  const currentKey = theme ?? "light";
  const currentTheme = themes.find((t) => t.key === currentKey) ?? themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <div
      ref={containerRef}
      className="relative"
      {...(useHover
        ? {
            onMouseEnter: () => {
              clearCloseTimer();
              setOpen(true);
            },
            onMouseLeave: scheduleClose,
          }
        : {})}
    >
      <button
        type="button"
        onClick={() => !useHover && setOpen((o) => !o)}
        aria-label="Theme menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-colors"
      >
        <CurrentIcon className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[10rem] rounded-md border bg-popover p-1 shadow-md z-50"
          {...(useHover
            ? {
                onMouseEnter: clearCloseTimer,
                onMouseLeave: scheduleClose,
              }
            : {})}
        >
          <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
            Theme
          </div>
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = currentKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="menuitem"
                onClick={() => selectTheme(t.key)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors text-left"
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {isActive && <Check className="h-4 w-4 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
