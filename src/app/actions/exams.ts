"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotificationForProfile } from "@/lib/notifications";
import { examSchema } from "@/lib/validations/exams";
import { calculateGrade, calculatePassFailStatus, calculateCompetitionRanks } from "@/lib/exams/grading";
import { revalidatePath } from "next/cache";

async function assertActiveTeacher() {
  const { destination, profile } = await resolveAuthenticatedDestination();
  if (
    destination !== "TEACHER_DASHBOARD" ||
    !profile ||
    profile.role !== "TEACHER" ||
    profile.account_status !== "ACTIVE"
  ) {
    throw new Error("Unauthorized: Only an active teacher can perform this action.");
  }
  return profile;
}

/**
 * Notifies all active students enrolled in a batch.
 */
async function notifyBatchStudents(
  batchId: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string
) {
  try {
    const admin = createAdminClient();
    const { data: enrollments, error } = await admin
      .from("enrollments")
      .select("student_profiles(profile_id)")
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE");

    if (error || !enrollments) {
      console.error("Failed to query enrolled students for notifications:", error);
      return;
    }

    for (const enroll of enrollments) {
      const profileId = (enroll.student_profiles as any)?.profile_id;
      if (profileId) {
        await createNotificationForProfile({
          profileId,
          type: entityType,
          title,
          message,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
        });
      }
    }
  } catch (err) {
    console.error("Error sending batch notifications:", err);
  }
}

