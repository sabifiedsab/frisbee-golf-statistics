"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlusCircle, Pencil, Shield, ShieldOff, Users, MapPin, Trophy, KeyRound, Eye, Trash2 } from "lucide-react";

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

  const [passwordTarget, setPasswordTarget] = useState<UserEntry | null>(null);
  const [usernameTarget, setUsernameTarget] = useState<UserEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserEntry | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        body: JSON.stringify({ userId, action: "toggleAdmin", isAdmin: !currentIsAdmin }),
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

  async function handlePasswordChange() {
    if (!passwordTarget) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: passwordTarget.id, action: "password", password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change password");
      }
      toast.success("Password changed");
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUsernameChange() {
    if (!usernameTarget) return;
    if (!/^[a-z0-9]+$/.test(newUsername)) {
      toast.error("Username must be lowercase alphanumeric");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: usernameTarget.id, action: "username", username: newUsername }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update username");
      }
      toast.success("Username changed");
      setUsernameTarget(null);
      setNewUsername("");
      await reloadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update username");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }
      toast.success(`User "${deleteTarget.username}" deleted`);
      setDeleteTarget(null);
      await reloadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setSubmitting(false);
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
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.isAdmin ? "Admin" : "User"} · {user.language === "no" ? "Norwegian" : "English"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="icon" title="View user">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Change password"
                    onClick={() => {
                      setPasswordTarget(user);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Change username"
                    onClick={() => {
                      setUsernameTarget(user);
                      setNewUsername(user.username);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete user"
                    onClick={() => setDeleteTarget(user)}
                    disabled={user.id === session.user?.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Password dialog */}
      {passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPasswordTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Change password for {passwordTarget.username}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">New password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPasswordTarget(null)}>Cancel</Button>
              <Button onClick={handlePasswordChange} disabled={submitting}>
                {submitting ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Username dialog */}
      {usernameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUsernameTarget(null)} />
          <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Change username for {usernameTarget.username}</h2>
            <div className="mt-4">
              <label className="text-sm font-medium">New username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="lowercase alphanumeric"
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUsernameTarget(null)}>Cancel</Button>
              <Button onClick={handleUsernameChange} disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete user "${deleteTarget?.username}"?`}
        message="This will permanently delete the user and their participation in games. Games they created will become unowned. This cannot be undone."
        confirmLabel={submitting ? "Deleting..." : "Delete"}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
