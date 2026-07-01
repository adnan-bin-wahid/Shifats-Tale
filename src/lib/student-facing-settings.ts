import "server-only";
import { createClient } from "./supabase/server";

export interface StudentFacingSettings {
  studentRankVisible: boolean;
  gradesDisplayed: boolean;
  pendingApprovalContactText: string;
  disabledAccountContactText: string;
  publicPhone: string | null;
  publicEmail: string | null;
}

const DEFAULTS: StudentFacingSettings = {
  studentRankVisible: true,
  gradesDisplayed: true,
  pendingApprovalContactText: "Please contact administration to activate your account.",
  disabledAccountContactText: "Your account is disabled. Please contact administration.",
  publicPhone: null,
  publicEmail: null,
};

export async function getStudentFacingSettings(): Promise<StudentFacingSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select(`
      student_rank_visible,
      grades_displayed,
      pending_approval_contact_text,
      disabled_account_contact_text,
      public_phone,
      public_email
    `)
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return DEFAULTS;
  }

  return {
    studentRankVisible: data.student_rank_visible ?? DEFAULTS.studentRankVisible,
    gradesDisplayed: data.grades_displayed ?? DEFAULTS.gradesDisplayed,
    pendingApprovalContactText: data.pending_approval_contact_text || DEFAULTS.pendingApprovalContactText,
    disabledAccountContactText: data.disabled_account_contact_text || DEFAULTS.disabledAccountContactText,
    publicPhone: data.public_phone || null,
    publicEmail: data.public_email || null,
  };
}
