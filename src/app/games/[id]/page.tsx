"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeft, Trash2, Play } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Stepper } from "@/components/stepper";

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

export default function ScorecardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const scoreIdMap = useRef<Record<string, string>>({});
  const savingHoles = useRef<Set<string>>(new Set());

  const form = useForm({
    defaultValues: {
      scores: {} as Record<string, { strokes: number; putts: number }>,
    },
  });

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
        const initialScores: Record<string, { strokes: number; putts: number }> = {};
        data.course.holes.forEach((hole) => {
          const existing = data.scores.find((s) => s.holeId === hole.id);
          initialScores[hole.id] = {
            strokes: existing?.strokes ?? 0,
            putts: existing?.putts ?? 0,
          };
        });
        form.reset({ scores: initialScores });
      } catch {
        toast.error("Failed to load game");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchGame();
  }, [id, form]);

  const scores = form.watch("scores");

  function computeTotals() {
    if (!game) return { totalStrokes: 0, totalPutts: 0, totalPar: 0, overUnder: 0 };
    let totalStrokes = 0;
    let totalPutts = 0;
    game.course.holes.forEach((hole) => {
      const s = scores[hole.id];
      if (s) {
        totalStrokes += s.strokes || 0;
        totalPutts += s.putts || 0;
      }
    });
    const totalPar = game.course.holes.reduce((sum, h) => sum + h.par, 0);
    return { totalStrokes, totalPutts, totalPar, overUnder: totalStrokes - totalPar };
  }

  const totals = computeTotals();

  async function saveScore(holeId: string, strokesVal: number, puttsVal: number) {
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
  }

  function handleStrokesChange(holeId: string, value: number) {
    const safe = Math.max(1, value);
    const currentPutts = scores[holeId]?.putts ?? 0;
    const newPutts = Math.min(currentPutts, safe);
    form.setValue(`scores.${holeId}.strokes` as any, safe);
    form.setValue(`scores.${holeId}.putts` as any, newPutts);
    saveScore(holeId, safe, newPutts);
  }

  function handlePuttsChange(holeId: string, value: number) {
    const maxStrokes = scores[holeId]?.strokes ?? 1;
    const safe = Math.max(0, Math.min(value, maxStrokes));
    form.setValue(`scores.${holeId}.putts` as any, safe);
    saveScore(holeId, scores[holeId]?.strokes ?? 1, safe);
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete game");
      toast.success("Game deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete game");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  if (isLoading) return <div className="container mx-auto py-10 text-center">Loading scorecard...</div>;
  if (!game) return <div className="container mx-auto py-10 text-center">Game not found.</div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{game.course.name}</h1>
          <p className="text-sm text-muted-foreground">{new Date(game.date).toLocaleString()}</p>
        </div>
        <Button variant="outline" size="sm" className="mr-2" onClick={() => router.push(`/games/${id}/play`)}>
          <Play className="mr-1 h-4 w-4" /> Play
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center justify-around text-center">
          <div>
            <p className="text-xs text-muted-foreground">Strokes</p>
            <p className="text-xl font-bold">{totals.totalStrokes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Putts</p>
            <p className="text-xl font-bold">{totals.totalPutts}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Par</p>
            <p className="text-xl font-bold">{totals.totalPar}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">+/-</p>
            <p className={`text-xl font-bold ${totals.overUnder < 0 ? "text-green-600" : totals.overUnder > 0 ? "text-red-600" : ""}`}>
              {totals.overUnder === 0 ? "E" : totals.overUnder > 0 ? `+${totals.overUnder}` : `${totals.overUnder}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2 font-semibold px-2 text-muted-foreground text-sm mb-2">
        <div className="text-center">Hole</div>
        <div className="text-center">Par</div>
        <div className="text-center">Strokes</div>
          <div className="text-center">
            Putts<br />
            <span className="text-[10px] font-normal">in strokes</span>
          </div>
      </div>

      <div className="space-y-3">
        {game.course.holes
          .sort((a, b) => a.number - b.number)
          .map((hole) => {
            const s = scores[hole.id];
            const strokesCount = s?.strokes ?? 0;
            const puttsCount = s?.putts ?? 0;
            return (
              <Card key={hole.id} className="overflow-hidden">
                <div className="grid grid-cols-4 items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2">
                  <div className="text-center font-bold text-base sm:text-lg">
                    {hole.number}
                  </div>
                  <div className="text-center text-muted-foreground text-sm">
                    {hole.par}
                  </div>
                  <div className="flex justify-center">
                    <Stepper
                      value={strokesCount}
                      min={1}
                      onChange={(v) => handleStrokesChange(hole.id, v)}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Stepper
                      value={puttsCount}
                      min={0}
                      onChange={(v) => handlePuttsChange(hole.id, v)}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Game"
        message="Are you sure you want to delete this game? All scores will be permanently removed."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
