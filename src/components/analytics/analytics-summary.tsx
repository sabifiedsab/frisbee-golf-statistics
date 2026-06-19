"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface TrendData {
  date: string | Date;
  averageScore: number;
  totalPutts: number;
  avgPuttsPerHole: number;
  birdies: number;
  pars: number;
  bogies: number;
  courseName: string;
}

export function AnalyticsSummary() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics/trends");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setTrends(data);
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground">Loading analytics...</div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground">
        Not enough data to generate analytics. Play more games!
      </div>
    );
  }

  const gamesPlayed = trends.length;
  const avgScore = trends.reduce((sum, t) => sum + t.averageScore, 0) / gamesPlayed;
  const totalPutts = trends.reduce((sum, t) => sum + t.totalPutts, 0);
  const totalBirdies = trends.reduce((sum, t) => sum + t.birdies, 0);
  const totalPars = trends.reduce((sum, t) => sum + t.pars, 0);

  // Best round = lowest average score
  const best = trends.reduce((best, t) => (t.averageScore < best.averageScore ? t : best), trends[0]);

  const chartData = trends.map((t) => ({
    date: formatDate(t.date),
    avg: t.averageScore,
  }));

  const stats = [
    { label: "Games", value: gamesPlayed },
    { label: "Avg Score", value: avgScore.toFixed(1) },
    { label: "Total Putts", value: totalPutts },
    { label: "Best Round", value: best.averageScore.toFixed(1) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Score Trend
            </p>
            <p className="text-xs text-muted-foreground">{totalBirdies}B · {totalPars}P</p>
          </div>
          <div className="w-full h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Tooltip
                  formatter={(value) => [value, "Avg Score"]}
                  contentStyle={{ fontSize: "12px", padding: "4px 8px" }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            View full analytics <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
