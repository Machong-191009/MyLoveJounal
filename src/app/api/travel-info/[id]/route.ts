import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public GET for basic travel info (used by mobile upload page)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const travel = await prisma.travel.findUnique({
      where: { id },
      select: { id: true, title: true, startDate: true },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    return NextResponse.json(travel);
  } catch {
    return NextResponse.json({ error: "获取旅行信息失败" }, { status: 500 });
  }
}
