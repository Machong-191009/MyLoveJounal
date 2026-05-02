import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { getUploadDir } from "@/lib/utils";

// Check if we're running on Vercel
const isVercel = !!process.env.VERCEL;

interface StorageResult {
  url: string;
  filename: string;
}

export async function storeFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<StorageResult> {
  if (isVercel) {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
    });
    return { url: blob.url, filename };
  }

  // Local filesystem
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);
  return { url: `/api/upload/${filename}`, filename };
}

export async function serveFile(
  filename: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (isVercel) {
    // On Vercel, files are stored in Blob (served via URL directly)
    return null;
  }

  // Local filesystem
  const safeName = path.basename(filename);
  const uploadDir = getUploadDir();
  const filePath = path.join(uploadDir, safeName);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".heic": "image/heic",
    };
    return {
      buffer,
      contentType: contentTypes[ext] || "application/octet-stream",
    };
  } catch {
    return null;
  }
}
