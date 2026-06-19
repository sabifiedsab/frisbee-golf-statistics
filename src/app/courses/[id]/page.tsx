"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/stepper";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlusCircle, Pencil, Trash2, Check, X, GitFork } from "lucide-react";
import { toast } from "sonner";

interface Hole {
  id: string;
  number: number;
  par: number;
  hasScores?: boolean;
}

interface Course {
  id: string;
  name: string;
  location: string;
  isArchived: boolean;
  holes: Hole[];
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHoles, setEditHoles] = useState<{ id?: string; number: number; par: number }[]>([]);

  const isAdmin = session?.user?.isAdmin ?? false;

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch course");
        const data: Course = await res.json();
        setCourse(data);
        setEditName(data.name);
        setEditLocation(data.location);
        setEditHoles(data.holes.map((h) => ({ id: h.id, number: h.number, par: h.par })));
      } catch {
        toast.error("Failed to load course");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchCourse();
  }, [id]);

  function startEditing() {
    if (!course) return;
    setEditName(course.name);
    setEditLocation(course.location);
    setEditHoles(course.holes.map((h) => ({ id: h.id, number: h.number, par: h.par })));
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    if (course) {
      setEditName(course.name);
      setEditLocation(course.location);
      setEditHoles(course.holes.map((h) => ({ id: h.id, number: h.number, par: h.par })));
    }
  }

  function addEditHole() {
    const nextNumber = editHoles.length > 0 ? Math.max(...editHoles.map((h) => h.number)) + 1 : 1;
    setEditHoles([...editHoles, { number: nextNumber, par: 3 }]);
  }

  function removeEditHole(index: number) {
    setEditHoles(editHoles.filter((_, i) => i !== index));
  }

  function updateEditHole(index: number, field: "number" | "par", value: number) {
    const updated = [...editHoles];
    updated[index] = { ...updated[index], [field]: value };
    setEditHoles(updated);
  }

  async function saveEdits() {
    if (!course) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          location: editLocation,
          holes: editHoles,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      const updated: Course = await res.json();
      setCourse(updated);
      setEditHoles(updated.holes.map((h) => ({ id: h.id, number: h.number, par: h.par })));
      setIsEditing(false);
      toast.success("Course updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save course");
    } finally {
      setIsSaving(false);
    }
  }

  async function forkCourse() {
    if (!course) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/courses/${id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          location: editLocation,
          holes: editHoles,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fork");
      }
      const data = await res.json();
      toast.success("Course forked — original archived");
      router.push(`/courses/${data.new.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fork course");
    } finally {
      setIsSaving(false);
      setShowForkDialog(false);
    }
  }

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Loading course...</div>;
  }

  if (!course) {
    return <div className="container mx-auto py-10 text-center">Course not found.</div>;
  }

  if (isEditing) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Edit Course</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={saveEdits} disabled={isSaving}>
              <Check className="mr-1 h-4 w-4" /> {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Course Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Holes</h2>
            <Button variant="outline" size="sm" onClick={addEditHole}>
              <PlusCircle className="mr-1 h-4 w-4" /> Add Hole
            </Button>
          </div>

          {editHoles.map((hole, index) => {
            const original = course.holes.find((h) => h.id === hole.id);
            const hasScores = original?.hasScores ?? false;
            return (
              <Card key={hole.id ?? index}>
                <CardContent className="p-4 flex items-center gap-4">
                  <span className="font-bold text-lg min-w-[2rem]">#{index + 1}</span>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Hole #</label>
                    <Input
                      type="number"
                      value={hole.number}
                      onChange={(e) => updateEditHole(index, "number", Number(e.target.value))}
                      className="mt-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Par</label>
                    <div className="mt-0.5">
                      <Stepper value={hole.par} min={1} onChange={(v) => updateEditHole(index, "par", v)} />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEditHole(index)}
                    disabled={hasScores}
                    className="self-end"
                    title={hasScores ? "This hole has recorded scores and can't be deleted" : "Remove hole"}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
                {hasScores && (
                  <div className="px-4 pb-2 text-xs text-muted-foreground">
                    Has recorded scores — deletion blocked. Use fork to create a new version.
                  </div>
                )}
              </Card>
            );
          })}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowForkDialog(true)} disabled={isSaving}>
              <GitFork className="mr-1 h-4 w-4" /> Save as new course (fork)
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={showForkDialog}
          title="Fork Course"
          message="This creates a new course with your edits and archives the original. Historical games keep pointing at the original; new games will use the new course. Continue?"
          confirmLabel={isSaving ? "Forking..." : "Fork"}
          onConfirm={forkCourse}
          onCancel={() => setShowForkDialog(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{course.name}</h1>
          <p className="text-muted-foreground">{course.location}</p>
          {course.isArchived && (
            <span className="inline-block mt-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Archived</span>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={startEditing}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
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
