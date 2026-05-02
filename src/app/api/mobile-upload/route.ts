import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { storeFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const travelId = formData.get("travelId") as string | null;

    if (!travelId) {
      return NextResponse.json({ error: "缺少旅行 ID" }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }

    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      select: { id: true, coupleId: true, title: true },
    });

    if (!travel) {
      return NextResponse.json({ error: "旅行不存在" }, { status: 404 });
    }

    const coupleUser = await prisma.user.findFirst({
      where: { coupleId: travel.coupleId },
      select: { id: true },
    });

    if (!coupleUser) {
      return NextResponse.json({ error: "未找到用户" }, { status: 500 });
    }

    const uploadedMedia = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const fileType = isImage ? "image" : isVideo ? "video" : "other";

      const ext = path.extname(file.name) || (isImage ? ".jpg" : ".mp4");
      const filename = `${uuidv4()}${ext}`;

      const { url } = await storeFile(buffer, filename, file.type);

      const media = await prisma.media.create({
        data: {
          coupleId: travel.coupleId,
          uploaderId: coupleUser.id,
          fileUrl: url,
          thumbUrl: isImage ? url : null,
          fileType,
          fileSize: BigInt(file.size),
          caption: null,
          takenAt: null,
        },
      });

      uploadedMedia.push({
        id: media.id,
        fileUrl: url,
        thumbUrl: isImage ? url : null,
        fileType,
        fileSize: Number(media.fileSize),
      });
    }

    const photoUrls = uploadedMedia.map((m) => m.fileUrl);
    const today = new Date().toISOString().split("T")[0];

    const maxOrder = await prisma.travelSpot.aggregate({
      where: { travelId },
      _max: { sortOrder: true },
    });

    await prisma.travelSpot.create({
      data: {
        travelId,
        name: `手机上传 (${today})`,
        city: null,
        country: null,
        latitude: 0,
        longitude: 0,
        visitDate: new Date(today),
        note: `通过手机扫码上传 ${files.length} 张照片`,
        photos: photoUrls,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: `已上传 ${files.length} 张照片到「${travel.title}」`,
      media: uploadedMedia,
    });
  } catch (error) {
    console.error("Mobile upload error:", error);
    return NextResponse.json({ error: "上传失败，请稍后再试" }, { status: 500 });
  }
}
