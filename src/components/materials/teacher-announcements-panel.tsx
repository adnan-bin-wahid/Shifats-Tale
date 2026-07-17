"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  createAnnouncementAction, 
  updateAnnouncementAction, 
  deleteAnnouncementAction 
} from "@/app/actions/announcements";
import { 
  Save, 
  Trash2, 
  Edit3, 
  Bell, 
  Plus, 
  Calendar, 
  Clock, 
  X, 
  Loader2,
  CheckCircle,
  XCircle,
  Archive,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";

interface Announcement {
  id: string;
  batch_id: string;
  title: string;
  message: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  release_at: string | null;
  expires_at: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  batchId: string;
  batchName: string;
  announcements: Announcement[];
}

export function TeacherAnnouncementsPanel({ batchId, batchName, announcements }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  
  const formatDateForInput = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const pad = (num: number) => String(num).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const [releaseAt, setReleaseAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // UI state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState("");

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setMessage(ann.message);
    setStatus(ann.status);
    setReleaseAt(formatDateForInput(ann.release_at));
    setExpiresAt(formatDateForInput(ann.expires_at));
    setErrors({});
    setErrorMessage("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setStatus("DRAFT");
    setReleaseAt("");
    setExpiresAt("");
    setErrors({});
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setErrors({});

    const fieldErrors: Record<string, string[]> = {};
    if (!title.trim()) fieldErrors.title = ["Title is required."];
    if (!message.trim()) fieldErrors.message = ["Message is required."];
    if (releaseAt && expiresAt && new Date(expiresAt) <= new Date(releaseAt)) {
      fieldErrors.expiresAt = ["Expiry date must be after release date."];
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      batchId,
      title,
      message,
      status,
      releaseAt: releaseAt || null,
      expiresAt: expiresAt || null,
    };

    startTransition(async () => {
      let result;
      if (editingId) {
        result = await updateAnnouncementAction(editingId, payload);
      } else {
        result = await createAnnouncementAction(payload);
      }

      if (result.success) {
        toast.success(editingId ? "Announcement updated successfully!" : "Announcement created successfully!");
        handleCancelEdit();
        router.refresh();
      } else {
        if (result.errors) {
          setErrors(result.errors as any);
        } else {
          setErrorMessage(result.message || "An error occurred.");
          toast.error(result.message || "An error occurred.");
        }
      }
    });
  };

  const handleStatusChange = async (ann: Announcement, newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    const payload = {
      batchId: ann.batch_id,
      title: ann.title,
      message: ann.message,
      status: newStatus,
      releaseAt: ann.release_at,
      expiresAt: ann.expires_at,
    };

    startTransition(async () => {
      const res = await updateAnnouncementAction(ann.id, payload);
      if (res.success) {
        toast.success(`Announcement status changed to ${newStatus}!`);
        router.refresh();
      } else {
        setErrorMessage(res.message || "Failed to change status.");
        toast.error(res.message || "Failed to change status.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const res = await deleteAnnouncementAction(id);
      if (res.success) {
        toast.success("Announcement deleted permanently!");
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        setErrorMessage(res.message || "Failed to delete announcement.");
        toast.error(res.message || "Failed to delete announcement.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-bold text-slate-800">
      {/* Left side: Form */}
      <div className="lg:col-span-1 bg-white p-5 border border-slate-100 rounded-2xl shadow-sm h-fit space-y-4">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2.5 flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-primary" />
          {editingId ? "Edit Announcement" : "Create Announcement"}
        </h3>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Title *</label>
            <input
              type="text"
              placeholder="e.g. Next Class Postponed"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-slate-700"
            />
            {errors.title && <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.title[0]}</p>}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Message *</label>
            <textarea
              rows={5}
              placeholder="Type announcement details here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-slate-700"
            />
            {errors.message && <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.message[0]}</p>}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Release At (Optional)</label>
            <input
              type="datetime-local"
              value={releaseAt}
              onChange={(e) => setReleaseAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-700"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Expires At (Optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-700"
            />
            {errors.expiresAt && <p className="text-[10px] text-rose-600 mt-1 font-semibold">{errors.expiresAt[0]}</p>}
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-[10px]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl transition-all font-bold text-[10px] disabled:opacity-55 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {editingId ? "Save Changes" : "Post Announcement"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right side: List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          Announcements Log
          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
            {announcements.length} Total
          </span>
        </h3>

        {announcements.length === 0 ? (
          <div className="bg-white p-12 border border-slate-100 rounded-2xl shadow-sm text-center">
            <Bell className="h-10 w-10 text-slate-300 mx-auto stroke-1 mb-3" />
            <p className="text-slate-500 font-semibold">No announcements posted for this batch yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => {
              const now = new Date();
              const isScheduled = ann.release_at && new Date(ann.release_at) > now;
              const isExpired = ann.expires_at && new Date(ann.expires_at) <= now;

              return (
                <div 
                  key={ann.id}
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200 space-y-3.5 relative ${
                    editingId === ann.id ? "ring-1 ring-primary border-primary/20" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-slate-900">{ann.title}</h4>
                      
                      {/* Status label */}
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                          ann.status === "PUBLISHED"
                            ? isScheduled
                              ? "bg-sky-50 text-sky-700 border-sky-100"
                              : isExpired
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : ann.status === "DRAFT"
                            ? "bg-slate-50 text-slate-500 border-slate-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {ann.status}
                        {ann.status === "PUBLISHED" && isScheduled && " (Scheduled)"}
                        {ann.status === "PUBLISHED" && isExpired && " (Expired)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(ann)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {ann.status === "DRAFT" && (
                        <button
                          onClick={() => handleStatusChange(ann, "PUBLISHED")}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Quick Publish"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {ann.status === "PUBLISHED" && (
                        <button
                          onClick={() => handleStatusChange(ann, "DRAFT")}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Quick Draft"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {ann.status !== "ARCHIVED" && (
                        <button
                          onClick={() => handleStatusChange(ann, "ARCHIVED")}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmDeleteId(ann.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                    {ann.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3.5 text-[9px] text-slate-400 font-semibold border-t border-slate-50 pt-2.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Posted: {new Date(ann.created_at).toLocaleString()}
                    </span>
                    {ann.release_at && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-sky-500" />
                        Release: {new Date(ann.release_at).toLocaleString()}
                      </span>
                    )}
                    {ann.expires_at && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        Expires: {new Date(ann.expires_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-primary text-base">Permanent Delete</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to permanently delete this announcement? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Announcement Notice"
              deletedItems={[
                { label: "Announcement Record", description: "The central bulletin board notice in database" },
                { label: "Student Feed & Push Notifications", description: "All active dashboard banner displays and feed entries tied to this announcement" },
              ]}
              preservedItems={[
                { label: "Parent Batch & Student Accounts", description: "The academic batch and student records remain completely unaffected" },
              ]}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all font-extrabold text-xs disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
