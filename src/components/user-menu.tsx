"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const hoverQuery = "(hover: hover) and (pointer: fine)";
const subscribe = (callback: () => void) => {
  const mq = window.matchMedia(hoverQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
};
const getSnapshot = () => window.matchMedia(hoverQuery).matches;
const getServerSnapshot = () => false;

export function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const useHover = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click-outside to close (used for tap mode)
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

  function handleSignOut() {
    setOpen(false);
    signOut({ redirect: false }).then(() => router.push("/"));
  }

  if (!session?.user?.name) return null;

  const initial = session.user.name.charAt(0).toUpperCase();

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
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold transition-colors",
          "hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        {initial}
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
            {session.user.name}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors text-left"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
