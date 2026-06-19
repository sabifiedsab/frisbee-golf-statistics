import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        holes: {
          orderBy: { number: "asc" },
          include: { _count: { select: { scores: true } } },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Flatten _count into hasScores for the client
    const withFlags = {
      ...course,
      holes: course.holes.map((h) => ({
        id: h.id,
        number: h.number,
        par: h.par,
        courseId: h.courseId,
        hasScores: h._count.scores > 0,
      })),
    };

    return NextResponse.json(withFlags);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
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

    // Verify course exists
    const existing = await prisma.course.findUnique({
      where: { id },
      include: { holes: { include: { scores: { select: { id: true } } } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // If holes are provided, check for deletions of holes that have scores
    if (holes && Array.isArray(holes)) {
      const incomingHoleIds = new Set(
        holes.map((h: { id?: string }) => h.id).filter((id): id is string => !!id)
      );
      const holesWithScores = existing.holes.filter(
        (h) => !incomingHoleIds.has(h.id) && h.scores.length > 0
      );
      if (holesWithScores.length > 0) {
        return NextResponse.json(
          { error: `Cannot delete hole(s) ${holesWithScores.map((h) => h.number).join(", ")} — they have recorded scores. Fork the course instead.` },
          { status: 400 }
        );
      }

      // Delete holes not in the incoming list (that have no scores), update existing, create new
      const incomingIds = [...incomingHoleIds];
      await prisma.hole.deleteMany({
        where: { courseId: id, id: { notIn: incomingIds.length > 0 ? incomingIds : undefined } },
      });

      for (const hole of holes) {
        if (hole.id) {
          await prisma.hole.update({
            where: { id: hole.id },
            data: { number: hole.number, par: hole.par },
          });
        } else {
          await prisma.hole.create({
            data: { number: hole.number, par: hole.par, courseId: id },
          });
        }
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
      },
      include: {
        holes: {
          orderBy: { number: "asc" },
          include: { _count: { select: { scores: true } } },
        },
      },
    });

    const withFlags = {
      ...updated,
      holes: updated.holes.map((h) => ({
        id: h.id,
        number: h.number,
        par: h.par,
        courseId: h.courseId,
        hasScores: h._count.scores > 0,
      })),
    };

    return NextResponse.json(withFlags);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
