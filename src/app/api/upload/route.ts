import { NextRequest, NextResponse } from "next/server";
import { requireCouple } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { storeFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { couple, user } = await requireCouple();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const memoryId = formData.get("memoryId") as string | null;
    const albumId = formData.get("albumId") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
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

      const thumbUrl = isImage
        ? url // On Vercel, thumb is same as full image
        : null;

      const media = await prisma.media.create({
        data: {
          coupleId: couple.id,
          uploaderId: user.id,
          memoryId: memoryId || null,
          albumId: albumId || null,
          fileUrl: url,
          thumbUrl,
          fileType,
          fileSize: BigInt(file.size),
          caption: null,
          takenAt: null,
        },
      });

      uploadedMedia.push({
        id: media.id,
        fileUrl: media.fileUrl,
        thumbUrl: media.thumbUrl,
        fileType: media.fileType,
        fileSize: Number(media.fileSize),
      });
    }

    return NextResponse.json({ media: uploadedMedia }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