export async function createExamAction(formData: FormData) {
  try {
    const teacher = await assertActiveTeacher();

    const batchId = formData.get("batchId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const examType = formData.get("examType") as any;
    const examDate = formData.get("examDate") as string;
    const totalMarks = formData.get("totalMarks") as string;
    const passMarks = formData.get("passMarks") as string;
    const startTime = formData.get("startTime") as string;
    const duration = formData.get("duration") as string;
    const status = (formData.get("status") as any) || "DRAFT";

    // Validate using Zod schema
    const validated = examSchema.safeParse({
      batchId,
      name,
      description,
      examType,
      examDate,
      totalMarks,
      passMarks,
      startTime,
      duration,
    });

    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();

    // Check batch status
    const { data: batch, error: batchError } = await admin
      .from("batches")
      .select("status")
      .eq("id", data.batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, message: "Batch not found." };
    }

    if (["ARCHIVED", "CANCELLED"].includes(batch.status)) {
      return { success: false, message: `Cannot schedule examinations for an ${batch.status.toLowerCase()} batch.` };
    }

    // Insert new examination
    const { data: newExam, error: dbError } = await admin
      .from("exams")
      .insert({
        batch_id: data.batchId,
        name: data.name,
        description: data.description || null,
        exam_type: data.examType,
        exam_date: data.examDate,
        total_marks: data.totalMarks,
        pass_marks: data.passMarks,
        status: status,
        start_time: data.startTime || null,
        duration: data.duration || null,
      })
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to create examination: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "EXAM_CREATED",
      entityType: "exams",
      entityId: newExam.id,
      newValue: newExam,
    });

    // Notify students if SCHEDULED
    if (newExam.status === "SCHEDULED") {
      await notifyBatchStudents(
        newExam.batch_id,
        "New Examination Scheduled",
        `A new exam "${newExam.name}" has been scheduled for ${newExam.exam_date}.`,
        "exam",
        newExam.id
      );

      await createAuditLog({
        actorProfileId: teacher.id,
        action: "EXAM_SCHEDULED",
        entityType: "exams",
        entityId: newExam.id,
      });
    }

    revalidatePath(`/teacher/batches/${newExam.batch_id}/exams`);
    revalidatePath(`/student/batches/${newExam.batch_id}/exams`);
    return { success: true, exam: newExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateExamAction(examId: string, formData: FormData) {
  try {
    const teacher = await assertActiveTeacher();

    const batchId = formData.get("batchId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const examType = formData.get("examType") as any;
    const examDate = formData.get("examDate") as string;
    const totalMarks = formData.get("totalMarks") as string;
    const passMarks = formData.get("passMarks") as string;
    const startTime = formData.get("startTime") as string;
    const duration = formData.get("duration") as string;
    const status = formData.get("status") as any;

    const validated = examSchema.safeParse({
      batchId,
      name,
      description,
      examType,
      examDate,
      totalMarks,
      passMarks,
      startTime,
      duration,
    });

    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();

    // Fetch existing exam
    const { data: oldExam, error: fetchError } = await admin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (fetchError || !oldExam) {
      return { success: false, message: "Examination not found." };
    }

    // Published examinations should not be edited without first unpublishing
    if (oldExam.status === "RESULT_PUBLISHED") {
      return {
        success: false,
        message: "This examination has published results. Please unpublish the results before editing details.",
      };
    }

    // Check if marks are already entered
    const { data: existingResults, error: resultsError } = await admin
      .from("exam_results")
      .select("id, obtained_marks, student_id")
      .eq("exam_id", examId);

    if (resultsError) {
      return { success: false, message: "Failed to verify existing results." };
    }

    const hasEnteredResults = existingResults && existingResults.length > 0;

    if (hasEnteredResults && oldExam.total_marks !== data.totalMarks) {
      // Revalidate existing marks
      const invalidMarks = existingResults.filter(
        (r) => r.obtained_marks !== null && r.obtained_marks > data.totalMarks
      );

      if (invalidMarks.length > 0) {
        return {
          success: false,
          message: `Cannot update total marks to ${data.totalMarks} because some entered student marks exceed this limit. Please adjust student marks first.`,
        };
      }

      // If validation passes, recalculate grades for all present students
      for (const res of existingResults) {
        if (res.obtained_marks !== null) {
          const newPercentage = (res.obtained_marks / data.totalMarks) * 100;
          const newGrade = calculateGrade(newPercentage);
          await admin
            .from("exam_results")
            .update({ grade: newGrade })
            .eq("id", res.id);
        }
      }
    }

    // Perform database update
    const { data: updatedExam, error: dbError } = await admin
      .from("exams")
      .update({
        name: data.name,
        description: data.description || null,
        exam_type: data.examType,
        exam_date: data.examDate,
        total_marks: data.totalMarks,
        pass_marks: data.passMarks,
        start_time: data.startTime || null,
        duration: data.duration || null,
        status: status || oldExam.status,
      })
      .eq("id", examId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to update examination: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "EXAM_EDITED",
      entityType: "exams",
      entityId: examId,
      oldValue: oldExam,
      newValue: updatedExam,
    });

    // Notify students if exam date changes materially
    if (oldExam.exam_date !== updatedExam.exam_date && updatedExam.status === "SCHEDULED") {
      await notifyBatchStudents(
        updatedExam.batch_id,
        "Examination Date Changed",
        `The date for "${updatedExam.name}" has been changed from ${oldExam.exam_date} to ${updatedExam.exam_date}.`,
        "exam",
        updatedExam.id
      );

      await createAuditLog({
        actorProfileId: teacher.id,
        action: "EXAM_RESCHEDULED",
        entityType: "exams",
        entityId: updatedExam.id,
      });
    }

    revalidatePath(`/teacher/batches/${updatedExam.batch_id}/exams`);
    revalidatePath(`/student/batches/${updatedExam.batch_id}/exams`);
    return { success: true, exam: updatedExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function saveDraftResultsAction(
  examId: string,
  results: Array<{
    studentId: string;
    enrollmentId: string;
    attendanceStatus: "PRESENT" | "ABSENT";
    obtainedMarks: number | null;
    remarks?: string;
  }>
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Fetch exam details
    const { data: exam, error: examError } = await admin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return { success: false, message: "Examination not found." };
    }

    if (exam.status === "RESULT_PUBLISHED") {
      return { success: false, message: "Cannot modify results of a published examination." };
    }

    // Process and validate results list
    const upsertRows = results.map((res) => {
      const attendanceStatus = res.attendanceStatus;
      let obtainedMarks = res.obtainedMarks;
      let grade: string | null = null;

      if (attendanceStatus === "ABSENT") {
        obtainedMarks = null;
      } else {
        if (obtainedMarks !== null) {
          if (obtainedMarks < 0) {
            throw new Error(`Obtained marks cannot be negative for student.`);
          }
          if (obtainedMarks > exam.total_marks) {
            throw new Error(`Obtained marks (${obtainedMarks}) cannot exceed exam total marks (${exam.total_marks}).`);
          }
          const percentage = (obtainedMarks / exam.total_marks) * 100;
          grade = calculateGrade(percentage);
        }
      }

      return {
        exam_id: examId,
        student_id: res.studentId,
        enrollment_id: res.enrollmentId,
        attendance_status: attendanceStatus,
        obtained_marks: obtainedMarks,
        grade,
        remarks: res.remarks || null,
      };
    });

    // Bulk upsert results list
    const { error: upsertError } = await admin
      .from("exam_results")
      .upsert(upsertRows, { onConflict: "exam_id,student_id" });

    if (upsertError) {
      return { success: false, message: `Failed to save results draft: ${upsertError.message}` };
    }

    // Update exam status to RESULT_DRAFT if currently draft, scheduled or completed
    if (["DRAFT", "SCHEDULED", "COMPLETED"].includes(exam.status)) {
      await admin
        .from("exams")
        .update({ status: "RESULT_DRAFT" })
        .eq("id", examId);
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "RESULTS_DRAFT_SAVED",
      entityType: "exams",
      entityId: examId,
    });

    revalidatePath(`/teacher/exams/${examId}/results`);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function publishResultsAction(examId: string, publicationNote: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Fetch exam
    const { data: exam, error: examError } = await admin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return { success: false, message: "Examination not found." };
    }

    // Fetch all current results
    const { data: results, error: fetchResultsError } = await admin
      .from("exam_results")
      .select("*")
      .eq("exam_id", examId);

    if (fetchResultsError) {
      return { success: false, message: "Failed to fetch saved results." };
    }

    if (!results || results.length === 0) {
      return { success: false, message: "Cannot publish empty results. Please save at least one result draft first." };
    }

    // Fetch all eligible active batch enrollments
    const { data: activeEnrollments, error: enrollError } = await admin
      .from("enrollments")
      .select("id, student_id")
      .eq("batch_id", exam.batch_id)
      .eq("status", "ACTIVE");

    if (enrollError) {
      return { success: false, message: "Failed to verify eligible batch students." };
    }

    // Check that every active enrolled student has a result record
    for (const enroll of activeEnrollments) {
      const studentResult = results.find((r) => r.student_id === enroll.student_id);
      if (!studentResult) {
        return {
          success: false,
          message: "Publication blocked: All active enrolled students must have an entered mark or absent status.",
        };
      }
    }

    // Perform validation checks on marks
    for (const r of results) {
      if (r.attendance_status === "PRESENT" && r.obtained_marks === null) {
        return {
          success: false,
          message: "Publication blocked: Present students must have obtained marks entered before publication.",
        };
      }
      if (r.obtained_marks !== null && r.obtained_marks > exam.total_marks) {
        return {
          success: false,
          message: `Obtained marks exceed total marks limit of ${exam.total_marks}.`,
        };
      }
    }

    // Calculate ranking & update ranks in database
    const rankedResults = calculateCompetitionRanks(results as any[]);

    for (const row of rankedResults) {
      const percentage = row.obtained_marks !== null ? (row.obtained_marks / exam.total_marks) * 100 : 0;
      const calculatedGrade = row.obtained_marks !== null ? calculateGrade(percentage) : null;

      await admin
        .from("exam_results")
        .update({
          rank: row.rank,
          grade: calculatedGrade,
        })
        .eq("id", row.id);
    }

    // Update examination state
    const { data: updatedExam, error: dbError } = await admin
      .from("exams")
      .update({
        status: "RESULT_PUBLISHED",
        published_at: new Date().toISOString(),
        result_publication_note: publicationNote || null,
      })
      .eq("id", examId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to update exam status: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "RESULTS_PUBLISHED",
      entityType: "exams",
      entityId: examId,
      newValue: updatedExam,
    });

    // Notify students
    await notifyBatchStudents(
      exam.batch_id,
      "Exam Results Published",
      `Results for examination "${exam.name}" have been published. View your marks now.`,
      "exam_result",
      examId
    );

    revalidatePath(`/teacher/exams/${examId}`);
    revalidatePath(`/student/batches/${exam.batch_id}/exams`);
    revalidatePath(`/student/results`);
    return { success: true, exam: updatedExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function unpublishResultsAction(examId: string, reason: string) {
  try {
    const teacher = await assertActiveTeacher();

    if (!reason || !reason.trim()) {
      return { success: false, message: "A reason is required to withdraw/unpublish results." };
    }

    const admin = createAdminClient();

    // Fetch existing exam
    const { data: exam, error: examError } = await admin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return { success: false, message: "Examination not found." };
    }

    if (exam.status !== "RESULT_PUBLISHED") {
      return { success: false, message: "This examination is not currently published." };
    }

    // Update exam status to draft
    const { data: updatedExam, error: dbError } = await admin
      .from("exams")
      .update({
        status: "RESULT_DRAFT",
        published_at: null,
      })
      .eq("id", examId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to unpublish results: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "RESULTS_UNPUBLISHED",
      entityType: "exams",
      entityId: examId,
      oldValue: exam,
      newValue: { ...updatedExam, unpublish_reason: reason },
    });

    // Notify students of withdrawal
    await notifyBatchStudents(
      exam.batch_id,
      "Exam Results Withdrawn",
      `The results for examination "${exam.name}" have been temporarily withdrawn for correction.`,
      "exam_result",
      examId
    );

    revalidatePath(`/teacher/exams/${examId}`);
    revalidatePath(`/student/batches/${exam.batch_id}/exams`);
    revalidatePath(`/student/results`);
    return { success: true, exam: updatedExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function archiveExamAction(examId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: updatedExam, error: dbError } = await admin
      .from("exams")
      .update({ status: "ARCHIVED" })
      .eq("id", examId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to archive examination: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "EXAM_ARCHIVED",
      entityType: "exams",
      entityId: examId,
    });

    revalidatePath(`/teacher/batches/${updatedExam.batch_id}/exams`);
    revalidatePath("/teacher/exams");
    return { success: true, exam: updatedExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function unarchiveExamAction(examId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Check if results were entered to restore to DRAFT or RESULT_DRAFT appropriately
    const { data: results, error: resError } = await admin
      .from("exam_results")
      .select("id")
      .eq("exam_id", examId);

    const hasResults = results && results.length > 0;
    const restoredStatus = hasResults ? "RESULT_DRAFT" : "DRAFT";

    const { data: updatedExam, error: dbError } = await admin
      .from("exams")
      .update({ status: restoredStatus })
      .eq("id", examId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Failed to unarchive examination: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "EXAM_UNARCHIVED",
      entityType: "exams",
      entityId: examId,
    });

    revalidatePath(`/teacher/batches/${updatedExam.batch_id}/exams`);
    revalidatePath("/teacher/exams");
    revalidatePath(`/teacher/exams/${examId}`);
    return { success: true, exam: updatedExam };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function deleteExamAction(examId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Fetch existing
    const { data: exam, error: fetchError } = await admin
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (fetchError || !exam) {
      return { success: false, message: "Examination not found." };
    }

    const { error: dbError } = await admin
      .from("exams")
      .delete()
      .eq("id", examId);

    if (dbError) {
      return { success: false, message: `Failed to delete examination: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "EXAM_DELETED",
      entityType: "exams",
      entityId: examId,
      oldValue: exam,
    });

    revalidatePath(`/teacher/batches/${exam.batch_id}/exams`);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}
