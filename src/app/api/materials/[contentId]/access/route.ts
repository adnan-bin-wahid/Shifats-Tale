import { NextRequest, NextResponse } from "next/server";
import { generateSignedAccessUrl } from "@/lib/cloudinary";
import { requireMaterialAccess } from "@/lib/auth-guards";
import { RateLimitError, rateLimit } from "@/lib/rate-limit";

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
    // 1. Authoritative authentication and material authorization checks
    let material;
    let profileId: string;
    try {
      const auth = await requireMaterialAccess(contentId);
      material = auth.material;
      profileId = auth.profile.id;
    } catch {
      return NextResponse.json({ error: "Access denied" }, { status: 403, headers });
    }

    // 2. Rate limit the authenticated principal and the observed client IP.
    try {
      await rateLimit(`material-access-${profileId}`, 30, 60);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return NextResponse.json({ error: error.message }, { status: 429, headers });
      }
      return NextResponse.json({ error: "Access service temporarily unavailable" }, { status: 503, headers });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "preview"; // 'preview' or 'download'

    // 3. If download mode is requested, check material permissions
    if (mode === "download" && !material.allow_download) {
      return NextResponse.json({ error: "Download is not allowed for this material" }, { status: 403, headers });
    }

    // 4. Generate signed Cloudinary URL
    if (!material.cloudinary_public_id) {
      return NextResponse.json({ error: "Material does not contain a file asset" }, { status: 400, headers });
    }

    const resourceType = (material.cloudinary_resource_type as "image" | "raw") || "raw";
    const allowDownload = mode === "download";

    const signedUrl = generateSignedAccessUrl(
      material.cloudinary_public_id,
      resourceType,
      material.cloudinary_format,
      allowDownload,
      120 // 2 minutes short-lived URL
    );

    // Redirect user to the signed URL safely
    return NextResponse.redirect(signedUrl, { headers });
  } catch (err: any) {
    console.error("Error in access route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
