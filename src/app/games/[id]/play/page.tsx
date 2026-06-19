"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Grid3x3, House, Minus, Plus, Flag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Hole {
  id: string;
  number: number;
  par: number;
}

interface Participant {
  id: string;
  name: string;
  userId?: string;
  scores: ScoreData[];
}

interface ScoreData {
  id: string;
  holeId: string;
  strokes: number;
  putts: number;
}

interface Game {
  id: string;
  date: string;
  course: {
    name: string;
    holes: Hole[];
  };
  participants: Participant[];
}

export default function PlayModePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [holeIndex, setHoleIndex] = useState(0);
  const [participantIndex, setParticipantIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, { strokes: number; putts: number; edited: boolean }>>({});
  const scoresByParticipant = useRef<Record<string, Record<string, { strokes: number; putts: number; edited: boolean }>>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSave = useRef<Record<string, { participantId: string; holeId: string; strokes: number; putts: number }>>({});
  const touchStartX = useRef(0);

  const buildScoreMap = useCallback((participantScores: ScoreData[], holes: Hole[]) => {
    const map: Record<string, { strokes: number; putts: number; edited: boolean }> = {};
    holes.forEach((hole) => {
      const existing = participantScores.find((s) => s.holeId === hole.id);
      map[hole.id] = {
        strokes: existing?.strokes ?? hole.par,
        putts: existing?.putts ?? 0,
        edited: !!existing,
      };
    });
    return map;
  }, []);

  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${id}`);
        if (!res.ok) throw new Error("Failed to fetch game");
        const data: Game = await res.json();
        setGame(data);

        if (data.participants && data.participants.length > 0) {
          const holes = data.course.holes;
          const byParticipant: Record<string, Record<string, { strokes: number; putts: number; edited: boolean }>> = {};
          data.participants.forEach((p: Participant) => {
            byParticipant[p.id] = buildScoreMap(p.scores || [], holes);
          });
          scoresByParticipant.current = byParticipant;

          const currentUserId = session?.user?.id;
          const myIndex = data.participants.findIndex((p: Participant) => p.userId === currentUserId);
          const targetIndex = myIndex >= 0 ? myIndex : 0;
          setParticipantIndex(targetIndex);
          setScores(byParticipant[data.participants[targetIndex].id] || {});
        }
      } catch {
        toast.error("Failed to load game");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchGame();
  }, [id, session, buildScoreMap]);

  const holes = game?.course.holes.sort((a, b) => a.number - b.number) ?? [];
  const currentHole = holes[holeIndex];
  const currentScore = currentHole ? scores[currentHole.id] : null;
  const strokes = currentScore?.strokes ?? 0;
  const putts = currentScore?.putts ?? 0;

  const saveScore = useCallback((participantId: string, holeId: string, strokesVal: number, puttsVal: number) => {
    const key = `${participantId}:${holeId}`;
    pendingSave.current[key] = { participantId, holeId, strokes: strokesVal, putts: puttsVal };
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      const v = pendingSave.current[key];
      if (!v) return;
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: v.participantId, holeId: v.holeId, strokes: v.strokes, putts: v.putts }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        toast.error("Failed to save score");
      } finally {
        delete saveTimers.current[key];
        delete pendingSave.current[key];
      }
    }, 400);
  }, []);

  // Flush any unsaved values when navigating away so nothing is lost
  useEffect(() => {
    const timers = saveTimers.current;
    const pending = pendingSave.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      Object.entries(pending).forEach(([key, v]) => {
        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: v.participantId, holeId: v.holeId, strokes: v.strokes, putts: v.putts }),
        }).catch(() => {});
        delete pending[key];
      });
    };
  }, []);

  const updateScore = useCallback((holeId: string, participantId: string, strokesVal: number, puttsVal: number) => {
    scoresByParticipant.current[participantId] = {
      ...scoresByParticipant.current[participantId],
      [holeId]: { strokes: strokesVal, putts: puttsVal, edited: true },
    };
    setScores((prev) => ({ ...prev, [holeId]: { strokes: strokesVal, putts: puttsVal, edited: true } }));
    saveScore(participantId, holeId, strokesVal, puttsVal);
  }, [saveScore]);

  const goToHole = useCallback((index: number) => {
    if (index >= 0 && index < holes.length) setHoleIndex(index);
  }, [holes.length]);

  const addStroke = useCallback(() => {
    if (!game || !currentHole || !game.participants[participantIndex]) return;
    const newStrokes = strokes + 1;
    const newPutts = Math.min(putts, newStrokes);
    updateScore(currentHole.id, game.participants[participantIndex].id, newStrokes, newPutts);
  }, [currentHole, strokes, putts, updateScore, game, participantIndex]);

  const removeStroke = useCallback(() => {
    if (!game || !currentHole || strokes <= 1) return;
    const newStrokes = strokes - 1;
    const newPutts = Math.min(putts, newStrokes);
    updateScore(currentHole.id, game.participants[participantIndex].id, newStrokes, newPutts);
  }, [currentHole, strokes, putts, updateScore, game, participantIndex]);

  function addPutt() {
    if (!game || !currentHole || !game.participants[participantIndex]) return;
    if (putts >= strokes) return;
    updateScore(currentHole.id, game.participants[participantIndex].id, strokes, putts + 1);
  }

  function removePutt() {
    if (!game || !currentHole || !game.participants[participantIndex]) return;
    if (putts <= 0) return;
    updateScore(currentHole.id, game.participants[participantIndex].id, strokes, putts - 1);
  }

  const finishGame = useCallback(async () => {
    if (!game || !game.participants[participantIndex]) return;
    const participant = game.participants[participantIndex];
    const participantScores = scoresByParticipant.current[participant.id] || {};

    // Fill par for untouched holes
    const fillPromises: Promise<Response>[] = [];
    game.course.holes.forEach((hole) => {
      const s = participantScores[hole.id];
      if (!s || !s.edited) {
        scoresByParticipant.current[participant.id] = {
          ...scoresByParticipant.current[participant.id],
          [hole.id]: { strokes: hole.par, putts: 0, edited: true },
        };
        fillPromises.push(
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: participant.id, holeId: hole.id, strokes: hole.par, putts: 0 }),
          })
        );
      }
    });

    // Clear any pending debounced saves first
    Object.values(saveTimers.current).forEach(clearTimeout);
    Object.entries(pendingSave.current).forEach(([key, v]) => {
      fillPromises.push(
        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: v.participantId, holeId: v.holeId, strokes: v.strokes, putts: v.putts }),
        })
      );
      delete pendingSave.current[key];
    });

    try {
      await Promise.all(fillPromises);
      toast.success("Round complete!");
    } catch {
      toast.error("Some scores may not have saved");
    } finally {
      router.push(`/games/${id}`);
    }
  }, [game, participantIndex, router, id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goToHole(holeIndex - 1);
      else if (e.key === "ArrowRight") {
        if (holeIndex === holes.length - 1) finishGame();
        else goToHole(holeIndex + 1);
      }
      else if (e.key === "+" || e.key === "=") addStroke();
      else if (e.key === "-") removeStroke();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [holeIndex, goToHole, addStroke, removeStroke, finishGame, holes.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        if (holeIndex === holes.length - 1) finishGame();
        else goToHole(holeIndex + 1);
      } else goToHole(holeIndex - 1);
    }
  }

  const computeTotals = useCallback(() => {
    if (!game) return { totalStrokes: 0, totalPar: 0, overUnder: 0 };
    let totalStrokesCalc = 0;
    game.course.holes.forEach((hole) => {
      const s = scores[hole.id];
      if (s) totalStrokesCalc += s.strokes || 0;
    });
    const totalPar = game.course.holes.reduce((sum, h) => sum + h.par, 0);
    return { totalStrokes: totalStrokesCalc, totalPar, overUnder: totalStrokesCalc - totalPar };
  }, [game, scores]);

  const totals = computeTotals();

  if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!game) return <div className="h-screen flex items-center justify-center">Game not found.</div>;

  return (
    <div
      className="h-dvh flex flex-col bg-background select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <House className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground">Hole {currentHole?.number} of {holes.length}</span>
            <span className="text-muted-foreground/50 mx-1.5">·</span>
            <span>Par {currentHole?.par}</span>
          </p>
          <p className="text-lg font-bold truncate max-w-[150px]">{game.course.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => router.push(`/games/${id}`)}>
            <Grid3x3 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 overflow-hidden px-4">
        {/* Nav + Controls row */}
        <div className="flex items-center justify-center w-full max-w-md gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToHole(holeIndex - 1)}
            disabled={holeIndex === 0}
            className="size-12 sm:size-14 shrink-0"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>

          <div className="flex flex-col items-center gap-4 sm:gap-6">
            <div className="text-6xl sm:text-7xl font-bold tabular-nums">{strokes}</div>
            <div className="flex gap-4 sm:gap-6">
              <button
                onClick={removeStroke}
                disabled={strokes <= 1}
                className="size-16 sm:size-20 rounded-full border-2 border-border flex items-center justify-center text-3xl disabled:opacity-30 active:bg-muted transition-colors"
              >
                <Minus className="h-7 w-7 sm:h-8 sm:w-8" />
              </button>
              <button
                onClick={addStroke}
                className="size-16 sm:size-20 rounded-full border-2 border-border flex items-center justify-center text-3xl active:bg-muted transition-colors"
              >
                <Plus className="h-7 w-7 sm:h-8 sm:w-8" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide -mt-2 sm:-mt-4">Strokes</div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={removePutt}
                disabled={putts <= 0}
                className="size-9 sm:size-10 rounded-full border border-border flex items-center justify-center text-sm disabled:opacity-30 active:bg-muted transition-colors"
              >
                <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <div className="text-center min-w-[3ch]">
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{putts}</p>
                <p className="text-xs text-muted-foreground">Putts</p>
                <p className="text-[10px] text-muted-foreground/60">in strokes</p>
              </div>
              <button
                onClick={addPutt}
                disabled={putts >= strokes}
                className="size-9 sm:size-10 rounded-full border border-border flex items-center justify-center text-sm active:bg-muted transition-colors"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>

          {holeIndex === holes.length - 1 ? (
            <Button
              variant="default"
              size="icon"
              onClick={finishGame}
              className="size-12 sm:size-14 shrink-0"
              aria-label="Finish round"
            >
              <Flag className="h-6 w-6 sm:h-7 sm:w-7" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToHole(holeIndex + 1)}
              disabled={holeIndex === holes.length - 1}
              className="size-12 sm:size-14 shrink-0"
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </Button>
          )}
        </div>

        <div className="border-t w-full max-w-xs pt-4">
          <p className="text-center text-sm mb-2 font-medium">Currently scoring for:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {game.participants.map((p, i) => (
              <Button
                key={p.id}
                variant={participantIndex === i ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setScores(scoresByParticipant.current[p.id] || {});
                  setParticipantIndex(i);
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3 pb-[env(safe-area-inset-bottom)] shrink-0">
        <div className="flex justify-center gap-1.5 mb-2">
          {holes.map((hole, i) => {
            const s = scores[hole.id];
            const filled = s?.edited;
            return (
              <button
                key={hole.id}
                onClick={() => goToHole(i)}
                className={`size-3 rounded-full transition-all ${
                  i === holeIndex
                    ? "bg-foreground scale-125"
                    : filled
                      ? "bg-muted-foreground"
                      : "bg-muted"
                }`}
              />
            );
          })}
        </div>
        <p className="text-center text-sm">
          <span className={`font-semibold ${totals.overUnder < 0 ? "text-green-600" : totals.overUnder > 0 ? "text-red-600" : ""}`}>
            {totals.overUnder === 0 ? "E" : totals.overUnder > 0 ? `+${totals.overUnder}` : `${totals.overUnder}`}
          </span>
          <span className="text-muted-foreground ml-2">({totals.totalStrokes} strokes)</span>
        </p>
      </div>
    </div>
  );
}
