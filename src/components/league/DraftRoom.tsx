"use client";

import { useLeagueStore } from "@/lib/stores/league-store";
import { useQuery } from "@tanstack/react-query";
import { getDraftHistory, getDraftAnalysis } from "@/lib/api";
import PlayerName from "@/components/league/PlayerName";

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

function DCard({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 6, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: C.goldDim, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.gold }}>{label}</span>
        {right}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

export default function DraftRoom() {
  const { currentLeagueId: lid, currentOwner: owner, currentOwnerId } = useLeagueStore();

  const { data: history } = useQuery({ queryKey: ["draft-history", lid], queryFn: () => getDraftHistory(lid!), enabled: !!lid });
  const { data: analysis } = useQuery({ queryKey: ["draft-analysis", lid, owner], queryFn: () => getDraftAnalysis(lid!, owner!, currentOwnerId), enabled: !!lid && !!owner });

  if (!lid) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><p style={{ fontFamily: MONO, fontSize: 13, color: C.dim }}>No league loaded</p></div>;

  const picks = history?.picks || [];
  const a = analysis as any;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 900, fontStyle: "italic", color: C.goldBright }}>Draft Room</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginLeft: "auto" }}>{picks.length} picks</span>
      </div>

      {/* Analysis Summary */}
      {a && a.total_picks > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 6, background: C.panel, border: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.08em" }}>DRAFT ANALYSIS — {owner}</span>
          <div style={{ width: 1, height: 16, background: C.border }} />
          {[
            { label: "PICKS", value: a.total_picks, color: C.primary },
            { label: "HIT RATE", value: `${a.hit_rate}%`, color: a.hit_rate >= 50 ? C.green : a.hit_rate >= 30 ? C.gold : C.red },
            { label: "BUST RATE", value: `${a.bust_rate}%`, color: a.bust_rate <= 30 ? C.green : C.red },
            { label: "HITS", value: a.hits, color: C.green },
            { label: "BUSTS", value: a.busts, color: C.red },
          ].map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <div style={{ width: 1, height: 16, background: C.border }} />}
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{s.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 10 }}>
        {/* Draft Board */}
        <DCard label="DRAFT HISTORY" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{picks.length} picks</span>}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "0.3fr 0.3fr 0.3fr 1.5fr 0.5fr 0.5fr", padding: "0 8px 4px", color: C.dim }}>
            {["RD", "PICK", "OVR", "PLAYER", "POS", "OWNER"].map((h) => (
              <span key={h} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {picks.map((p: any, i: number) => {
              const posColor = POS[p.player_position] || C.dim;
              const isOwner = owner && p.owner?.toLowerCase() === owner.toLowerCase();
              return (
                <div key={`${p.season}-${p.overall}-${i}`} style={{
                  display: "grid", gridTemplateColumns: "0.3fr 0.3fr 0.3fr 1.5fr 0.5fr 0.5fr",
                  padding: "3px 8px", alignItems: "center",
                  borderBottom: `1px solid ${C.white08}`,
                  borderLeft: isOwner ? `3px solid ${C.gold}` : "3px solid transparent",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.round}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{p.slot}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.primary }}>{p.overall}</span>
                  <PlayerName name={p.player_name || "—"} style={{ fontSize: 13, fontWeight: 500, color: isOwner ? C.gold : C.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "1px 4px", borderRadius: 3, color: posColor, background: `${posColor}15` }}>{p.player_position || "—"}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: isOwner ? C.gold : C.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.owner}</span>
                </div>
              );
            })}
            {picks.length === 0 && <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim, padding: 16, textAlign: "center" }}>No draft history available</p>}
          </div>
        </DCard>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {a && a.round_efficiency && (
            <DCard label="ROUND EFFICIENCY">
              {a.round_efficiency.map((r: any) => (
                <div key={r.round} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, width: 32, color: C.gold }}>R{r.round}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{r.picks} picks</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.elevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(r.hit_rate, 100)}%`, background: r.hit_rate >= 50 ? C.green : r.hit_rate >= 30 ? C.gold : C.red }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, width: 40, textAlign: "right", color: r.hit_rate >= 50 ? C.green : r.hit_rate >= 30 ? C.gold : C.red }}>{r.hit_rate}%</span>
                </div>
              ))}
            </DCard>
          )}

          {a && a.position_tendencies && (
            <DCard label="POSITION TENDENCIES">
              {a.position_tendencies.map((t: any) => (
                <div key={t.position} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.white08}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, width: 24, color: POS[t.position] || C.dim }}>{t.position}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.elevated, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(t.pct, 100)}%`, background: POS[t.position] || C.dim }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.secondary }}>{t.count} ({t.pct}%)</span>
                </div>
              ))}
            </DCard>
          )}

          {!owner && (
            <div style={{ borderRadius: 6, padding: 16, textAlign: "center", background: C.card, border: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>Select an owner from the sidebar to see draft analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
