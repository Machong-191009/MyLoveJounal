import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";

// GET /api/travels - 获取所有旅行
export async function GET() {
  try {
    const { couple } = await requireCouple();

    const travels = await prisma.travel.findMany({
      where: { coupleId: couple.id },
      include: {
        spots: {
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { spots: true } },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(travels);
  } catch (error) {
    console.error("Get travels error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取旅行记录失败" }, { status: 500 });
  }
}

// POST /api/travels - 创建旅行
export async function POST(request: NextRequest) {
  try {
    const { couple } = await requireCouple();
    const body = await request.json();

    const { title, description, startDate, endDate, status } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: "标题和开始日期为必填项" },
        { status: 400 }
      );
    }

    const travel = await prisma.travel.create({
      data: {
        coupleId: couple.id,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || "planned",
      },
    });

    return NextResponse.json(travel, { status: 201 });
  } catch (error) {
    console.error("Create travel error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "创建旅行失败" }, { status: 500 });
  }
}
