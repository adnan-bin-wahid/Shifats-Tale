"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteMaterialAction, updateMaterialAction } from "@/app/actions/materials";
import { 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  Copy, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Archive,
  ExternalLink,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";

interface Batch {
  id: string;
  name: string;
}

interface Material {
  id: string;
  batch_id: string;
  title: string;
  description: string | null;
  content_type: "PDF" | "DOC" | "DOCX" | "IMAGE" | "LINK" | "YOUTUBE" | "NOTE" | "ANNOUNCEMENT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  release_at: string | null;
  expires_at: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  file_size: number | null;
  original_filename: string | null;
  external_url: string | null;
  allow_download: boolean;
  storage_path?: string | null;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: string | null;
  cloudinary_format?: string | null;
  batches?: { name: string } | null;
}

interface Props {
  materials: Material[];
  batches: Batch[];
  selectedBatchId?: string;
}

export function TeacherMaterialsList({ materials, batches, selectedBatchId = "" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [batchIdFilter, setBatchIdFilter] = useState(selectedBatchId);
  const [contentTypeFilter, setContentTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [releaseFilter, setReleaseFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");

  // Deletion state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Copy success indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (materialId: string, currentMaterial: Material, newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    const formData = new FormData();
    formData.append("batchId", currentMaterial.batch_id);
    formData.append("title", currentMaterial.title);
    formData.append("contentType", currentMaterial.content_type);
    formData.append("status", newStatus);
    formData.append("description", currentMaterial.description || "");
    formData.append("externalUrl", currentMaterial.external_url || "");
    formData.append("allowDownload", String(currentMaterial.allow_download));
    formData.append("releaseAt", currentMaterial.release_at || "");
    formData.append("expiresAt", currentMaterial.expires_at || "");

    startTransition(async () => {
      const res = await updateMaterialAction(materialId, formData);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMessage(res.message || "Failed to update status.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const res = await deleteMaterialAction(id);
      if (res.success) {
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        setErrorMessage(res.message || "Failed to delete material.");
      }
    });
  };

  // Perform client-side filtering
  const filtered = materials.filter((item) => {
    // 1. Search term match
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(term);
      const descMatch = (item.description || "").toLowerCase().includes(term);
      if (!titleMatch && !descMatch) return false;
    }

    // 2. Batch filter
    if (batchIdFilter && item.batch_id !== batchIdFilter) return false;

    // 3. Content Type filter
    if (contentTypeFilter && item.content_type !== contentTypeFilter) return false;

    // 4. Status filter
    if (statusFilter && item.status !== statusFilter) return false;

    const now = new Date();

    // 5. Release state filter
    if (releaseFilter) {
      const isReleased = !item.release_at || new Date(item.release_at) <= now;
      if (releaseFilter === "RELEASED" && !isReleased) return false;
      if (releaseFilter === "FUTURE" && isReleased) return false;
    }

    // 6. Expiry state filter
    if (expiryFilter) {
      const isExpired = item.expires_at && new Date(item.expires_at) <= now;
      if (expiryFilter === "ACTIVE" && isExpired) return false;
      if (expiryFilter === "EXPIRED" && !isExpired) return false;
    }

    return true;
  });

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "-";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 text-xs font-bold text-slate-800">
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-rose-500 hover:text-rose-700">Close</button>
        </div>
      )}

      {/* Control panel: search, select filters and new button */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-semibold text-slate-700"
            />
          </div>
          
          <div>
            <Link
              href="/teacher/materials/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl transition-all shadow-sm font-bold text-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Study Material
            </Link>
          </div>
        </div>

        {/* Filter selectors grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 pt-2 border-t border-slate-50">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Batch</label>
            <select
              value={batchIdFilter}
              onChange={(e) => setBatchIdFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Content Type</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Types</option>
              {["PDF", "DOC", "DOCX", "IMAGE", "LINK", "YOUTUBE", "NOTE", "ANNOUNCEMENT"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Release State</label>
            <select
              value={releaseFilter}
              onChange={(e) => setReleaseFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Releases</option>
              <option value="RELEASED">Released (Live)</option>
              <option value="FUTURE">Future Scheduled</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase">Expiry State</label>
            <select
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="">All Active/Expired</option>
              <option value="ACTIVE">Active (Not Expired)</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Materials table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/55 text-[10px] text-slate-400 uppercase">
                <th className="px-6 py-4 font-bold">Title</th>
                <th className="px-6 py-4 font-bold">Batch</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Size</th>
                <th className="px-6 py-4 font-bold">Schedule</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    No study materials matched the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((material) => {
                  const hasFile = !!material.cloudinary_public_id || !!material.storage_path;
                  const isLink = ["LINK", "YOUTUBE"].includes(material.content_type);
                  
                  return (
                    <tr key={material.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900">{material.title}</div>
                        {material.description && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1 max-w-xs">
                            {material.description}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 font-semibold mt-1">
                          Created: {new Date(material.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {material.batches?.name || "Batch Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-slate-100 text-slate-700">
                          {material.content_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {formatBytes(material.file_size)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 space-y-1">
                        {material.release_at && (
                          <div className="text-[9px]">
                            <span className="text-slate-400">Release: </span>
                            {new Date(material.release_at).toLocaleString()}
                          </div>
                        )}
                        {material.expires_at && (
                          <div className="text-[9px]">
                            <span className="text-slate-400">Expires: </span>
                            {new Date(material.expires_at).toLocaleString()}
                          </div>
                        )}
                        {!material.release_at && !material.expires_at && (
                          <span className="text-slate-300 italic">Immediate</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                              material.status === "PUBLISHED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : material.status === "DRAFT"
                                ? "bg-slate-50 text-slate-500 border-slate-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}
                          >
                            {material.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          {hasFile && (
                            <a
                              href={`/api/materials/${material.id}/access?mode=preview`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"
                              title="Preview secure Cloudinary asset"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}

                          {isLink && material.external_url && (
                            <button
                              onClick={() => handleCopyLink(material.id, material.external_url!)}
                              className="p-1.5 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg relative"
                              title="Copy resource URL"
                            >
                              <Copy className="h-4 w-4" />
                              {copiedId === material.id && (
                                <span className="absolute bottom-full right-0 bg-slate-900 text-white text-[8px] font-bold py-0.5 px-1.5 rounded mb-1">
                                  Copied
                                </span>
                              )}
                            </button>
                          )}

                          <Link
                            href={`/teacher/materials/${material.id}/edit`}
                            className="p-1.5 text-slate-500 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"
                            title="Edit metadata / replace file"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          {/* Quick publication transitions */}
                          {material.status === "DRAFT" && (
                            <button
                              onClick={() => handleStatusChange(material.id, material, "PUBLISHED")}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors hover:bg-emerald-50 rounded-lg"
                              title="Quick Publish"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {material.status === "PUBLISHED" && (
                            <button
                              onClick={() => handleStatusChange(material.id, material, "DRAFT")}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors hover:bg-slate-100 rounded-lg"
                              title="Quick Draft"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {material.status !== "ARCHIVED" && (
                            <button
                              onClick={() => handleStatusChange(material.id, material, "ARCHIVED")}
                              className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors hover:bg-amber-50 rounded-lg"
                              title="Archive material"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setConfirmDeleteId(material.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors hover:bg-rose-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
                  Are you sure you want to permanently delete this study material? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Study Material"
              deletedItems={[
                {
                  label: "Material DB Record",
                  description: "The central study material title, description, and link row",
                  subItems: [
                    "Database record row (`materials` table: title, description, category, batch assignment)",
                    "Teacher assignment tracking and student download statistics for this item",
                  ],
                },
                {
                  label: "Cloudflare R2 & Cloudinary Storage Files",
                  description: "Any attached PDF, note, or media file object in cloud storage will be permanently wiped",
                  subItems: [
                    "Actual PDF/Document file stored inside Cloudflare R2 private bucket (`S3/R2 object deletion`)",
                    "Any Cloudinary media thumbnails, preview images, or attachments linked to this lecture",
                  ],
                },
              ]}
              preservedItems={[
                {
                  label: "Parent Batch & Curriculum",
                  description: "The batch and other study resources remain completely unaffected",
                  subItems: [
                    "The parent academic batch record and curriculum syllabus",
                    "Other study materials, notes, and video lectures inside the same category",
                  ],
                },
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
