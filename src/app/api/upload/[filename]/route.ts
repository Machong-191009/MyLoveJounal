import { NextRequest, NextResponse } from "next/server";
import { serveFile } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const result = await serveFile(filename);

    if (!result) {
      // On Vercel, files are served via Blob URL directly - redirect
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
