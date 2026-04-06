"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getScoutingReport } from "@/lib/api";
import {
  Crosshair, Clock, Target, ShieldAlert,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   AI SCOUTING REPORT — narrative + tactical intel cards
   ═══════════════════════════════════════════════════════════════ */

function mdToHtml(md: unknown): string {
  if (typeof md !== "string") return "";
  return md
    // Force paragraph breaks before bold section headers
    .replace(/(?<!\n)\*\*(Key Move|Recommendation|Bottom Line|Action Item|The Move|Priority|Focus|Verdict|Assessment|Summary|Outlook|Warning|Opportunity|Exploit|Timing|Bait|Caution)(.+?)\*\*/gi,
      '\n\n**$1$2**')
    .replace(/<strong>/g, '<strong class="text-primary font-semibold">')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>')
    .replace(/\n\n+/g, "</p><p class='mt-3'>")
    .replace(/\n/g, "<br/>");
}

const INTEL_ICONS: Record<string, React.ReactNode> = {
  EXPLOIT: <Crosshair size={14} />,
  TIMING: <Clock size={14} />,
  BAIT: <Target size={14} />,
  CAUTION: <ShieldAlert size={14} />,
};

const INTEL_COLORS: Record<string, string> = {
  EXPLOIT: "#e47272",
  TIMING: "#d4a532",
  BAIT: "#7dd3a0",
  CAUTION: "#6bb8e0",
};

function CollapsibleNarrative({ narrative, intel }: { narrative: string; intel: Array<{ label: string; detail: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const fullHtml = mdToHtml(narrative);
  // Truncate to ~150 chars on sentence boundary
  const plain = narrative.replace(/\*\*(.+?)\*\*/g, "$1").replace(/<[^>]+>/g, "");
  const cutoff = plain.indexOf(".", 120);
  const previewText = cutoff > 0 && cutoff < 200 ? plain.slice(0, cutoff + 1) : plain.slice(0, 150) + "…";
  const hasMore = plain.length > previewText.length;

  return (
    <div className="space-y-3">
      {!expanded ? (
        <div>
          <p className="font-sans text-sm text-secondary leading-relaxed">{previewText}</p>
          {hasMore && (
            <button onClick={() => setExpanded(true)} className="font-sans text-[12px] font-semibold text-gold mt-2 cursor-pointer hover:underline">
              Read full report ↓
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="font-sans text-sm text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: `<p>${fullHtml}</p>` }} />
          <button onClick={() => setExpanded(false)} className="font-sans text-[12px] font-semibold text-gold mt-2 cursor-pointer hover:underline">
            Collapse ↑
          </button>
        </div>
      )}

      {/* Tactical intel cards — always visible */}
      {intel.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          {intel.map((item, i) => {
            const color = INTEL_COLORS[item.label] || "#9596a5";
            const icon = INTEL_ICONS[item.label] || null;
            return (
              <div key={i} className="flex items-start gap-3 pl-3 py-2 rounded-r-lg"
                style={{ borderLeft: `3px solid ${color}`, background: `${color}08` }}>
                {icon && <span className="shrink-0 mt-0.5" style={{ color }}>{icon}</span>}
                <div className="min-w-0">
                  <span className="font-sans text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color }}>
                    {item.label}
                  </span>
                  <p className="font-sans text-sm text-secondary leading-snug">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ScoutingReport({ leagueId, owner, ownerId }: {
  leagueId: string; owner: string; ownerId?: string | null;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["scouting-report", leagueId, owner],
    queryFn: () => getScoutingReport(leagueId, owner, ownerId),
    enabled: !!owner && !!leagueId,
    staleTime: 10 * 60 * 1000,
  });

  // Parse the response — handles structured JSON, cached shapes, and legacy plain text
  const raw = data as Record<string, unknown> | undefined;
  let narrative = "";
  let intel: Array<{ label: string; detail: string }> = [];

  function extractFromObj(obj: Record<string, unknown>): boolean {
    // Direct structured: {narrative, intel}
    if (typeof obj.narrative === "string") {
      narrative = obj.narrative;
      intel = (Array.isArray(obj.intel) ? obj.intel : []) as Array<{ label: string; detail: string }>;
      return true;
    }
    // Nested: {report: {narrative, intel}} (cache wrapping)
    if (obj.report && typeof obj.report === "object" && !Array.isArray(obj.report)) {
      return extractFromObj(obj.report as Record<string, unknown>);
    }
    // Fallback text fields
    if (typeof obj.raw_response === "string") { narrative = obj.raw_response; return true; }
    if (typeof obj.report === "string") { narrative = obj.report; return true; }
    if (typeof obj.text === "string") { narrative = obj.text; return true; }
    return false;
  }

  if (raw?.report) {
    const r = raw.report;
    if (typeof r === "object" && r !== null && !Array.isArray(r)) {
      extractFromObj(r as Record<string, unknown>);
    } else if (typeof r === "string") {
      // Could be JSON string or plain text
      const trimmed = r.trim();
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (!extractFromObj(parsed)) narrative = trimmed;
        } catch {
          narrative = r;
        }
      } else {
        narrative = r;
      }
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-2.5 border-b border-border flex items-center gap-2" style={{ background: "rgba(212,165,50,0.05)" }}>
        <span className="font-sans text-[11px] font-bold tracking-[0.15em] text-gold uppercase">Scouting Report</span>
        {raw?.sha_rank != null && (
          <span className="font-sans text-[10px] text-dim ml-auto">#{String(raw.sha_rank)} overall</span>
        )}
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3.5 rounded bg-elevated animate-pulse" style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        ) : error ? (
          <p className="font-sans text-sm text-dim italic">
            AI scouting report will be available after the league has been fully analyzed.
          </p>
        ) : narrative ? (
          <CollapsibleNarrative narrative={narrative} intel={intel} />
        ) : (
          <p className="font-sans text-sm text-dim italic">
            Scouting report is being generated. Check back shortly.
          </p>
        )}
      </div>
    </div>
  );
}
