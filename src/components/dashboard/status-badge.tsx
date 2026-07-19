import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let colors = "bg-[#E9EDF3] text-[#475569] border-[#DDE3EC]";

  switch (normalized) {
    case "ACTIVE":
    case "OPEN":
    case "PAID":
    case "APPROVED":
    case "RUNNING":
      colors = "bg-[#DDF8EC] text-[#087A55] border-[#DDF8EC]";
      break;
    case "PENDING":
    case "UPCOMING":
    case "SCHEDULED":
    case "PLANNED":
      colors = "bg-[#FFF2CC] text-[#A15C00] border-[#FFF2CC]";
      break;
    case "DRAFT":
      colors = "bg-[#EEF2F6] text-[#475569] border-[#E2E8F0]";
      break;
    case "PAUSED":
      colors = "bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]";
      break;
    case "CLOSED":
    case "INACTIVE":
    case "REJECTED":
    case "ARCHIVED":
      colors = "bg-[#E9EDF3] text-[#475569] border-[#E9EDF3]";
      break;
    case "DISABLED":
    case "SUSPENDED":
    case "FAILED":
    case "OVERDUE":
    case "CANCELLED":
      colors = "bg-[#FEE4E2] text-[#B42318] border-[#FEE4E2]";
      break;
    case "INFORMATION":
    case "COMPLETED":
    case "RESULT_PUBLISHED":
      colors = "bg-[#E8F1FF] text-[#175CD3] border-[#E8F1FF]";
      break;
    case "RESULT_DRAFT":
      colors = "bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]";
      break;
    case "SKIPPED":
      colors = "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border",
        colors,
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
