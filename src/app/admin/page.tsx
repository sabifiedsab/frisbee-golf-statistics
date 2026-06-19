"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { PlusCircle, Pencil, Shield, ShieldOff, Users, MapPin, Trophy } from "lucide-react";

interface CourseEntry {
  id: string;
  name: string;
  location: string;
  isArchived: boolean;
  _count?: { holes: number; games: number };
  holes?: { id: string }[];
  games?: { id: string }[];
}

interface UserEntry {
  id: string;
  username: string;
  isAdmin: boolean;
  language: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.isAdmin) {
      router.replace("/");
      return;
    }
    async function loadData() {
      try {
        const [courseRes, userRes] = await Promise.all([
          fetch("/api/courses?includeArchived=true"),
          fetch("/api/admin/users"),
        ]);
        if (courseRes.ok) setCourses(await courseRes.json());
        if (userRes.ok) setUsers(await userRes.json());
      } catch {
        toast.error("Failed to load admin data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [status, session, router]);

  async function reloadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch {
      toast.error("Failed to load users");
    }
  }

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin: !currentIsAdmin }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(`Admin status ${!currentIsAdmin ? "granted" : "removed"}`);
      await reloadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  }

  if (status !== "authenticated" || !session?.user?.isAdmin) {
    return <div className="container mx-auto py-10 text-center">Checking access...</div>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-10 text-center">Loading admin dashboard...</div>;
  }

  const activeCourses = courses.filter((c) => !c.isArchived);
  const archivedCourses = courses.filter((c) => c.isArchived);

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Admin</h1>
        <Link href="/courses/add">
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Course
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCourses.length}</div>
            <p className="text-xs text-muted-foreground">{archivedCourses.length} archived</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">{users.filter((u) => u.isAdmin).length} admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.isAdmin).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <div className="space-y-4 mb-10">
        <h2 className="text-2xl font-semibold">Courses</h2>
        {activeCourses.length === 0 && archivedCourses.length === 0 ? (
          <p className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground">
            No courses yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activeCourses.map((course) => (
              <Card key={course.id} className="hover:bg-accent transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <Link href={`/courses/${course.id}`} className="flex-1 min-w-0">
                    <p className="font-medium truncate">{course.name}</p>
                    <p className="text-sm text-muted-foreground">{course.location}</p>
                  </Link>
                  <Link href={`/courses/${course.id}`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {archivedCourses.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground pt-4">Archived</p>
                {archivedCourses.map((course) => (
                  <Card key={course.id} className="opacity-60">
                    <CardContent className="p-4 flex items-center justify-between">
                      <Link href={`/courses/${course.id}`} className="flex-1 min-w-0">
                        <p className="font-medium truncate">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.location}</p>
                      </Link>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Archived</span>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Users</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.isAdmin ? "Admin" : "User"} · {user.language === "no" ? "Norwegian" : "English"}
                  </p>
                </div>
                <Button
                  variant={user.isAdmin ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleAdmin(user.id, user.isAdmin)}
                  disabled={user.id === session.user?.id}
                >
                  {user.isAdmin ? (
                    <><ShieldOff className="mr-1 h-4 w-4" /> Remove admin</>
                  ) : (
                    <><Shield className="mr-1 h-4 w-4" /> Make admin</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
