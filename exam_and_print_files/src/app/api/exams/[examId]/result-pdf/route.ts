import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getExamResultDocumentData } from "@/lib/exams/result-document-data";
import { ExamResultDocument } from "@/pdf/ExamResultDocument";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;

    // Verify authenticated session (Teacher or Student)
    const { destination } = await resolveAuthenticatedDestination();
    if (destination === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch single source of truth document data
    const data = await getExamResultDocumentData(examId);
    if (!data) {
      return NextResponse.json({ error: "Exam data not found" }, { status: 404 });
    }

    // Generate PDF Buffer
    const pdfBuffer = await renderToBuffer(React.createElement(ExamResultDocument, { data }) as any);

    // Clean filename
    const safeTitle = (data.exam.title || "Exam_Result")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${safeTitle}_Results.pdf`;

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating official result PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
