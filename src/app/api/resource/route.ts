import { NextRequest, NextResponse } from "next/server";
import { generateR2DownloadUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const isDownload = searchParams.get("download") === "true" || searchParams.get("download") === "1" || searchParams.get("mode") === "download";

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const downloadUrl = await generateR2DownloadUrl(key);

    // Fetch and stream the file directly from storage through our API to avoid 307 cross-origin redirects & CORS/iframe blocks on mobile
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      return NextResponse.redirect(downloadUrl);
    }

    const rawName = key.split("/").pop() || "document.pdf";
    const cleanedName = rawName.replace(/^\d+-/, "");
    const isPdf = cleanedName.toLowerCase().endsWith(".pdf") || key.toLowerCase().endsWith(".pdf");
    const filename = isPdf ? (cleanedName.endsWith(".pdf") ? cleanedName : `${cleanedName}.pdf`) : cleanedName;

    const resHeaders = new Headers();
    resHeaders.set("Content-Type", fileRes.headers.get("Content-Type") || (isPdf ? "application/pdf" : "application/octet-stream"));
    resHeaders.set("Cache-Control", "private, no-store");
    resHeaders.set("Pragma", "no-cache");
    resHeaders.set("Access-Control-Allow-Origin", "*");

    if (isDownload) {
      resHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      resHeaders.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    return new NextResponse(fileRes.body as any, {
      status: 200,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("Error resolving resource URL:", error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}
