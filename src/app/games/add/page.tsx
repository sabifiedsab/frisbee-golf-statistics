"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Search, Trash2, UserPlus, UserCheck } from "lucide-react";

const formSchema = z.object({
  courseId: z.string().min(1, "Please select a course"),
});

interface ParticipantFormValue {
  name: string;
  userId?: string;
}

interface SearchUser {
  id: string;
  username: string;
}

export default function AddGamePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [participants, setParticipants] = useState<ParticipantFormValue[]>([
    { name: session?.user?.name || "You", userId: session?.user?.id || undefined },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [gameDate, setGameDate] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();
        setCourses(data);
      } catch {
        toast.error("Failed to load courses");
      }
    }
    loadCourses();
  }, []);

  // Close search results on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced user search
  useEffect(() => {
    if (searchQuery.length < 1) return;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.filter((u: SearchUser) => u.id !== session?.user?.id));
          setShowSearchResults(true);
        }
      } catch {
        // Ignore
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, session?.user?.id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { courseId: "" },
  });

  function addParticipant() {
    setParticipants([...participants, { name: "" }]);
  }

  function removeParticipant(index: number) {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    } else {
      setParticipants([{ name: "Me" }]);
    }
  }

  function updateParticipant(index: number, field: keyof ParticipantFormValue, value: string) {
    const newParticipants = [...participants];
    if (field === "name") {
      newParticipants[index] = { ...newParticipants[index], name: value };
    } else if (field === "userId") {
      newParticipants[index] = { ...newParticipants[index], userId: value || undefined };
    }
    setParticipants(newParticipants);
  }

  function addRegisteredUser(user: SearchUser) {
    // Check if already added
    if (participants.some(p => p.userId === user.id)) {
      toast.info(`${user.username} is already in the game`);
      return;
    }
    setParticipants([...participants, { name: user.username, userId: user.id }]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  }

  async function createAndRedirect(mode: "play" | "grid") {
    setIsLoading(true);
    try {
      // Validate manually - make sure all participants have names
      const invalid = participants.some(p => !p.name.trim());
      if (invalid) {
        toast.error("All players must have a name");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.getValues("courseId"),
          date: gameDate ? new Date(gameDate).toISOString() : undefined,
          participants: participants.map(p => ({
            name: p.name.trim(),
            userId: p.userId || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create game");
      }
      const newGame = await response.json();
      const dest = mode === "play" ? `/games/${newGame.id}/play` : `/games/${newGame.id}`;

      toast.success("Game started!");
      router.push(dest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Log New Game</CardTitle>
          <CardDescription>Start tracking your round of frisbee golf.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                name="courseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course">
                            {(value: string) => courses.find((c) => c.id === value)?.name ?? "Select a course"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Date &amp; time (optional)</FormLabel>
                <Input
                  type="datetime-local"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to use the current time.</p>
              </FormItem>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Players
                </label>
                {participants.map((p, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Player name"
                        value={index === 0 ? `You (${p.name})` : p.name}
                        onChange={(e) => updateParticipant(index, "name", e.target.value)}
                        disabled={index === 0}
                        className={index === 0 ? "text-muted-foreground bg-muted/50" : ""}
                      />
                      {p.userId && (
                        <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {index > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeParticipant(index)}
                        className="text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Search for registered user */}
                <div className="relative" ref={searchRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for registered user..."
                        value={searchQuery}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSearchQuery(v);
                          if (v.length < 1) {
                            setSearchResults([]);
                            setShowSearchResults(false);
                          }
                        }}
                        className="pl-9"
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                      <UserPlus className="h-4 w-4" /> Guest
                    </Button>
                  </div>
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                          onClick={() => addRegisteredUser(user)}
                        >
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          {user.username}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              className="flex-1"
              disabled={isLoading}
              onClick={() => createAndRedirect("play")}
            >
              {isLoading ? "Starting..." : "Start Game"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isLoading}
              onClick={() => createAndRedirect("grid")}
            >
              Open Grid
            </Button>
          </div>
          <Button variant="ghost" className="w-full mt-2" onClick={() => router.push("/")} disabled={isLoading}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
