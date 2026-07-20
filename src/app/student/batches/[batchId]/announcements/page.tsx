import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Bell, ArrowLeft, Calendar, BookOpenCheck } from "lucide-react";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{
    subjectId?: string;
  }>;
}

export default async function StudentBatchAnnouncementsPage({ params, searchParams }: PageProps) {
  const { batchId } = await params;
  const { subjectId = "ALL" } = await searchParams;

  const { destination, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }
  if (destination === "ACCOUNT_DISABLED") {
    redirect("/account-disabled");
  }
  if (destination === "INVALID_PROFILE") {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id,name")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  if (!studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (enrollError) throw enrollError;
  if (!enrollment) redirect("/student?error=unauthorized_batch");

  const nowStr = new Date().toISOString();
  const [announcementResult, subjectResult] = await Promise.all([
    supabase
      .from("announcements")
      .select(`
        id,
        batch_id,
        subject_id,
        title,
        message,
        published_at,
        created_at,
        release_at,
        expires_at,
        subject:batch_subjects(id,name,code)
      `)
      .eq("batch_id", batchId)
      .eq("status", "PUBLISHED")
      .or(`release_at.is.null,release_at.lte.${nowStr}`)
      .or(`expires_at.is.null,expires_at.gt.${nowStr}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("batch_subjects")
      .select("id,name,code")
      .eq("batch_id", batchId)
      .not("status", "in", '("DRAFT","ARCHIVED")')
      .order("display_order", { ascending: true }),
  ]);

  if (announcementResult.error) throw announcementResult.error;
  if (subjectResult.error) throw subjectResult.error;

  const activeAnnouncements = (announcementResult.data || [])
    .filter((announcement) => {
      const isReleased = !announcement.release_at || new Date(announcement.release_at) <= new Date();
      const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > new Date();
      const matchesSubject =
        subjectId === "ALL" ||
        (subjectId === "GENERAL"
          ? !announcement.subject_id
          : announcement.subject_id === subjectId);
      return isReleased && isNotExpired && matchesSubject;
    })
    .map((announcement) => ({
      ...announcement,
      subject: announcement.subject?.[0] || null,
    }));

  return (
    <div className="space-y-8 text-xs font-bold text-slate-800">
      {/* Navigation header */}
      <div className="space-y-4">
        <Link
          href={`/student/batches/${batchId}`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch Details
        </Link>
        <DashboardPageHeader
          title={`${batch.name} - Announcements`}
          description="Read alerts, scheduled events updates, and batch notifications sent by the teacher."
        />
      </div>

      <div className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-blue-700" />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Browse by subject
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter announcements by subject">
          {[
            { id: "ALL", label: "All notices" },
            { id: "GENERAL", label: "General batch" },
            ...(subjectResult.data || []).map((subject) => ({
              id: subject.id,
              label: `${subject.name} · ${subject.code}`,
            })),
          ].map((option) => (
            <Link
              key={option.id}
              href={`/student/batches/${batchId}/announcements?subjectId=${option.id}`}
              aria-current={subjectId === option.id ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black transition ${
                subjectId === option.id
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {activeAnnouncements.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-border/40 shadow-sm text-center max-w-lg mx-auto">
          <Bell className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-4" />
          <h3 className="text-sm font-extrabold text-slate-700">No announcements posted</h3>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
            There are no active notices in this subject right now. Choose another subject or check again later.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {activeAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-amber-600">
                    {ann.subject ? `${ann.subject.name} · ${ann.subject.code}` : "General batch notice"}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{ann.title}</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ann.published_at || ann.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                {ann.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
