"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { PlusCircle, Trophy, LayoutDashboard, Trash2, LogIn, UserPlus, Medal } from "lucide-react";
import { useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AnalyticsSummary } from "@/components/analytics/analytics-summary";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

interface GameSummary {
  id: string;
  date: string;
  course: { name: string };
  totalStrokes: number;
  totalPutts: number;
  overUnder: number;
  isComplete: boolean;
}

type Tab = "games" | "analytics";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "analytics" || t === "games") return t;
    }
    return "games";
  });
  const isLoading = status === "loading" || isFetching;

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "games") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", next);
    }
    router.replace(url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""));
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchGames();
    }
  }, [status]);

  async function fetchGames() {
    setIsFetching(true);
    try {
      const res = await fetch("/api/games");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (Array.isArray(data)) {
        setGames(data);
      }
    } catch {
      toast.error("Failed to load games");
    } finally {
      setIsFetching(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === games.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(games.map((g) => g.id)));
    }
  }

  async function handleBatchDelete() {
    try {
      const res = await fetch("/api/games", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to delete games");
      toast.success(`${selectedIds.size} game(s) deleted`);
      setSelectedIds(new Set());
      await fetchGames();
    } catch {
      toast.error("Failed to delete games");
    } finally {
      setShowDeleteDialog(false);
    }
  }

  if (status === "loading") {
    return <div className="container mx-auto py-10 text-center">Loading...</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="container mx-auto py-20 px-4 max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Frisbee Golf Stats</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Track your rounds, analyze your game, and improve with every putt.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/login">
            <Button className="w-full" size="lg">
              <LogIn className="mr-2 h-5 w-5" /> Login
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="w-full" size="lg">
              <UserPlus className="mr-2 h-5 w-5" /> Create Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "games", label: "Games" },
    { key: "analytics", label: "Analytics" },
  ];

  const completeGames = games.filter((g) => g.isComplete);
  const bestRound = completeGames.length > 0
    ? completeGames.reduce((best, g) => (g.overUnder < best.overUnder ? g : best), completeGames[0])
    : null;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Your Games</h1>
          <p className="text-muted-foreground">Welcome back, {session.user?.name}.</p>
        </div>
        <div className="flex gap-2">
          {session.user?.isAdmin && (
            <Link href="/courses/add">
              <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Course
              </Button>
            </Link>
          )}
          <Link href="/games/add">
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Log Game
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Games</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{games.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Course</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {games[0]?.course?.name || "None"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Round</CardTitle>
            <Medal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {bestRound ? (
              <>
                <div className={`text-2xl font-bold ${bestRound.overUnder < 0 ? "text-green-600" : bestRound.overUnder > 0 ? "text-red-600" : ""}`}>
                  {bestRound.overUnder === 0 ? "E" : bestRound.overUnder > 0 ? `+${bestRound.overUnder}` : `${bestRound.overUnder}`}
                </div>
                <p className="text-xs text-muted-foreground truncate">{bestRound.course.name}</p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chip tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex gap-1 p-1 bg-muted rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "games" && selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Tab content */}
      {tab === "analytics" ? (
        <AnalyticsSummary />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
              No games logged yet. Get out there and play!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {games.length > 0 && (
                <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selectedIds.size === games.length}
                    onChange={toggleAll}
                  />
                  Select all
                </label>
              )}
              {games.map((game) => (
                <Card
                  key={game.id}
                  className={`hover:bg-accent transition-colors ${selectedIds.has(game.id) ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={selectedIds.has(game.id)}
                      onChange={() => toggleSelect(game.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Link href={`/games/${game.id}`} className="flex-1 flex items-center justify-between min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{game.course.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{formatDateTime(game.date)}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            game.isComplete
                              ? "bg-green-600/10 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {game.isComplete ? "Complete" : "In progress"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{game.totalStrokes} strokes</span>
                          <span
                            className={`text-sm font-semibold ${
                              game.overUnder < 0
                                ? "text-green-600"
                                : game.overUnder > 0
                                  ? "text-red-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {game.overUnder === 0 ? "E" : game.overUnder > 0 ? `+${game.overUnder}` : `${game.overUnder}`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Games"
        message={`Are you sure you want to delete ${selectedIds.size} game(s)? All scores will be permanently removed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
