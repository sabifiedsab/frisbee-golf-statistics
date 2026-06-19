import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, username: true, isAdmin: true, language: true },
      orderBy: { username: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    if (action === "toggleAdmin") {
      const { isAdmin } = body;
      if (typeof isAdmin !== "boolean") {
        return NextResponse.json({ error: "Missing isAdmin" }, { status: 400 });
      }

      if (userId === session.user.id && isAdmin === false) {
        return NextResponse.json({ error: "You cannot remove your own admin status" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isAdmin },
        select: { id: true, username: true, isAdmin: true },
      });

      return NextResponse.json(updated);
    }

    if (action === "password") {
      const { password } = body;
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "username") {
      const { username } = body;
      if (!username || typeof username !== "string" || !/^[a-z0-9]+$/.test(username)) {
        return NextResponse.json({ error: "Username must be lowercase alphanumeric" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { username },
        select: { id: true, username: true, isAdmin: true },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction([
      // Delete scores for this user's participation
      prisma.score.deleteMany({
        where: { participant: { userId } },
      }),
      // Delete the participation records
      prisma.participant.deleteMany({
        where: { userId },
      }),
      // Nullify game creator
      prisma.game.updateMany({
        where: { userId },
        data: { userId: null },
      }),
      // Delete the user
      prisma.user.delete({
        where: { id: userId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
