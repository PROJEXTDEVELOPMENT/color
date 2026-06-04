import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileBase64 } = await req.json();
    const buffer = Buffer.from(fileBase64, "base64");

    const dir = path.join(process.cwd(), "public", "screenshot");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ path: `/screenshot/${fileName}` });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
