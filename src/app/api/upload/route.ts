import { NextRequest, NextResponse } from "next/server";
import { requireCouple } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

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

    // Ensure upload directories exist
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), UPLOAD_DIR);
    const thumbDir = path.join(uploadDir, "thumbs");
    await mkdir(uploadDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const uploadedMedia = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine file type
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const fileType = isImage ? "image" : isVideo ? "video" : "other";

      // Generate unique filename
      const ext = path.extname(file.name) || (isImage ? ".jpg" : ".mp4");
      const filename = `${uuidv4()}${ext}`;

      // Save file
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      // For images, also create a simple "thumbnail" reference
      // (In production you'd use sharp to resize)
      const thumbUrl = isImage ? `/api/upload/${filename}?thumb=true` : null;

      // Save to database
      const media = await prisma.media.create({
        data: {
          coupleId: couple.id,
          uploaderId: user.id,
          memoryId: memoryId || null,
          albumId: albumId || null,
          fileUrl: `/api/upload/${filename}`,
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
