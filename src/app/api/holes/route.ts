import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { number, par, courseId } = body;

    if (number === undefined || par === undefined || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const hole = await prisma.hole.create({
      data: {
        number,
        par,
        courseId,
      },
    });

    return NextResponse.json(hole);
  } catch (error) {
    console.error("Error creating hole:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
