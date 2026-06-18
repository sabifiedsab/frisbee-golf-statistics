"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { PlusCircle, Trophy, LayoutDashboard, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface GameSummary {
  id: string;
  date: string;
  course: { name: string };
  totalStrokes: number;
  totalPutts: number;
  overUnder: number;
}

export default function HomePage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(data);
    } catch {
      toast.error("Failed to load games");
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      await fetchGames();
    } catch {
      toast.error("Failed to delete games");
    } finally {
      setShowDeleteDialog(false);
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Frisbee Golf Stats</h1>
          <p className="text-muted-foreground">Track your progress and improve your game.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/courses/add">
            <Button variant="outline" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Course
            </Button>
          </Link>
          <Link href="/games/add">
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Log Game
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
            <CardTitle className="text-sm font-medium">Next Goal</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Lower your avg</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Recent Games</h2>
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.size})
            </Button>
          )}
        </div>

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
                      <p className="text-sm text-muted-foreground">{new Date(game.date).toLocaleString()}</p>
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
