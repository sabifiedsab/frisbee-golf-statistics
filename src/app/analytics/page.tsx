"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreTrendChart } from "@/components/analytics/ScoreTrendChart";
import { toast } from "sonner";
import { TrendingUp, Calendar } from "lucide-react";
import { formatDate } from "@/lib/format";

interface TrendData {
  date: Date;
  averageScore: number;
  totalPutts: number;
  avgPuttsPerHole: number;
  birdies: number;
  pars: number;
  bogies: number;
  courseName: string;
}

interface CourseEntry {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const courseRes = await fetch("/api/courses");
        if (courseRes.ok) {
          const allCourses = await courseRes.json();
          setCourses(allCourses);
        }
      } catch {
        // Non-critical
      }
    }
    loadCourses();
  }, []);

  useEffect(() => {
    async function fetchTrends() {
      setIsLoading(true);
      try {
        const url = selectedCourseId === "all"
          ? "/api/analytics/trends"
          : `/api/analytics/trends?courseId=${selectedCourseId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch trends");
        const data = await res.json();

        const formattedData: TrendData[] = data.map((t: {
          date: string | Date;
          averageScore: number;
          totalPutts: number;
          avgPuttsPerHole: number;
          birdies: number;
          pars: number;
          bogies: number;
          courseName: string;
        }) => ({
          ...t,
          date: new Date(t.date),
        }));

        setTrends(formattedData);
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, [selectedCourseId]);

  const playedCourseIds = new Set(trends.map((t) => t.courseName));
  const availableCourses = courses.filter((c) => playedCourseIds.has(c.name));

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Visualize your progress and performance trends.</p>
      </div>

      {/* Course selector */}
      <div className="mb-6">
        <Select
          value={selectedCourseId}
          onValueChange={(v) => setSelectedCourseId(v as string)}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue>
              {(value: string) =>
                value === "all"
                  ? "All courses"
                  : courses.find((c) => c.id === value)?.name ?? "All courses"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {availableCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading analytics...</div>
      ) : trends.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground">
          Not enough data to generate analytics. Play more games!
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score Trend</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <ScoreTrendChart data={trends} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Games Played</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trends.length}</div>
                <p className="text-xs text-muted-foreground">Total recorded sessions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Performance Summary</CardTitle>
              <CardDescription>Breakdown of your last few rounds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.slice(-5).reverse().map((trend, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{formatDate(trend.date)}</p>
                      <p className="text-sm text-muted-foreground">{trend.courseName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{trend.averageScore} strokes</p>
                      <p className="text-xs text-muted-foreground">
                        {trend.birdies}B | {trend.pars}P | {trend.bogies}B | {trend.totalPutts} putts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
