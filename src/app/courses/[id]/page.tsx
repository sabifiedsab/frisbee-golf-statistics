"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Hole {
  id: string;
  number: number;
  par: number;
}

interface Course {
  id: string;
  name: string;
  location: string;
  holes: Hole[];
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch course");
        const data = await res.json();
        setCourse(data);
      } catch {
        toast.error("Failed to load course");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchCourse();
  }, [id]);

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Loading course...</div>;
  }

  if (!course) {
    return <div className="container mx-auto py-10 text-center">Course not found.</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <p className="text-muted-foreground">{course.location}</p>
        </div>
        <Link href={`/courses/${id}/holes/add`}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Hole
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Holes</h2>
        {course.holes.length === 0 ? (
          <p className="text-muted-foreground italic">No holes added yet.</p>
        ) : (
          <div className="grid gap-4">
            {course.holes
              .sort((a, b) => a.number - b.number)
              .map((hole) => (
                <Card key={hole.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <span className="font-bold text-lg">Hole {hole.number}</span>
                      <span className="text-muted-foreground">Par: {hole.par}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
