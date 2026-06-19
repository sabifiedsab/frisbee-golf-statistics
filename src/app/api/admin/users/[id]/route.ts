import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isAdmin: true, language: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const games = await prisma.game.findMany({
      where: {
        participants: {
          some: { userId: id },
        },
      },
      include: {
        course: { select: { id: true, name: true, location: true } },
        participants: {
          where: { userId: id },
          include: {
            scores: {
              include: {
                hole: { select: { id: true, number: true, par: true } },
              },
              orderBy: { hole: { number: "asc" } },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ user, games });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { scoreId, strokes, putts } = body;

    if (!scoreId) {
      return NextResponse.json({ error: "Missing scoreId" }, { status: 400 });
    }

    const data: Record<string, number> = {};
    if (typeof strokes === "number" && strokes >= 0) data.strokes = strokes;
    if (typeof putts === "number" && putts >= 0) data.putts = putts;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.score.update({
      where: { id: scoreId },
      data,
      include: {
        hole: { select: { id: true, number: true, par: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating score:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
