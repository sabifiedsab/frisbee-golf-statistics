import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { courseId, date } = body;

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    const game = await prisma.game.create({
      data: {
        courseId,
        date: date ? new Date(date) : new Date(),
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
    const games = await prisma.game.findMany({
      include: {
        course: {
          include: { holes: true },
        },
        scores: true,
      },
      orderBy: { date: "desc" },
    });

    const summary = games.map((game) => {
      const totalPar = game.course.holes.reduce((sum, h) => sum + h.par, 0);
      const totalStrokes = game.scores.reduce((sum, s) => sum + s.strokes, 0);
      const totalPutts = game.scores.reduce((sum, s) => sum + s.putts, 0);
      const overUnder = totalStrokes - totalPar;

      return {
        id: game.id,
        date: game.date,
        course: { name: game.course.name },
        totalStrokes,
        totalPutts,
        overUnder,
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
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing or invalid ids" }, { status: 400 });
    }

    await prisma.score.deleteMany({ where: { gameId: { in: ids } } });
    await prisma.game.deleteMany({ where: { id: { in: ids } } });

    return NextResponse.json({ deleted: ids.length });
  } catch (error) {
    console.error("Error deleting games:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
