import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";

// GET /api/travels/[id] - 获取单个旅行详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const travel = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
      include: {
        spots: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    return NextResponse.json(travel);
  } catch (error) {
    console.error("Get travel error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取旅行详情失败" }, { status: 500 });
  }
}

// PUT /api/travels/[id] - 更新旅行
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();
    const body = await request.json();

    const existing = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    const travel = await prisma.travel.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        coverUrl: body.coverUrl,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
      },
    });

    return NextResponse.json(travel);
  } catch (error) {
    console.error("Update travel error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新旅行失败" }, { status: 500 });
  }
}

// DELETE /api/travels/[id] - 删除旅行
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const existing = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    await prisma.travel.delete({ where: { id } });

    return NextResponse.json({ message: "旅行已删除" });
  } catch (error) {
    console.error("Delete travel error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除旅行失败" }, { status: 500 });
  }
}
