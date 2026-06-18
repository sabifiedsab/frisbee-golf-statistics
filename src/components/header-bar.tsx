"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function HeaderBar() {
  const pathname = usePathname();

  if (pathname?.includes("/play")) return null;

  return (
    <header className="border-b">
      <div className="container mx-auto max-w-4xl flex items-center justify-between px-4 h-14">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight">Frisbee Golf Stats</Link>
          <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
