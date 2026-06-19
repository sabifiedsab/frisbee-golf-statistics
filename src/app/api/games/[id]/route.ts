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
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            holes: true,
          },
        },
        participants: {
          include: {
            scores: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // Verify the user is a participant or the creator
    const game = await prisma.game.findUnique({
      where: { id },
      include: { participants: { select: { userId: true } } },
    });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const isParticipant = game.participants.some((p) => p.userId === session.user.id);
    const isCreator = game.userId === session.user.id;
    if (!isParticipant && !isCreator) {
      return NextResponse.json({ error: "Not authorized to edit this game" }, { status: 403 });
    }

    const updated = await prisma.game.update({
      where: { id },
      data: { date: new Date(date) },
    });

    return NextResponse.json({ date: updated.date });
  } catch (error) {
    console.error("Error updating game:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.score.deleteMany({
      where: {
        participant: {
          gameId: id,
        },
      },
    });
    await prisma.participant.deleteMany({ where: { gameId: id } });
    await prisma.game.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting game:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
