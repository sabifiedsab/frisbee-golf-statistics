"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/stepper";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Calendar, Bird, Medal, Frown, ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";

interface HoleScore {
  id: string;
  strokes: number;
  putts: number;
  hole: { id: string; number: number; par: number };
}

interface ParticipantData {
  id: string;
  name: string;
  scores: HoleScore[];
}

interface GameData {
  id: string;
  date: string;
  course: { id: string; name: string; location: string };
  participants: ParticipantData[];
}

interface UserData {
  id: string;
  username: string;
  isAdmin: boolean;
  language: string;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track which scores have been modified locally
  const [localScores, setLocalScores] = useState<Record<string, { strokes: number; putts: number }>>({});
  // Track which score IDs are saving
  const [savingScores, setSavingScores] = useState<Set<string>>(new Set());
  // Which games are expanded
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const gameRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.isAdmin) {
      router.replace("/");
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (res.status === 404) {
          toast.error("User not found");
          router.replace("/admin");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setUser(data.user);
        setGames(data.games);
      } catch {
        toast.error("Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, status, session, router]);

  const handleScoreChange = useCallback(
    async (scoreId: string, strokes: number, putts: number) => {
      setLocalScores((prev) => ({
        ...prev,
        [scoreId]: { strokes, putts },
      }));

      setSavingScores((prev) => new Set(prev).add(scoreId));

      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scoreId, strokes, putts }),
        });

        if (!res.ok) throw new Error("Failed to save");

        const updated = await res.json();
        // Update the games state with the returned score
        setGames((prev) =>
          prev.map((g) => ({
            ...g,
            participants: g.participants.map((p) => ({
              ...p,
              scores: p.scores.map((s) =>
                s.id === scoreId
                  ? { ...s, strokes: updated.strokes, putts: updated.putts }
                  : s
              ),
            })),
          }))
        );
        setLocalScores((prev) => {
          const next = { ...prev };
          delete next[scoreId];
          return next;
        });
      } catch {
        toast.error("Failed to save score");
      } finally {
        setSavingScores((prev) => {
          const next = new Set(prev);
          next.delete(scoreId);
          return next;
        });
      }
    },
    [id]
  );

  const toggleGame = useCallback((gameId: string) => {
    setExpandedGames((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    // When a game is expanded, scroll its card to the top of the screen
    for (const gameId of expandedGames) {
      const el = gameRefs.current[gameId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        break; // only scroll for the most recently expanded
      }
    }
  }, [expandedGames]);

  if (status !== "authenticated" || !session?.user?.isAdmin) {
    return <div className="container mx-auto py-10 text-center">Checking access...</div>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Loading user data...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-muted-foreground">User not found.</p>
        <Link href="/admin">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </div>
    );
  }

  // Compute stats from all games
  let totalGames = 0;
  let totalStrokes = 0;
  let totalPutts = 0;
  let totalHoles = 0;
  let totalBirdies = 0;
  let totalPars = 0;
  let totalBogies = 0;

  for (const game of games) {
    for (const participant of game.participants) {
      if (participant.scores.length > 0) {
        totalGames++;
        for (const score of participant.scores) {
          totalStrokes += score.strokes;
          totalPutts += score.putts;
          totalHoles++;
          if (score.strokes === score.hole.par - 1) totalBirdies++;
          else if (score.strokes === score.hole.par) totalPars++;
          else if (score.strokes === score.hole.par + 1) totalBogies++;
        }
      }
    }
  }

  const avgScore = totalHoles > 0 ? (totalStrokes / totalHoles).toFixed(1) : "—";

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{user.username}</h1>
        {user.isAdmin && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Admin</span>
        )}
        <span className="text-sm text-muted-foreground">
          {user.language === "no" ? "Norwegian" : "English"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Birdies</CardTitle>
            <Bird className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBirdies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pars</CardTitle>
            <Medal className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPars}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bogies</CardTitle>
            <Frown className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBogies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Games */}
      <h2 className="text-2xl font-semibold mb-4">Game Log</h2>
      {games.length === 0 ? (
        <p className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
          This user has not played any games yet.
        </p>
      ) : (
        <div className="space-y-4">
          {games.map((game) => {
            const isExpanded = expandedGames.has(game.id);
            const participant = game.participants[0];
            const scores = participant?.scores ?? [];
            const gameTotalStrokes = scores.reduce((s, sc) => s + sc.strokes, 0);
            const gameTotalPutts = scores.reduce((s, sc) => s + sc.putts, 0);
            const gameTotalPar = scores.reduce((s, sc) => s + sc.hole.par, 0);
            const vsPar = gameTotalStrokes > 0 ? gameTotalStrokes - gameTotalPar : 0;
            const d = new Date(game.date);
            const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

            return (
              <Card key={game.id} ref={(el) => { gameRefs.current[game.id] = el; }}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleGame(game.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{game.course.name}</p>
                          <p className="text-sm text-muted-foreground">{timeStr}, {formatDate(game.date)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold tabular-nums">
                          {gameTotalStrokes > 0 ? `${gameTotalStrokes} strokes` : "No scores"}
                        </p>
                        {gameTotalStrokes > 0 && (
                          <p className={`text-sm tabular-nums ${vsPar < 0 ? "text-green-500" : vsPar > 0 ? "text-red-400" : ""}`}>
                            {vsPar === 0 ? "Even" : vsPar < 0 ? `${vsPar} under` : `+${vsPar}`} · {gameTotalPutts} putts
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {isExpanded && scores.length > 0 && (
                  <div className="overflow-x-auto px-4 pb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-1 pr-3">Hole</th>
                          <th className="text-center py-1 px-2">Par</th>
                          <th className="text-center py-1 px-2">Strokes</th>
                          <th className="text-center py-1 px-2">Putts</th>
                          <th className="text-center py-1 pl-2">vs Par</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((score) => {
                          const local = localScores[score.id];
                          const strokes = local?.strokes ?? score.strokes;
                          const putts = local?.putts ?? score.putts;
                          const diff = strokes - score.hole.par;
                          const isSaving = savingScores.has(score.id);

                          return (
                            <tr key={score.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                              <td className="py-2 pr-3 font-medium">{score.hole.number}</td>
                              <td className="text-center py-2 px-2 text-muted-foreground">{score.hole.par}</td>
                              <td className="text-center py-2 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Stepper
                                    value={strokes}
                                    min={0}
                                    onChange={(v) => handleScoreChange(score.id, v, putts)}
                                  />
                                  {isSaving && (
                                    <span className="text-xs text-muted-foreground ml-1 animate-pulse">...</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-center py-2 px-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Stepper
                                    value={putts}
                                    min={0}
                                    onChange={(v) => handleScoreChange(score.id, strokes, v)}
                                  />
                                  {isSaving && (
                                    <span className="text-xs text-muted-foreground ml-1 animate-pulse">...</span>
                                  )}
                                </div>
                              </td>
                              <td className={`text-center py-2 pl-2 font-medium tabular-nums ${
                                diff < 0 ? "text-green-500" : diff > 0 ? "text-red-400" : ""
                              }`}>
                                {diff === 0 ? "E" : diff < 0 ? `${diff}` : `+${diff}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
