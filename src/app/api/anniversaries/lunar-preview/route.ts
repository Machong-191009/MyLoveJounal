import { NextRequest, NextResponse } from "next/server";
import { lunarToSolar } from "@/lib/lunar";

// GET /api/anniversaries/lunar-preview?year=1998&month=6&day=15
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const day = Number(searchParams.get("day"));

    if (!year || !month || !day) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const solarDate = lunarToSolar(year, month, day);
    const formatted = `${solarDate.getFullYear()}-${String(solarDate.getMonth() + 1).padStart(2, "0")}-${String(solarDate.getDate()).padStart(2, "0")}`;

    return NextResponse.json({ solarDate: formatted });
  } catch {
    return NextResponse.json({ error: "农历日期无效" }, { status: 400 });
  }
}
