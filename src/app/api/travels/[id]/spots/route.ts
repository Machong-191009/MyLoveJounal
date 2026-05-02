import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCouple } from "@/lib/dal";

// POST /api/travels/[id]/spots - 添加地点
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    // 确认旅行属于当前情侣
    const travel = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { name, city, country, latitude, longitude, visitDate, note, photos } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "地点名称和坐标为必填项" },
        { status: 400 }
      );
    }

    // 获取当前最大排序号
    const maxOrder = await prisma.travelSpot.aggregate({
      where: { travelId: id },
      _max: { sortOrder: true },
    });

    const spot = await prisma.travelSpot.create({
      data: {
        travelId: id,
        name,
        city: city || null,
        country: country || null,
        latitude,
        longitude,
        visitDate: visitDate ? new Date(visitDate) : null,
        note: note || null,
        photos: photos || [],
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(spot, { status: 201 });
  } catch (error) {
    console.error("Create spot error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "添加地点失败" }, { status: 500 });
  }
}

// PATCH /api/travels/[id]/spots - 更新地点（通过 body 传 spotId + 要更新的字段）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const travel = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { spotId, photos, latitude, longitude, name, city, country, visitDate, note } = body;

    if (!spotId) {
      return NextResponse.json({ error: "缺少 spotId" }, { status: 400 });
    }

    const spot = await prisma.travelSpot.findFirst({
      where: { id: spotId, travelId: id },
    });

    if (!spot) {
      return NextResponse.json({ error: "地点不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (photos !== undefined) updateData.photos = photos;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city || null;
    if (country !== undefined) updateData.country = country || null;
    if (visitDate !== undefined) updateData.visitDate = visitDate ? new Date(visitDate) : null;
    if (note !== undefined) updateData.note = note || null;

    const updated = await prisma.travelSpot.update({
      where: { id: spotId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update spot error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "更新地点失败" }, { status: 500 });
  }
}

// DELETE /api/travels/[id]/spots - 删除地点 (通过 body 传 spotId)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { couple } = await requireCouple();

    const travel = await prisma.travel.findFirst({
      where: { id, coupleId: couple.id },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    const body = await request.json();
    const { spotId } = body;

    if (!spotId) {
      return NextResponse.json({ error: "缺少 spotId" }, { status: 400 });
    }

    await prisma.travelSpot.delete({
      where: { id: spotId, travelId: id },
    });

    return NextResponse.json({ message: "地点已删除" });
  } catch (error) {
    console.error("Delete spot error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "删除地点失败" }, { status: 500 });
  }
}
