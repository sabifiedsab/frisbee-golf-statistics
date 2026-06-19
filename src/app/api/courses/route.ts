import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";
    const where = includeArchived ? {} : { isArchived: false };

    // Only admins can see archived courses
    if (includeArchived && !session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
