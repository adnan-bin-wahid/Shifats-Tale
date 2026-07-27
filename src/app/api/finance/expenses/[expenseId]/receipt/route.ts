import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth-guards";
import { generateR2DownloadUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "expense-receipt";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
  });

  try {
    await requireTeacher();
    const ip = await getClientIp();
    await rateLimit(`finance-receipt-${ip}`, 30, 60);
    const { expenseId } = await params;
    const admin = createAdminClient();
    const { data: expense, error } = await admin
      .from("finance_expenses")
      .select(
        "id, receipt_storage_path, receipt_file_name, receipt_content_type, receipt_size_bytes"
      )
      .eq("id", expenseId)
      .maybeSingle();

    if (error || !expense?.receipt_storage_path) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404, headers });
    }
    if (!expense.receipt_storage_path.startsWith("finance/receipts/")) {
      return NextResponse.json({ error: "Invalid receipt path." }, { status: 400, headers });
    }

    const signedUrl = await generateR2DownloadUrl(expense.receipt_storage_path);
    const fileResponse = await fetch(signedUrl, { cache: "no-store" });
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Receipt storage could not be reached." },
        { status: 502, headers }
      );
    }

    headers.set(
      "Content-Type",
      expense.receipt_content_type ||
        fileResponse.headers.get("Content-Type") ||
        "application/octet-stream"
    );
    headers.set(
      "Content-Disposition",
      `inline; filename="${safeFileName(expense.receipt_file_name || "expense-receipt")}"`
    );
    headers.set("X-Content-Type-Options", "nosniff");
    if (expense.receipt_size_bytes) {
      headers.set("Content-Length", String(expense.receipt_size_bytes));
    }

    return new NextResponse(fileResponse.body, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    const status = message.toLowerCase().includes("too many") ? 429 : 403;
    return NextResponse.json(
      { error: status === 429 ? "Too many receipt requests." : "Access denied." },
      { status, headers }
    );
  }
}
