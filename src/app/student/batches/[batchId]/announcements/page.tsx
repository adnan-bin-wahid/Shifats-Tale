import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Bell, ArrowLeft, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function StudentBatchAnnouncementsPage({ params }: PageProps) {
  const { batchId } = await params;

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
  const announcementResult = await supabase
    .from("announcements")
    .select("id,batch_id,title,message,published_at,created_at,release_at,expires_at")
    .eq("batch_id", batchId)
    .eq("status", "PUBLISHED")
    .or(`release_at.is.null,release_at.lte.${nowStr}`)
    .or(`expires_at.is.null,expires_at.gt.${nowStr}`)
    .order("created_at", { ascending: false });

  if (announcementResult.error) throw announcementResult.error;

  const activeAnnouncements = (announcementResult.data || []).filter((announcement) => {
    const isReleased = !announcement.release_at || new Date(announcement.release_at) <= new Date();
    const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > new Date();
    return isReleased && isNotExpired;
  });

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

      {activeAnnouncements.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-border/40 shadow-sm text-center max-w-lg mx-auto">
          <Bell className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-4" />
          <h3 className="text-sm font-extrabold text-slate-700">No announcements posted</h3>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
            There are no active notices or announcements for this batch right now.
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
                <h3 className="text-sm font-black text-slate-900">{ann.title}</h3>
                
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
