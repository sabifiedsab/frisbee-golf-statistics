import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    // Fetch games with their participants, scores and hole par information
    const games = await prisma.game.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        participants: {
          include: {
            scores: {
              include: {
                hole: true,
              },
            },
          },
        },
        course: true,
      },
      orderBy: {
        date: "asc",
      },
    });

  const trends = games.map((game) => {
    const allScores = game.participants.flatMap((p) => p.scores);
    const validScores = allScores.filter((s) => s.strokes > 0);
    const totalStrokes = validScores.reduce((sum, s) => sum + s.strokes, 0);
    const totalPutts = validScores.reduce((sum, s) => sum + s.putts, 0);
    const numHoles = validScores.length;
    const gameScore = numHoles > 0 ? totalStrokes / numHoles : 0;

    let birdies = 0;
    let pars = 0;
    let bogies = 0;

    validScores.forEach((score) => {
      if (score.strokes === score.hole.par - 1) birdies++;
      else if (score.strokes === score.hole.par) pars++;
      else if (score.strokes === score.hole.par + 1) bogies++;
    });

    return {
      date: game.date,
      averageScore: parseFloat(gameScore.toFixed(2)),
      totalPutts,
      avgPuttsPerHole: numHoles > 0 ? parseFloat((totalPutts / numHoles).toFixed(2)) : 0,
      birdies,
      pars,
      bogies,
      courseName: game.course.name,
    };
  });

    return NextResponse.json(trends);
  } catch (error) {
    console.error("Error fetching analytics trends:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
