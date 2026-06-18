"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Grid3x3, House, Minus, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface Hole {
  id: string;
  number: number;
  par: number;
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
  scores: ScoreData[];
}

export default function PlayModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [holeIndex, setHoleIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, { strokes: number; putts: number }>>({});
  const scoreIdMap = useRef<Record<string, string>>({});
  const savingHoles = useRef<Set<string>>(new Set());
  const touchStartX = useRef(0);

  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${id}`);
        if (!res.ok) throw new Error("Failed to fetch game");
        const data: Game = await res.json();
        setGame(data);
        data.scores.forEach((s) => {
          scoreIdMap.current[s.holeId] = s.id;
        });
        const initial: Record<string, { strokes: number; putts: number }> = {};
        data.course.holes.forEach((hole) => {
          const existing = data.scores.find((s) => s.holeId === hole.id);
          initial[hole.id] = {
            strokes: existing?.strokes ?? 0,
            putts: existing?.putts ?? 0,
          };
        });
        setScores(initial);
      } catch {
        toast.error("Failed to load game");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchGame();
  }, [id]);

  const holes = game?.course.holes.sort((a, b) => a.number - b.number) ?? [];
  const currentHole = holes[holeIndex];
  const currentScore = currentHole ? scores[currentHole.id] : null;
  const strokes = currentScore?.strokes ?? 0;
  const putts = currentScore?.putts ?? 0;

  const saveScore = useCallback(async (holeId: string, strokesVal: number, puttsVal: number) => {
    if (savingHoles.current.has(holeId)) return;
    savingHoles.current.add(holeId);
    try {
      const existingId = scoreIdMap.current[holeId];
      const url = existingId ? `/api/scores/${existingId}` : "/api/scores";
      const method = existingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id, holeId, strokes: strokesVal, putts: puttsVal }),
      });

      if (!res.ok) throw new Error("Save failed");

      if (!existingId) {
        const created: { id: string } = await res.json();
        scoreIdMap.current[holeId] = created.id;
      }
    } catch {
      toast.error("Failed to save score");
    } finally {
      savingHoles.current.delete(holeId);
    }
  }, [id]);

  const updateScore = useCallback((holeId: string, strokesVal: number, puttsVal: number) => {
    setScores((prev) => ({ ...prev, [holeId]: { strokes: strokesVal, putts: puttsVal } }));
    saveScore(holeId, strokesVal, puttsVal);
  }, [saveScore]);

  const goToHole = useCallback((index: number) => {
    if (index >= 0 && index < holes.length) setHoleIndex(index);
  }, [holes.length]);

  const addStroke = useCallback(() => {
    if (!currentHole) return;
    const newStrokes = strokes + 1;
    const newPutts = Math.min(putts, newStrokes);
    updateScore(currentHole.id, newStrokes, newPutts);
  }, [currentHole, strokes, putts, updateScore]);

  const removeStroke = useCallback(() => {
    if (!currentHole || strokes <= 1) return;
    const newStrokes = strokes - 1;
    const newPutts = Math.min(putts, newStrokes);
    updateScore(currentHole.id, newStrokes, newPutts);
  }, [currentHole, strokes, putts, updateScore]);

  function addPutt() {
    if (!currentHole || putts >= strokes) return;
    updateScore(currentHole.id, strokes, putts + 1);
  }

  function removePutt() {
    if (!currentHole || putts <= 0) return;
    updateScore(currentHole.id, strokes, putts - 1);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goToHole(holeIndex - 1);
      else if (e.key === "ArrowRight") goToHole(holeIndex + 1);
      else if (e.key === "+" || e.key === "=") addStroke();
      else if (e.key === "-") removeStroke();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [holeIndex, goToHole, addStroke, removeStroke]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToHole(holeIndex + 1);
      else goToHole(holeIndex - 1);
    }
  }

  function computeTotals() {
    if (!game) return { totalStrokes: 0, totalPar: 0, overUnder: 0 };
    let totalStrokesCalc = 0;
    game.course.holes.forEach((hole) => {
      const s = scores[hole.id];
      if (s) totalStrokesCalc += s.strokes || 0;
    });
    const totalPar = game.course.holes.reduce((sum, h) => sum + h.par, 0);
    return { totalStrokes: totalStrokesCalc, totalPar, overUnder: totalStrokesCalc - totalPar };
  }

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
          <p className="text-sm text-muted-foreground">Hole {currentHole?.number} of {holes.length}</p>
          <p className="text-lg font-bold">{game.course.name}</p>
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
        {/* Par */}
        <div className="text-center shrink-0">
          <span className="text-muted-foreground text-lg">Par {currentHole?.par}</span>
        </div>

        {/* Nav + Controls row */}
        <div className="flex items-center justify-center w-full max-w-md gap-2 sm:gap-4">
          {/* Previous hole */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToHole(holeIndex - 1)}
            disabled={holeIndex === 0}
            className="size-12 sm:size-14 shrink-0"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>

          {/* Stroke controls */}
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            {/* Stroke count */}
            <div className="text-6xl sm:text-7xl font-bold tabular-nums">{strokes}</div>

            {/* Stroke buttons */}
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

            {/* Putt controls */}
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

          {/* Next hole */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToHole(holeIndex + 1)}
            disabled={holeIndex === holes.length - 1}
            className="size-12 sm:size-14 shrink-0"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t px-4 py-3 pb-[env(safe-area-inset-bottom)] shrink-0">
        <div className="flex justify-center gap-1.5 mb-2">
          {holes.map((hole, i) => {
            const s = scores[hole.id];
            const filled = s && s.strokes > 0;
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
