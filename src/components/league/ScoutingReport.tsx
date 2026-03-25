"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getScoutingReport } from "@/lib/api";
import { C, SANS, MONO } from "./tokens";

/* ═══════════════════════════════════════════════════════════════
   MARKDOWN → HTML (basic: bold, paragraphs, line breaks)
   ═══════════════════════════════════════════════════════════════ */
function mdToHtml(md: string): string {
  return md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p style='margin-top:12px'>")
    .replace(/\n/g, "<br/>");
}

/* ═══════════════════════════════════════════════════════════════
   AI SCOUTING REPORT — multi-paragraph narrative
   ═══════════════════════════════════════════════════════════════ */
export default function ScoutingReport({ leagueId, owner }: {
  leagueId: string; owner: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["scouting-report", leagueId, owner],
    queryFn: () => getScoutingReport(leagueId, owner),
    enabled: !!owner && !!leagueId,
    staleTime: 10 * 60 * 1000,
  });

  // Handle various response shapes
  const raw = data as Record<string, unknown> | undefined;
  let reportText = "";
  if (raw?.report) {
    const r = raw.report;
    if (typeof r === "string") {
      // Could be a JSON string or plain markdown
      if (r.startsWith("{") || r.startsWith("[")) {
        try {
          const parsed = JSON.parse(r);
          reportText = typeof parsed.report === "string" ? parsed.report : typeof parsed === "string" ? parsed : JSON.stringify(parsed);
        } catch {
          reportText = r;
        }
      } else {
        reportText = r;
      }
    } else if (typeof r === "object") {
      const obj = r as Record<string, unknown>;
      reportText = String(obj.report || obj.text || obj.raw_response || "");
    }
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.goldGlow}, ${C.card})`,
      border: `1px solid ${C.goldBorder}`, borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        padding: "10px 16px", borderBottom: `1px solid ${C.goldBorder}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: `linear-gradient(135deg, ${C.gold}30, ${C.blue}20)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
        }}>🧠</div>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: C.gold }}>AI SCOUTING REPORT</span>
        {raw?.sha_rank != null && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, marginLeft: "auto" }}>
            #{String(raw.sha_rank)} overall
          </span>
        )}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                height: 14, borderRadius: 4, width: `${100 - i * 12}%`,
                background: `linear-gradient(90deg, ${C.elevated}, ${C.borderLt}, ${C.elevated})`,
                backgroundSize: "200% 100%", animation: "shimmer 1.8s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, fontStyle: "italic" }}>
            AI scouting report will be available after the league has been fully analyzed.
          </div>
        ) : reportText ? (
          <div
            style={{ fontFamily: SANS, fontSize: 14, color: C.secondary, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: `<p>${mdToHtml(reportText)}</p>` }}
          />
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim, fontStyle: "italic" }}>
            Scouting report is being generated. Check back shortly.
          </div>
        )}
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    </div>
  );
}
