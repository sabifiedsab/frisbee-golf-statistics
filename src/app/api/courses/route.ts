import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, holes } = body;

    if (!name || !location) {
      return NextResponse.json({ error: "Missing name or location" }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        name,
        location,
        holes: holes ? {
          create: holes.map((hole: { number: number; par: number }) => ({
            number: hole.number,
            par: hole.par,
          })),
        } : undefined,
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const courses = await prisma.course.findMany();
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
