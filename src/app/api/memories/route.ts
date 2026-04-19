import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";

// GET /api/memories - List all memories for the couple
export async function GET(request: NextRequest) {
  try {
    const { couple, user } = await requireCouple();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      coupleId: couple.id,
      OR: [{ isPrivate: false }, { isPrivate: true, authorId: user.id }],
    };

    if (year) {
      const startDate = new Date(`${year}-${month || "01"}-01`);
      const endDate = month
        ? new Date(parseInt(year), parseInt(month), 0)
        : new Date(`${parseInt(year) + 1}-01-01`);
      where.memoryDate = { gte: startDate, lt: endDate };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          media: { select: { id: true, fileUrl: true, thumbUrl: true, fileType: true } },
        },
        orderBy: { memoryDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.memory.count({ where }),
    ]);

    return NextResponse.json({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get memories error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if ((error as Error).message === "Not paired yet") {
      return NextResponse.json({ error: "请先完成配对" }, { status: 403 });
    }
    return NextResponse.json({ error: "获取回忆失败" }, { status: 500 });
  }
}

// POST /api/memories - Create a new memory
export async function POST(request: NextRequest) {
  try {
    const { couple, user } = await requireCouple();
    const body = await request.json();

    const { title, content, memoryDate, location, latitude, longitude, mood, tags, isPrivate } = body;

    if (!title || !memoryDate) {
      return NextResponse.json(
        { error: "标题和日期为必填项" },
        { status: 400 }
      );
    }

    const memory = await prisma.memory.create({
      data: {
        coupleId: couple.id,
        authorId: user.id,
        title,
        content,
        memoryDate: new Date(memoryDate),
        location,
        latitude,
        longitude,
        mood,
        tags: tags || [],
        isPrivate: isPrivate || false,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        media: true,
      },
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    console.error("Create memory error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    if ((error as Error).message === "Not paired yet") {
      return NextResponse.json({ error: "请先完成配对" }, { status: 403 });
    }
    return NextResponse.json({ error: "创建回忆失败" }, { status: 500 });
  }
}
