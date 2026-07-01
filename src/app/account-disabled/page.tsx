import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { siteInfo } from "@/data/site";
import { AccountDisabledView } from "./account-disabled-view";
import { getStudentFacingSettings } from "@/lib/student-facing-settings";

export default async function AccountDisabledPage() {
  // Authoritative server-side verification checks
  const {
    destination,
    profile,
    studentProfile,
  } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination === "TEACHER_DASHBOARD") {
    redirect("/teacher");
  }
  if (destination === "STUDENT_DASHBOARD") {
    redirect("/student");
  }
  if (destination === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }
  if (destination === "INVALID_PROFILE") {
    redirect("/login?error=invalid_profile");
  }

  const settings = await getStudentFacingSettings();
  const studentName = profile?.full_name || "User";
  const studentCode = studentProfile?.student_code || "N/A";

  return (
    <AccountDisabledView
      studentName={studentName}
      studentCode={studentCode}
      contactText={settings.disabledAccountContactText}
      contactPhone={settings.publicPhone || siteInfo.phone}
    />
  );
}
