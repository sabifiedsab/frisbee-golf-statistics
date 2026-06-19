"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, Trash2, Play, User } from "lucide-react";
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

interface Participant {
  id: string;
  name: string;
  userId?: string;
  scores: ScoreData[];
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

export default function ScorecardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [participantIndex, setParticipantIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, { strokes: number; putts: number }>>({});
  const scoresByParticipant = useRef<Record<string, Record<string, { strokes: number; putts: number }>>>({});

  function buildScoreMap(participantScores: ScoreData[], holes: Hole[]) {
    const map: Record<string, { strokes: number; putts: number }> = {};
    holes.forEach((hole) => {
      const existing = participantScores.find((s) => s.holeId === hole.id);
      map[hole.id] = {
        strokes: existing?.strokes ?? 0,
        putts: existing?.putts ?? 0,
      };
    });
    return map;
  }

  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch(`/api/games/${id}`);
        if (!res.ok) throw new Error("Failed to fetch game");
        const data: Game = await res.json();
        setGame(data);
        if (data.participants && data.participants.length > 0) {
          const holes = data.course.holes;
          const byParticipant: Record<string, Record<string, { strokes: number; putts: number }>> = {};
          data.participants.forEach((p: Participant) => {
            byParticipant[p.id] = buildScoreMap(p.scores || [], holes);
          });
          scoresByParticipant.current = byParticipant;

          const currentUserId = session?.user?.id;
          const myIndex = data.participants.findIndex(p => p.userId === currentUserId);
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
  }, [id, session]);

  function switchParticipant(index: number) {
    if (!game?.participants[index]) return;
    setScores(scoresByParticipant.current[game.participants[index].id] || {});
    setParticipantIndex(index);
  }

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
  const currentParticipant = game?.participants[participantIndex];

  async function saveScore(holeId: string, strokesVal: number, puttsVal: number) {
    if (!currentParticipant) return;
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: currentParticipant.id, holeId, strokes: strokesVal, putts: puttsVal }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch {
      toast.error("Failed to save score");
    }
  }

  function handleStrokesChange(holeId: string, value: number) {
    const safe = Math.max(1, value);
    const currentPutts = scores[holeId]?.putts ?? 0;
    const newPutts = Math.min(currentPutts, safe);
    const pid = currentParticipant?.id;
    if (pid) {
      scoresByParticipant.current[pid] = {
        ...scoresByParticipant.current[pid],
        [holeId]: { strokes: safe, putts: newPutts },
      };
    }
    setScores(prev => ({ ...prev, [holeId]: { strokes: safe, putts: newPutts } }));
    saveScore(holeId, safe, newPutts);
  }

  function handlePuttsChange(holeId: string, value: number) {
    const maxStrokes = scores[holeId]?.strokes ?? 1;
    const safe = Math.max(0, Math.min(value, maxStrokes));
    const pid = currentParticipant?.id;
    if (pid) {
      scoresByParticipant.current[pid] = {
        ...scoresByParticipant.current[pid],
        [holeId]: { strokes: maxStrokes, putts: safe },
      };
    }
    setScores(prev => ({
      ...prev,
      [holeId]: { strokes: maxStrokes, putts: safe },
    }));
    saveScore(holeId, maxStrokes, safe);
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

      {/* Participant switcher */}
      {game.participants.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {game.participants.map((p, i) => (
            <Button
              key={p.id}
              variant={participantIndex === i ? "default" : "outline"}
              size="sm"
              onClick={() => switchParticipant(i)}
            >
              <User className="mr-1 h-3 w-3" /> {p.name}
            </Button>
          ))}
        </div>
      )}

      {currentParticipant && (
        <p className="text-sm text-muted-foreground mb-2">
          Scores for: <span className="font-semibold">{currentParticipant.name}</span>
        </p>
      )}

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
