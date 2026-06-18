import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { strokes, putts } = body;

    if (!id || strokes === undefined || putts === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const score = await prisma.score.update({
      where: { id },
      data: {
        strokes,
        putts,
      },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error("Error updating score:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
