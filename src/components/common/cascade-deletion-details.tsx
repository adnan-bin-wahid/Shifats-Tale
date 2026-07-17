"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, ShieldCheck, Info } from "lucide-react";

export interface CascadeItem {
  label: string;
  description?: string;
}

interface CascadeDeletionDetailsProps {
  entityName: string;
  deletedItems: (string | CascadeItem)[];
  preservedItems?: (string | CascadeItem)[];
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
                return (
                  <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-rose-100/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-bold text-primary">{item.label}</span>
                      {item.description && (
                        <p className="text-[11px] text-muted leading-tight mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </li>
                );
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
                  return (
                    <li key={idx} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-900">{item.label}</span>
                        {item.description && (
                          <p className="text-[11px] text-emerald-800/80 leading-tight mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
