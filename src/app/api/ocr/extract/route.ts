import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractReceipt } from "@/lib/ocr";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "struk");
const MAX_SIZE_MB = 5;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Sesi tidak valid" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Gambar struk wajib diupload" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `Ukuran file maksimal ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const publicPath = `/uploads/struk/${fileName}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const base64 = buffer.toString("base64");
    const result = await extractReceipt(base64, file.type);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        imagePath: publicPath,
      },
    });
  } catch (err: any) {
    console.error("ocr/extract error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membaca struk" },
      { status: 500 }
    );
  }
}
