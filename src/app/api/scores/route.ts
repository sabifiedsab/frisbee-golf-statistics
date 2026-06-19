import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, holeId, strokes, putts } = body;

    if (!participantId || !holeId || strokes === undefined || putts === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const score = await prisma.score.upsert({
      where: {
        participantId_holeId: { participantId, holeId },
      },
      update: { strokes, putts },
      create: { participantId, holeId, strokes, putts },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error("Error saving score:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
