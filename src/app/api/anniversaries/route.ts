import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";
import { lunarToSolar, daysUntilNextLunar, formatLunarDate } from "@/lib/lunar";
import { daysUntilNext } from "@/lib/utils";

// GET /api/anniversaries
export async function GET() {
  try {
    const { couple } = await requireCouple();

    const anniversaries = await prisma.anniversary.findMany({
      where: { coupleId: couple.id },
      orderBy: { date: "asc" },
    });

    // 在服务端预计算倒计时和农历显示文字
    const enriched = anniversaries.map((a) => ({
      ...a,
      daysUntil: a.isLunar
        ? daysUntilNextLunar(a.date, a.repeatType)
        : daysUntilNext(a.date, a.repeatType),
      lunarDateDisplay: a.isLunar ? formatLunarDate(new Date(a.date)) : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Get anniversaries error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取纪念日失败" }, { status: 500 });
  }
}

// POST /api/anniversaries
export async function POST(request: NextRequest) {
  try {
    const { couple } = await requireCouple();
    const body = await request.json();

    const { title, repeatType, remind, note, isLunar } = body;

    if (!title) {
      return NextResponse.json(
        { error: "标题为必填项" },
        { status: 400 }
      );
    }

    // 确定存储的公历日期
    let storeDate: Date;

    if (isLunar) {
      // 农历模式：从 lunarYear/lunarMonth/lunarDay 转换
      const { lunarYear, lunarMonth, lunarDay } = body;
      if (!lunarYear || !lunarMonth || !lunarDay) {
        return NextResponse.json(
          { error: "请选择完整的农历日期" },
          { status: 400 }
        );
      }
      try {
        storeDate = lunarToSolar(lunarYear, lunarMonth, lunarDay);
      } catch {
        return NextResponse.json(
          { error: "农历日期无效，请检查" },
          { status: 400 }
        );
      }
    } else {
      // 公历模式
      const { date } = body;
      if (!date) {
        return NextResponse.json(
          { error: "日期为必填项" },
          { status: 400 }
        );
      }
      storeDate = new Date(date);
    }

    const anniversary = await prisma.anniversary.create({
      data: {
        coupleId: couple.id,
        title,
        date: storeDate,
        isLunar: isLunar === true,
        repeatType: repeatType || "yearly",
        remind: remind !== undefined ? remind : true,
        note,
      },
    });

    return NextResponse.json(anniversary, { status: 201 });
  } catch (error) {
    console.error("Create anniversary error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "创建纪念日失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
