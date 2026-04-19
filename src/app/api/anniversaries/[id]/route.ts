import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";
import { lunarToSolar, solarToLunar } from "@/lib/lunar";

// GET /api/anniversaries/[id] - 获取单个纪念日（含农历信息）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const anniversary = await prisma.anniversary.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!anniversary) {
      return NextResponse.json({ error: "纪念日不存在" }, { status: 404 });
    }

    // 如果是农历纪念日，反推农历年月日供编辑回填
    let lunarInfo: { lunarYear: number; lunarMonth: number; lunarDay: number } | null = null;
    if (anniversary.isLunar) {
      const ld = solarToLunar(new Date(anniversary.date));
      lunarInfo = { lunarYear: ld.year, lunarMonth: ld.month, lunarDay: ld.day };
    }

    return NextResponse.json({ ...anniversary, ...lunarInfo });
  } catch (error) {
    console.error("Get anniversary error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取纪念日失败" }, { status: 500 });
  }
}

// PUT /api/anniversaries/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();
    const body = await request.json();

    const existing = await prisma.anniversary.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "纪念日不存在" }, { status: 404 });
    }

    const { title, repeatType, remind, note, isLunar } = body;

    // 确定存储的公历日期
    let storeDate: Date | undefined;

    if (isLunar) {
      const { lunarYear, lunarMonth, lunarDay } = body;
      if (lunarYear && lunarMonth && lunarDay) {
        try {
          storeDate = lunarToSolar(lunarYear, lunarMonth, lunarDay);
        } catch {
          return NextResponse.json(
            { error: "农历日期无效，请检查" },
            { status: 400 }
          );
        }
      }
    } else if (body.date) {
      storeDate = new Date(body.date);
    }

    const anniversary = await prisma.anniversary.update({
      where: { id },
      data: {
        title,
        date: storeDate,
        isLunar: isLunar !== undefined ? isLunar : undefined,
        repeatType,
        remind,
        note,
      },
    });

    return NextResponse.json(anniversary);
  } catch (error) {
    console.error("Update anniversary error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新纪念日失败" }, { status: 500 });
  }
}

// DELETE /api/anniversaries/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const existing = await prisma.anniversary.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "纪念日不存在" }, { status: 404 });
    }

    await prisma.anniversary.delete({ where: { id } });

    return NextResponse.json({ message: "纪念日已删除" });
  } catch (error) {
    console.error("Delete anniversary error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除纪念日失败" }, { status: 500 });
  }
}
