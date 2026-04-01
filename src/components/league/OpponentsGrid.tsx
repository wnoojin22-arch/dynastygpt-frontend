"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getOwnerProfiles, getLeagueIntel } from "@/lib/api";

const C = {
  bg: "#06080d", panel: "#0a0d15", card: "#10131d", elevated: "#171b28",
  border: "#1a1e30", white08: "rgba(255,255,255,0.06)",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)", goldBorder: "rgba(212,165,50,0.22)",
  green: "#7dd3a0", red: "#e47272", blue: "#6bb8e0", orange: "#e09c6b",
};
const POS: Record<string, string> = { QB: "#EF4444", RB: "#3B82F6", WR: "#22C55E", TE: "#F59E0B" };
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Playfair Display', Georgia, serif";

function fmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function gradeColor(g: string): string {
  if (!g) return C.dim;
  if (g === "ELITE" || g.startsWith("A")) return C.green;
  if (g === "STRONG" || g.startsWith("B")) return C.blue;
  if (g === "AVERAGE" || g.startsWith("C")) return C.gold;
  if (g === "WEAK" || g.startsWith("D")) return C.orange;
  return C.red;
}

export default function OpponentsGrid() {
  const { currentLeagueId: lid } = useLeagueStore();
  const router = useRouter();
  const pathname = usePathname();
  const slug = pathname.split("/")[2] || "";

  const { data: profiles } = useQuery({ queryKey: ["profiles", lid], queryFn: () => getOwnerProfiles(lid!), enabled: !!lid });
  const { data: intel } = useQuery({ queryKey: ["league-intel", lid], queryFn: () => getLeagueIntel(lid!), enabled: !!lid });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const owners = profiles?.profiles || [];
  const intelMap = new Map((intel?.owners || []).map(o => [o.owner.toLowerCase(), o]));

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Scouting Reports</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginLeft: "auto" }}>{owners.length} owners</span>
      </div>

      {/* Owner Grid */}
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {owners.map((p) => {
          const ownerIntel = intelMap.get(p.owner.toLowerCase());
          const grades = ownerIntel?.positional_grades || {};
          const tier = p.sha_rank <= 3 ? C.green : p.sha_rank <= 6 ? C.gold : p.sha_rank <= 9 ? C.orange : C.red;
          const windowLabel = p.window || "—";

          return (
            <div key={p.owner}
              onClick={() => router.push(`/l/${slug}/intel/${encodeURIComponent(p.owner)}`)}
              style={{
                borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}`,
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold + "40"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
              {/* Top bar with rank accent */}
              <div style={{ height: 3, background: tier }} />
              <div style={{ padding: 12 }}>
                {/* Name + Rank */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{p.owner}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: tier }}>#{p.sha_rank}</span>
                </div>

                {/* Window + Record */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: `${tier}15`, color: tier, border: `1px solid ${tier}25` }}>{windowLabel}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{p.record ? `${p.record.wins}W-${p.record.losses}L` : "—"}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold, marginLeft: "auto" }}>{fmt(p.total_sha)}</span>
                </div>

                {/* Positional Grades */}
                <div style={{ display: "flex", gap: 6 }}>
                  {(["QB", "RB", "WR", "TE"] as const).map((pos) => {
                    const g = grades[pos] || "?";
                    const clr = gradeColor(g);
                    return (
                      <div key={pos} style={{ flex: 1, textAlign: "center", padding: "4px 2px", borderRadius: 4, background: C.elevated }}>
                        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: POS[pos] }}>{pos}</span>
                        <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: clr }}>{g}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Needs / Strengths */}
                {ownerIntel && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ownerIntel.positional_needs.map((n) => (
                      <span key={`need-${n}`} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: `${C.red}15`, color: C.red, border: `1px solid ${C.red}25` }}>NEED {n}</span>
                    ))}
                    {ownerIntel.positional_strengths.map((s) => (
                      <span key={`str-${s}`} style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: `${C.green}15`, color: C.green, border: `1px solid ${C.green}25` }}>{s} ✓</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
