import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createAuditLog } from "@/lib/audit";
import {
  ForbiddenError,
  requireTeacher,
  UnauthorizedError,
} from "@/lib/auth-guards";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getStudentProgressReportData } from "@/lib/reports/student-progress-report-data";
import { StudentProgressReportDocument } from "@/pdf/StudentProgressReportDocument";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { profile } = await requireTeacher();
    const ip = await getClientIp();
    try {
      await rateLimit(`student-progress-pdf-${profile.id}-${ip}`, 10, 600);
    } catch {
      return NextResponse.json(
        { error: "Too many report downloads. Please try again later." },
        { status: 429 }
      );
    }

    const { studentId } = await params;
    const batchId = new URL(request.url).searchParams.get("batchId") || "";
    if (!UUID_PATTERN.test(studentId) || !UUID_PATTERN.test(batchId)) {
      return NextResponse.json({ error: "Invalid report scope." }, { status: 400 });
    }

    const data = await getStudentProgressReportData(studentId, batchId);
    if (!data) {
      return NextResponse.json(
        { error: "Student enrollment or report data was not found." },
        { status: 404 }
      );
    }

    const document = React.createElement(StudentProgressReportDocument, {
      data,
    }) as unknown as React.ReactElement<DocumentProps>;
    const pdf = await renderToBuffer(document);
    await createAuditLog({
      actorProfileId: profile.id,
      action: "STUDENT_PROGRESS_REPORT_PDF_EXPORTED",
      entityType: "student_profiles",
      entityId: studentId,
      newValue: {
        batch_id: batchId,
        report_id: data.reportId,
        published_exam_count: data.summary.exam.published,
        assignment_count: data.summary.assignment.assigned,
      },
      ipAddress: ip,
    });

    const safeStudent = data.student.studentCode
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40);
    const safeBatch = data.batch.code
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 40);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeStudent || "student"}_${safeBatch || "batch"}_progress_report.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Teacher access required." }, { status: 403 });
    }
    console.error("Student progress report PDF generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate the progress report PDF." },
      { status: 500 }
    );
  }
}
