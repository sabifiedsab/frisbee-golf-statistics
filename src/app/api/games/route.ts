import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface InputParticipant {
  name: string;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user;

    const body = await req.json();
    const { courseId, date, participants } = body;

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const finalParticipants: InputParticipant[] = participants || [];
    const currentUserIsParticipant = finalParticipants.some((p: InputParticipant) => p.userId === currentUser.id);

    if (!currentUserIsParticipant) {
      finalParticipants.push({ name: currentUser.name || "Me", userId: currentUser.id });
    }

    const game = await prisma.game.create({
      data: {
        courseId,
        date: date ? new Date(date) : new Date(),
        userId: currentUser.id,
        participants: {
          create: finalParticipants.map((p: InputParticipant) => ({
            name: p.name,
            userId: p.userId || undefined,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user;

    const games = await prisma.game.findMany({
      where: {
        participants: {
          some: { userId: currentUser.id },
        },
      },
      include: {
        course: {
          include: { holes: true },
        },
        participants: {
          include: { scores: true },
        },
      },
      orderBy: { date: "desc" },
    });

    const summary = games.map((game) => {
      const myParticipant = game.participants.find(p => p.userId === currentUser.id);
      const myScores = myParticipant?.scores || [];

      const totalPar = game.course.holes.reduce((sum, h) => sum + h.par, 0);
      const totalStrokes = myScores.reduce((sum, s) => sum + s.strokes, 0);
      const totalPutts = myScores.reduce((sum, s) => sum + s.putts, 0);
      const overUnder = totalStrokes - totalPar;
      const isComplete = myScores.length === game.course.holes.length;

      return {
        id: game.id,
        date: game.date,
        course: { name: game.course.name },
        totalStrokes,
        totalPutts,
        overUnder,
        isComplete,
        participants: game.participants.map(p => ({
          id: p.id,
          name: p.name,
          userId: p.userId,
        })),
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user;

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing or invalid ids" }, { status: 400 });
    }

    const gamesToDelete = await prisma.game.findMany({
      where: {
        id: { in: ids },
        participants: { some: { userId: currentUser.id } },
      },
    });
    const validIds = gamesToDelete.map(g => g.id);

    if (validIds.length === 0) {
       return NextResponse.json({ error: "No authorized games found to delete" }, { status: 400 });
    }

    await prisma.score.deleteMany({
      where: {
        participant: { gameId: { in: validIds } },
      },
    });

    await prisma.participant.deleteMany({
      where: { gameId: { in: validIds } },
    });

    await prisma.game.deleteMany({ where: { id: { in: validIds } } });

    return NextResponse.json({ deleted: validIds.length });
  } catch (error) {
    console.error("Error deleting games:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
