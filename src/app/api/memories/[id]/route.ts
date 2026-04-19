import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";

// GET /api/memories/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple, user } = await requireCouple();

    const memory = await prisma.memory.findFirst({
      where: {
        id,
        coupleId: couple.id,
        OR: [{ isPrivate: false }, { isPrivate: true, authorId: user.id }],
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        media: true,
      },
    });

    if (!memory) {
      return NextResponse.json({ error: "回忆不存在" }, { status: 404 });
    }

    return NextResponse.json(memory);
  } catch (error) {
    console.error("Get memory error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取回忆失败" }, { status: 500 });
  }
}

// PUT /api/memories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();
    const body = await request.json();

    const existing = await prisma.memory.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "回忆不存在" }, { status: 404 });
    }

    const memory = await prisma.memory.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        memoryDate: body.memoryDate ? new Date(body.memoryDate) : undefined,
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        mood: body.mood,
        tags: body.tags,
        isPrivate: body.isPrivate,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        media: true,
      },
    });

    return NextResponse.json(memory);
  } catch (error) {
    console.error("Update memory error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新回忆失败" }, { status: 500 });
  }
}

// DELETE /api/memories/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const existing = await prisma.memory.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "回忆不存在" }, { status: 404 });
    }

    // Delete associated media first, then the memory
    await prisma.media.deleteMany({ where: { memoryId: id } });
    await prisma.memory.delete({ where: { id } });

    return NextResponse.json({ message: "回忆已删除" });
  } catch (error) {
    console.error("Delete memory error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除回忆失败" }, { status: 500 });
  }
}
