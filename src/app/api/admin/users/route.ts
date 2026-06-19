import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "Missing userId or isAdmin" }, { status: 400 });
    }

    // Prevent de-admining yourself
    if (userId === session.user.id && isAdmin === false) {
      return NextResponse.json({ error: "You cannot remove your own admin status" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, username: true, isAdmin: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user admin status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
