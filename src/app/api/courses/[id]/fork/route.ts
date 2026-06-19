import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, location, holes } = body;

    const original = await prisma.course.findUnique({
      where: { id },
      include: { holes: { orderBy: { number: "asc" } } },
    });
    if (!original) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Create the new course with the edited holes
    const newCourse = await prisma.course.create({
      data: {
        name: name || original.name,
        location: location || original.location,
        holes: {
          create: (holes && Array.isArray(holes) ? holes : original.holes).map((h: { number: number; par: number }) => ({
            number: h.number,
            par: h.par,
          })),
        },
      },
      include: { holes: { orderBy: { number: "asc" } } },
    });

    // Archive the original
    await prisma.course.update({
      where: { id },
      data: { isArchived: true },
    });

    return NextResponse.json({ old: { id, archived: true }, new: newCourse });
  } catch (error) {
    console.error("Error forking course:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
