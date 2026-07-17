"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, ShieldCheck, Info } from "lucide-react";

export interface CascadeItem {
  label: string;
  description?: string;
  subItems?: string[];
}

interface CascadeDeletionDetailsProps {
  entityName: string;
  deletedItems: (string | CascadeItem)[];
  preservedItems?: (string | CascadeItem)[];
}

function CascadeItemRow({ item, isDeleted }: { item: CascadeItem; isDeleted: boolean }) {
  const [subExpanded, setSubExpanded] = useState(false);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  if (isDeleted) {
    return (
      <li className="bg-white/90 rounded-xl border border-rose-200/80 shadow-2xs overflow-hidden transition-all">
        <div
          onClick={() => hasSubItems && setSubExpanded(!subExpanded)}
          className={`p-2.5 flex items-start justify-between gap-2 ${
            hasSubItems ? "cursor-pointer hover:bg-rose-50/60 transition-colors" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-primary text-xs">{item.label}</span>
                {hasSubItems && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-rose-100 text-rose-800 border border-rose-200/60">
                    {item.subItems!.length} Details
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-[11px] text-muted leading-tight mt-0.5">{item.description}</p>
              )}
            </div>
          </div>
          {hasSubItems && (
            <button
              type="button"
              className="p-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors shrink-0 mt-0.5"
            >
              {subExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {hasSubItems && subExpanded && (
          <div className="px-3 pb-3 pt-2 border-t border-rose-100/80 bg-rose-50/40 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1">
              <span>Affected Records & Breakdown:</span>
            </div>
            <ul className="space-y-1 pl-2 border-l-2 border-rose-300">
              {item.subItems!.map((sub, sIdx) => (
                <li key={sIdx} className="text-[11px] font-medium text-slate-700 flex items-start gap-1.5 leading-snug">
                  <span className="text-rose-500 font-bold shrink-0">•</span>
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="bg-emerald-50/50 rounded-xl border border-emerald-100 shadow-2xs overflow-hidden transition-all">
      <div
        onClick={() => hasSubItems && setSubExpanded(!subExpanded)}
        className={`p-2.5 flex items-start justify-between gap-2 ${
          hasSubItems ? "cursor-pointer hover:bg-emerald-100/50 transition-colors" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-emerald-900 text-xs">{item.label}</span>
              {hasSubItems && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                  {item.subItems!.length} Details
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[11px] text-emerald-800/80 leading-tight mt-0.5">{item.description}</p>
            )}
          </div>
        </div>
        {hasSubItems && (
          <button
            type="button"
            className="p-1 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 transition-colors shrink-0 mt-0.5"
          >
            {subExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {hasSubItems && subExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-emerald-200/60 bg-emerald-100/30 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
            <span>Preserved Entities & Protection Details:</span>
          </div>
          <ul className="space-y-1 pl-2 border-l-2 border-emerald-400">
            {item.subItems!.map((sub, sIdx) => (
              <li key={sIdx} className="text-[11px] font-medium text-emerald-900 flex items-start gap-1.5 leading-snug">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>{sub}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function CascadeDeletionDetails({
  entityName,
  deletedItems,
  preservedItems = [],
}: CascadeDeletionDetailsProps) {
  const [expanded, setExpanded] = useState(false);

  const normalizeItem = (item: string | CascadeItem): CascadeItem => {
    return typeof item === "string" ? { label: item } : item;
  };

  return (
    <div className="w-full mt-3 pt-3 border-t border-border/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-primary transition-all text-xs font-bold border border-border/40"
      >
        <span className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span>Check Cascade Impact Details ({deletedItems.length} child items affected)</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 p-3.5 bg-slate-50 border border-border/50 rounded-xl space-y-3.5 text-left animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2">
              <Trash2 className="h-3.5 w-3.5" />
              <span>Will Be Permanently Deleted (Cascaded):</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {deletedItems.map((raw, idx) => {
                const item = normalizeItem(raw);
                return <CascadeItemRow key={idx} item={item} isDeleted={true} />;
              })}
            </ul>
          </div>

          {preservedItems.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Safe & Preserved (Not Deleted):</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {preservedItems.map((raw, idx) => {
                  const item = normalizeItem(raw);
                  return <CascadeItemRow key={idx} item={item} isDeleted={false} />;
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
