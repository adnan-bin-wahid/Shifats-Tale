import { NextRequest, NextResponse } from "next/server";
import { generateSignedAccessUrl } from "@/lib/cloudinary";
import { generateR2DownloadUrl } from "@/lib/r2";
import { requireMaterialAccess } from "@/lib/auth-guards";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const { contentId } = await params;

  // Prevent caching of signed URLs
  const headers = new Headers();
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  try {
    // 1. Rate limiting check by IP
    const ip = await getClientIp();
    try {
      await rateLimit(`material-access-${ip}`, 30, 60); // Max 30 file previews/downloads per minute
    } catch {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers });
    }

    // 2. Authoritative authentication and material authorization checks
    let material;
    try {
      const auth = await requireMaterialAccess(contentId);
      material = auth.material;
    } catch {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "preview"; // 'preview' or 'download'

    // 3. If download mode is requested, check material permissions
    if (mode === "download" && !material.allow_download) {
      return NextResponse.json({ error: "Download is not allowed for this material" }, { status: 403, headers });
    }

    // 4. Generate signed URL (R2 or Cloudinary)
    let signedUrl = "";
    if (material.storage_path) {
      // It's an R2 file
      signedUrl = await generateR2DownloadUrl(material.storage_path);
    } else if (material.cloudinary_public_id) {
      // It's a Cloudinary file
      const resourceType = (material.cloudinary_resource_type as "image" | "raw") || "raw";
      const allowDownload = mode === "download";

      signedUrl = generateSignedAccessUrl(
        material.cloudinary_public_id,
        resourceType,
        material.cloudinary_format,
        allowDownload,
        120 // 2 minutes short-lived URL
      );
    } else {
      return NextResponse.json({ error: "Material does not contain a file asset" }, { status: 400, headers });
    }

    // 5. Fetch file bytes from signed URL and stream through our server (hides raw storage URL & sets strict secure headers)
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to retrieve material from storage" }, { status: fileRes.status, headers });
    }

    const safeBaseName = (material.title || "material").replace(/[^a-zA-Z0-9 _-]/g, "_").trim().replace(/ +/g, "_");
    const isPdf = material.content_type === "application/pdf" || signedUrl.toLowerCase().includes(".pdf");
    const ext = isPdf ? ".pdf" : material.content_type === "image/png" ? ".png" : material.content_type === "image/jpeg" ? ".jpg" : ".pdf";
    const filename = safeBaseName.endsWith(ext) ? safeBaseName : `${safeBaseName}${ext}`;

    const resHeaders = new Headers();
    resHeaders.set("Cache-Control", "private, no-store");
    resHeaders.set("Pragma", "no-cache");

    if (mode === "download") {
      resHeaders.set("Content-Type", fileRes.headers.get("Content-Type") || (isPdf ? "application/pdf" : "application/octet-stream"));
      resHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    } else {
      resHeaders.set("Content-Type", isPdf ? "application/pdf" : fileRes.headers.get("Content-Type") || "application/pdf");
      resHeaders.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    return new NextResponse(fileRes.body as any, {
      status: 200,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("Error in access route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
