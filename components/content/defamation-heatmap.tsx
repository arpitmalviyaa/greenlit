"use client";

import { cn } from "@/lib/utils/cn";

export interface DefamationSpan {
  text: string;
  start: number;
  end: number;
  risk: "high" | "medium" | "low";
  reason: string;
}

const RISK_HIGHLIGHT: Record<string, string> = {
  high: "bg-red-500/30 border-b-2 border-red-500 cursor-pointer",
  medium: "bg-amber-500/25 border-b-2 border-amber-400 cursor-pointer",
  low: "bg-yellow-400/20 border-b-2 border-yellow-400 cursor-pointer",
};

const RISK_TOOLTIP: Record<string, string> = {
  high: "bg-red-950 border-red-700 text-red-200",
  medium: "bg-amber-950 border-amber-700 text-amber-200",
  low: "bg-yellow-950 border-yellow-700 text-yellow-200",
};

interface Props {
  content: string;
  spans: DefamationSpan[];
}

export function DefamationHeatmap({ content, spans }: Props) {
  if (!spans.length) {
    return (
      <div className="text-slate-500 text-sm italic">No defamation risk spans detected.</div>
    );
  }

  // Sort spans by start position and remove overlaps (keep highest risk)
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; span?: DefamationSpan }> = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start < cursor) continue; // skip overlapping spans
    if (span.start > cursor) {
      segments.push({ text: content.slice(cursor, span.start) });
    }
    const end = Math.min(span.end, content.length);
    segments.push({ text: content.slice(span.start, end), span });
    cursor = end;
  }

  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor) });
  }

  return (
    <div className="text-slate-200 text-sm leading-7 whitespace-pre-wrap font-mono">
      {segments.map((seg, i) =>
        seg.span ? (
          <span key={i} className="group relative inline">
            <span className={cn("relative", RISK_HIGHLIGHT[seg.span.risk])}>
              {seg.text}
              {/* Tooltip */}
              <span className={cn(
                "absolute bottom-full left-0 z-50 mb-2 hidden group-hover:flex",
                "flex-col w-64 max-w-xs border rounded-lg px-3 py-2 shadow-xl text-xs",
                RISK_TOOLTIP[seg.span.risk]
              )}>
                <span className="font-bold uppercase mb-1">{seg.span.risk} risk</span>
                <span>{seg.span.reason}</span>
              </span>
            </span>
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  );
}

export function DefamationLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500 inline-block" />
        High
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-400 inline-block" />
        Medium
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-yellow-400/25 border border-yellow-400 inline-block" />
        Low
      </span>
    </div>
  );
}
