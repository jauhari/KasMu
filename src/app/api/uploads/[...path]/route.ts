import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ success: false, error: "Path wajib diisi" }, { status: 400 });
    }

    // Anti path traversal: resolve dan pastikan masih di dalam UPLOAD_ROOT
    const relativePath = path.join(...segments);
    const filePath = path.resolve(UPLOAD_ROOT, relativePath);
    const resolvedRoot = path.resolve(UPLOAD_ROOT);
    if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType(filePath),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    console.error("uploads serve error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal mengambil file" },
      { status: 500 }
    );
  }
}
