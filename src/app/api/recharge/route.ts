import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

// ✅ IMPORTANT: Force Node runtime (for fs)
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 🔐 Create Supabase client INSIDE function (safe for build)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase env missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();

    const utr = formData.get("utr") as string;
    const mobile = formData.get("mobile") as string;
    const file = formData.get("file") as File;

    if (!utr || !mobile || !file) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // ✅ Validate UTR
    if (!/^\d{12}$/.test(utr)) {
      return NextResponse.json(
        { error: "Invalid UTR" },
        { status: 400 }
      );
    }

    // 📂 Ensure directory exists
    const uploadDir = path.join(process.cwd(), "public", "screenshot");
    await fs.mkdir(uploadDir, { recursive: true });

    // 📸 Save screenshot
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${mobile}_${Date.now()}.png`;
    const uploadPath = path.join(uploadDir, fileName);

    await fs.writeFile(uploadPath, buffer);

    // 🗄 Insert into Supabase
    const { error } = await supabase.from("kycpayments").insert({
      mobile,
      utr,
      screenshot: `/screenshot/${fileName}`,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Recharge API Error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
