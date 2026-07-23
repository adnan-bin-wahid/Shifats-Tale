import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StudentProgressReportBatchOption {
  id: string;
  name: string;
  code: string;
}

export interface StudentProgressReportStudentOption {
  id: string;
  batchId: string;
  fullName: string;
  studentCode: string;
  enrollmentStatus: string;
}

interface EnrollmentDirectoryRow {
  status: string;
  batch_id: string;
  student: {
    id: string;
    student_code: string;
    profile: { full_name: string };
  };
}

export async function getStudentProgressReportDirectory(): Promise<{
  batches: StudentProgressReportBatchOption[];
  students: StudentProgressReportStudentOption[];
}> {
  const supabase = await createClient();
  const [batchResult, enrollmentResult] = await Promise.all([
    supabase
      .from("batches")
      .select("id,name,code")
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select(`
        status,
        batch_id,
        student:student_profiles!inner(
          id,
          student_code,
          profile:profiles!inner(full_name)
        )
      `)
      .in("status", ["ACTIVE", "COMPLETED"])
      .order("created_at", { ascending: false }),
  ]);

  if (batchResult.error) throw batchResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;

  const rows = (enrollmentResult.data || []) as unknown as EnrollmentDirectoryRow[];
  const uniqueStudents = new Map<string, StudentProgressReportStudentOption>();
  const eligibleBatchIds = new Set(rows.map((row) => row.batch_id));

  for (const enrollment of rows) {
    const student = enrollment.student;
    if (!student?.id || !enrollment.batch_id) continue;

    const option = {
      id: student.id,
      batchId: enrollment.batch_id,
      fullName: student.profile?.full_name?.trim() || "Student",
      studentCode: student.student_code?.trim() || "—",
      enrollmentStatus: enrollment.status,
    };
    uniqueStudents.set(`${option.batchId}:${option.id}`, option);
  }

  return {
    batches: ((batchResult.data || []) as StudentProgressReportBatchOption[])
      .filter((batch) => eligibleBatchIds.has(batch.id)),
    students: Array.from(uniqueStudents.values()).sort((a, b) =>
      `${a.fullName}-${a.studentCode}`.localeCompare(
        `${b.fullName}-${b.studentCode}`
      )
    ),
  };
}
