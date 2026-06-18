import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, holeId, strokes, putts } = body;

    if (!gameId || !holeId || strokes === undefined || putts === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const score = await prisma.score.create({
      data: {
        gameId,
        holeId,
        strokes,
        putts,
      },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error("Error creating score:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
