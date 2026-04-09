"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRoster, getLeagueIntel, getOwners, getPicks } from "@/lib/api";
import { useTradeBuilderStore } from "@/lib/stores/trade-builder-store";
import type {
  RosterPlayer,
  TradeEvaluation,
  SuggestedPackage,
  NegotiationInsight,
} from "@/components/league/trade-builder/types";

const API = "";
const MODES = ["conservative", "balanced", "aggressive"] as const;
export type TradeMode = (typeof MODES)[number];

export interface UseTradeBuilderReturn {
  // Data
  myRoster: RosterPlayer[];
  theirRoster: RosterPlayer[];
  otherOwners: { name: string }[];
  myIntel: Record<string, unknown> | undefined;
  theirIntel: Record<string, unknown> | undefined;
  myGrades: Record<string, string>;
  theirGrades: Record<string, string>;
  computedOW: string;
  computedPW: string;
  leagueIntel: unknown;

  // State
  partner: string;
  setPartner: (v: string) => void;
  myWindow: string | null;
  setMyWindow: (v: string | null) => void;
  theirWindow: string | null;
  setTheirWindow: (v: string | null) => void;
  mode: string;
  setMode: (v: string) => void;
  giveNames: string[];
  setGiveNames: React.Dispatch<React.SetStateAction<string[]>>;
  receiveNames: string[];
  setReceiveNames: React.Dispatch<React.SetStateAction<string[]>>;
  evaluation: TradeEvaluation | null;
  setEvaluation: (v: TradeEvaluation | null) => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  analyzing: boolean;
  suggestedPkgs: SuggestedPackage[];
  suggestLoading: boolean;
  suggestQuery: string;
  activeSellAsset: string | null;
  error: string | null;
  setError: (v: string | null) => void;
  chatCollapsed: boolean;
  setChatCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  chatInjection: string | null;

  // Computed
  hasTray: boolean;
  showResults: boolean;

  // Actions
  toggleGive: (n: string) => void;
  toggleReceive: (n: string) => void;
  handleAnalyze: () => Promise<void>;
  handleSellAsset: (name: string) => void;
  handleFindPosition: (pos: string) => void;
  handleSuggestWithPartner: () => void;
  handleTargetPlayer: (name: string) => void;
  buildPackage: (pkg: SuggestedPackage) => void;
  handleClear: () => void;
  fireSuggest: (body: Record<string, unknown>, query: string) => Promise<void>;
}

const toBackend = (w: string) => (w === "WIN-NOW" ? "CONTENDER" : w);
const toDisplay = (w: string) => (w === "CONTENDER" ? "WIN-NOW" : w);

function buildRoster(data: unknown, picksData?: unknown): RosterPlayer[] {
  const all: RosterPlayer[] = [];
  if (data) {
    const d = data as Record<string, unknown>;
    const bp = d.by_position as
      | Record<string, Array<Record<string, unknown>>>
      | undefined;
    if (bp) {
      for (const pos of ["QB", "RB", "WR", "TE"] as const) {
        for (const p of bp[pos] || []) {
          const trend = p.trend_30d as Record<string, unknown> | undefined;
          all.push({
            name: String(p.name || ""),
            name_clean: String(p.name_clean || ""),
            position: pos,
            sha_value: Number(p.sha_value || 0),
            sha_pos_rank: String(p.sha_pos_rank || ""),
            age: p.age ? Number(p.age) : null,
            ktc_value: p.ktc_value ? Number(p.ktc_value) : undefined,
            trend_label: trend?.label ? String(trend.label) : undefined,
            mkt_vs_pct: p.mkt_vs_pct != null ? Number(p.mkt_vs_pct) : undefined,
          });
        }
      }
    }
  }
  if (picksData) {
    const pd = picksData as Record<string, unknown>;
    const picks = (pd.picks || []) as Array<Record<string, unknown>>;
    for (const pk of picks) {
      const season = Number(pk.season);
      // 2026: show exact slot "2026 3.10". 2027+: no slots known, show "2027 Rd 1"
      const slotStr = season <= 2026 && pk.slot_label ? String(pk.slot_label) : `Rd ${pk.round}`;
      const label = `${pk.season} ${slotStr}`;
      all.push({
        name: label,
        name_clean: String(pk.season) + "_" + String(pk.round) + "_" + String(pk.original_owner || ""),
        position: "PICK",
        sha_value: Number(pk.sha_value || 0),
        sha_pos_rank: "",
        age: null,
        original_owner: pk.is_own_pick ? undefined : String(pk.original_owner || ""),
        is_own_pick: Boolean(pk.is_own_pick),
      });
    }
  }
  return all;
}

export function useTradeBuilder({
  leagueId,
  owner,
  ownerId,
}: {
  leagueId: string;
  owner: string;
  ownerId?: string | null;
}): UseTradeBuilderReturn {
  const [partner, setPartner] = useState("");
  const [myWindow, setMyWindow] = useState<string | null>(null);
  const [theirWindow, setTheirWindow] = useState<string | null>(null);
  const [mode, setMode] = useState("balanced");
  const [giveNames, setGiveNames] = useState<string[]>([]);
  const [receiveNames, setReceiveNames] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<TradeEvaluation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedPkgs, setSuggestedPkgs] = useState<SuggestedPackage[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [activeSellAsset, setActiveSellAsset] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatInjection, setChatInjection] = useState<string | null>(null);
  const buildingRef = useRef(false);

  // Data queries
  const { data: ownersData } = useQuery({
    queryKey: ["owners", leagueId],
    queryFn: () => getOwners(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });
  const { data: ownerRoster } = useQuery({
    queryKey: ["roster", leagueId, owner],
    queryFn: () => getRoster(leagueId, owner, ownerId),
    enabled: !!owner,
  });
  const { data: partnerRoster } = useQuery({
    queryKey: ["roster", leagueId, partner],
    queryFn: () => getRoster(leagueId, partner),
    enabled: !!partner,
  });
  const { data: ownerPicks } = useQuery({
    queryKey: ["picks", leagueId, owner],
    queryFn: () => getPicks(leagueId, owner, ownerId),
    enabled: !!owner,
    staleTime: 300000,
  });
  const { data: partnerPicks } = useQuery({
    queryKey: ["picks", leagueId, partner],
    queryFn: () => getPicks(leagueId, partner),
    enabled: !!partner,
    staleTime: 300000,
  });
  const { data: leagueIntel } = useQuery({
    queryKey: ["league-intel", leagueId],
    queryFn: () => getLeagueIntel(leagueId),
    enabled: !!leagueId,
    staleTime: 600000,
  });

  const myRoster = useMemo(
    () => buildRoster(ownerRoster, ownerPicks),
    [ownerRoster, ownerPicks],
  );
  const theirRoster = useMemo(
    () => buildRoster(partnerRoster, partnerPicks),
    [partnerRoster, partnerPicks],
  );
  const otherOwners = useMemo(
    () =>
      (ownersData?.owners || []).filter(
        (o: { name: string }) =>
          o.name.toLowerCase() !== owner.toLowerCase(),
      ),
    [ownersData, owner],
  );
  const myIntel = useMemo(
    () =>
      (leagueIntel as Record<string, unknown[]> | undefined)?.owners?.find(
        (o: unknown) =>
          (o as { owner: string }).owner.toLowerCase() ===
          owner.toLowerCase(),
      ) as Record<string, unknown> | undefined,
    [leagueIntel, owner],
  );
  const theirIntel = useMemo(
    () =>
      (leagueIntel as Record<string, unknown[]> | undefined)?.owners?.find(
        (o: unknown) =>
          (o as { owner: string }).owner.toLowerCase() ===
          partner.toLowerCase(),
      ) as Record<string, unknown> | undefined,
    [leagueIntel, partner],
  );
  const myGrades = useMemo(
    () => ((myIntel?.positional_grades || {}) as Record<string, string>),
    [myIntel],
  );
  const theirGrades = useMemo(
    () => ((theirIntel?.positional_grades || {}) as Record<string, string>),
    [theirIntel],
  );
  const computedOW = toDisplay(String(myIntel?.window || "BALANCED"));
  const computedPW = toDisplay(String(theirIntel?.window || "BALANCED"));

  // Clear on partner change (unless building from package)
  useEffect(() => {
    if (buildingRef.current) {
      buildingRef.current = false;
      return;
    }
    setGiveNames([]);
    setReceiveNames([]);
    setEvaluation(null);
    setShowModal(false);
    setSuggestedPkgs([]);
    setSuggestQuery("");
    setError(null);
  }, [partner]);

  // Toggle
  const toggleGive = useCallback((n: string) => {
    setGiveNames((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
    setEvaluation(null);
    setShowModal(false);
    setSuggestedPkgs([]);
  }, []);
  const toggleReceive = useCallback((n: string) => {
    setReceiveNames((p) =>
      p.includes(n) ? p.filter((x) => x !== n) : [...p, n],
    );
    setEvaluation(null);
    setShowModal(false);
  }, []);

  // Analyze
  const handleAnalyze = useCallback(async () => {
    if (!partner || !giveNames.length || !receiveNames.length) return;
    setAnalyzing(true);
    setError(null);
    try {
      const { authHeaders } = await import("@/lib/api");
      const hdrs = await authHeaders();
      const res = await fetch(
        `${API}/api/league/${leagueId}/trade-builder/evaluate`,
        {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({
            owner,
            partner,
            i_give: giveNames,
            i_receive: receiveNames,
            mode,
            window_override: myWindow ? toBackend(myWindow) : null,
            partner_window_override: theirWindow ? toBackend(theirWindow) : null,
            user_id: ownerId || undefined,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        let msg = "Failed";
        try { const j = JSON.parse(text); msg = j.error || j.detail || msg; } catch { msg = text.slice(0, 120) || msg; }
        setError(msg);
      } else {
        const data = await res.json();
        const ev = data as TradeEvaluation;
        setEvaluation(ev);
        setShowModal(true);
        const g = ev.owner_grade;
        const acc = ev.acceptance?.acceptance_likelihood;
        if (g) {
          const injection = `${giveNames.join(", ")} to ${partner} for ${receiveNames.join(", ")}\nGrade: ${g.grade} (${g.score}) — ${g.verdict}${acc ? `. ${acc}% acceptance likelihood` : ""}${g.reasons?.[0] ? `\n${g.reasons[0]}` : ""}\n${Date.now()}`;
          setChatInjection(injection);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAnalyzing(false);
    }
  }, [
    owner,
    partner,
    giveNames,
    receiveNames,
    mode,
    myWindow,
    theirWindow,
    leagueId,
    ownerId,
  ]);

  // Suggest — calls V2 trade engine
  const fireSuggest = useCallback(
    async (body: Record<string, unknown>, query: string) => {
      setSuggestLoading(true);
      setSuggestedPkgs([]);
      setSuggestQuery(query);
      setError(null);
      try {
        const sellAsset = (body.sell_asset as string) || undefined;
        const sellAssets = (body.sell_assets as string[]) || undefined;
        const targetAsset = (body.i_receive as string[])?.[0] || undefined;
        const findPosition = (body.find_position as string) || undefined;

        // Step 1: Fire async job
        const { authHeaders: getHdrs } = await import("@/lib/api");
        const suggestHdrs = await getHdrs();
        const startRes = await fetch(
          `${API}/api/league/${leagueId}/v2/trade-engine/generate`,
          {
            method: "POST",
            headers: suggestHdrs,
            body: JSON.stringify({
              owner,
              asset: sellAsset || undefined,
              assets: sellAssets || undefined,
              target_asset: targetAsset || undefined,
              mode,
              partner: (body.partner as string) || undefined,
              find_position: findPosition || undefined,
              user_id: ownerId || undefined,
            }),
          },
        );
        if (!startRes.ok) {
          const text = await startRes.text();
          let msg = "Failed";
          try { const j = JSON.parse(text); msg = j.error || j.detail || msg; } catch { msg = text.slice(0, 120) || msg; }
          setError(msg);
          setSuggestLoading(false);
          return;
        }
        const { job_id } = await startRes.json();
        if (!job_id) { setError("No job ID returned"); setSuggestLoading(false); return; }

        // Step 2: Poll for result
        // 60 attempts × 2s = 120s ceiling. Backend AI generation typically
        // takes 70-90s on a cold (uncached) job, so 60s was always too short.
        let data: Record<string, unknown> | null = null;
        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise((r) => setTimeout(r, 2000));
          const freshHdrs = await getHdrs(); // refresh token each poll — Clerk JWTs expire ~60s
          const pollRes = await fetch(`${API}/api/league/${leagueId}/v2/trade-engine/status/${job_id}`, { cache: "no-store", headers: freshHdrs });
          if (!pollRes.ok) {
            if (pollRes.status === 404 && attempt < 3) continue; // job may not be registered yet
            setError(`Poll failed (${pollRes.status})`);
            setSuggestLoading(false);
            return;
          }
          const poll = await pollRes.json();
          if (poll.status === "complete" || poll.packages) {
            data = poll.packages ? poll : poll;
            break;
          }
          if (poll.status === "error") {
            setError(poll.error || "Trade engine failed");
            setSuggestLoading(false);
            return;
          }
          // Still processing — continue polling
        }
        if (!data) { setError("Timed out waiting for suggestions"); setSuggestLoading(false); return; }

        const mapAsset = (a: Record<string, unknown>) => ({
          ...a,
          name: String(a.name || ""),
          position: String(a.position || ""),
          is_pick: Boolean(a.is_pick),
          age: a.age != null ? Number(a.age) : null,
          sha: Number(a.sha_value || a.sha || 0),
          dynasty: Number(a.sha_value || a.sha || 0),
          winnow: 0,
          sha_positional_rank: String(a.sha_pos_rank || a.sha_positional_rank || ""),
          sha_pos_rank_num: 0,
          error: null,
        });

        const packages: SuggestedPackage[] = (
          (data as Record<string, unknown>).packages as Array<Record<string, unknown>> || []
        ).map((p: Record<string, unknown>) => {
          const give = ((p.give || []) as Array<Record<string, unknown>>).map(mapAsset);
          const receive = ((p.receive || []) as Array<Record<string, unknown>>).map(mapAsset);
          const balance = (p.sha_balance || {}) as Record<string, unknown>;
          const confidence = (p.confidence as number) || 0;
          return {
            partner: p.partner as string,
            i_give: give,
            i_receive: receive,
            i_give_names: give.map((a) => a.name as string),
            i_receive_names: receive.map((a) => a.name as string),
            sha_balance: balance,
            acceptance_likelihood: confidence,
            owner_trade_grade: {
              grade:
                confidence >= 70
                  ? "A"
                  : confidence >= 50
                    ? "B"
                    : confidence >= 30
                      ? "C"
                      : "D",
              score: confidence,
              verdict: "",
            },
            negotiation_insights: [],
            combined_score: confidence,
            pitch: (p.rationale as string) || "",
            narrative: (p.rationale as string) || "",
            tier: "",
            market_comparison: "",
            roster_warnings: (p.roster_warnings as string[]) || [],
          } as unknown as SuggestedPackage;
        });
        setSuggestedPkgs(packages);

        // If empty packages, surface why
        if (packages.length === 0) {
          const apiError = (data as Record<string, unknown>).error as string | undefined;
          const killed = ((data as Record<string, unknown>)._debug_killed as Array<Record<string, unknown>>) || [];

          if (apiError) {
            // AI returned no proposals — backend told us
            setError(apiError);
          } else if (killed.length > 0) {
            // Validator killed everything — pick most common reason
            const reasons = killed
              .map((k) => {
                const violations = (k.violations as string[]) || [];
                return violations[0] || "";
              })
              .filter(Boolean);
            const counts: Record<string, number> = {};
            for (const r of reasons) {
              const key = r.includes("franchise cornerstone")
                ? "This partner won't trade their cornerstone for what you're offering. Add more value or try another partner."
                : r.includes("not on")
                  ? "Roster mismatch — try a different player"
                  : r.slice(0, 120);
              counts[key] = (counts[key] || 0) + 1;
            }
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            setError(top ? top[0] : "No viable trades found. Try AGGRESSIVE mode.");
          } else {
            setError("No viable trades found at this aggression level. Try AGGRESSIVE mode.");
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setSuggestLoading(false);
      }
    },
    [owner, mode, leagueId, ownerId],
  );

  const handleSellAsset = useCallback(
    (name: string) => {
      setActiveSellAsset(name);
      fireSuggest({ sell_asset: name }, `Selling ${name}`);
    },
    [fireSuggest],
  );

  const handleFindPosition = useCallback(
    (pos: string) => {
      fireSuggest(
        {
          sell_asset: activeSellAsset || undefined,
          find_position: pos,
          partner: partner || undefined,
        },
        activeSellAsset
          ? `Trading ${activeSellAsset} for a ${pos}`
          : `Finding ${pos} upgrades`,
      );
    },
    [fireSuggest, partner, activeSellAsset],
  );

  const handleSuggestWithPartner = useCallback(() => {
    const body: Record<string, unknown> = {};
    if (partner) body.partner = partner;
    // Send all checked players as context
    if (giveNames.length > 0) {
      body.sell_asset = giveNames[0];
      if (giveNames.length > 1) body.sell_assets = giveNames;
    } else if (activeSellAsset) {
      body.sell_asset = activeSellAsset;
    }
    if (receiveNames.length > 0) {
      body.i_receive = receiveNames;
    }

    const parts: string[] = [];
    if (giveNames.length > 0) parts.push(`selling ${giveNames.join(", ")}`);
    if (receiveNames.length > 0) parts.push(`targeting ${receiveNames.join(", ")}`);
    if (partner) parts.push(`with ${partner}`);
    const label = parts.length > 0 ? parts.join(" ") : "Best available trades";

    fireSuggest(body, label);
  }, [fireSuggest, partner, activeSellAsset, giveNames, receiveNames]);

  const handleTargetPlayer = useCallback(
    (name: string) => {
      if (!partner) return;
      setActiveSellAsset(null);
      fireSuggest(
        { i_receive: [name], partner },
        `Targeting ${name} from ${partner}`,
      );
    },
    [fireSuggest, partner],
  );

  const buildPackage = useCallback(
    (pkg: SuggestedPackage) => {
      if (!partner && pkg.partner) {
        buildingRef.current = true;
        setPartner(pkg.partner);
      }
      setGiveNames(pkg.i_give_names || []);
      setReceiveNames(pkg.i_receive_names || []);
      setSuggestedPkgs([]);
      setSuggestQuery("");
    },
    [partner],
  );

  const handleClear = useCallback(() => {
    setSuggestedPkgs([]);
    setSuggestQuery("");
    setGiveNames([]);
    setReceiveNames([]);
    setEvaluation(null);
    setShowModal(false);
    setActiveSellAsset(null);
    setError(null);
  }, []);

  // Consume cross-page intent (from Dashboard "Your Move" cards)
  const intentConsumed = useRef(false);
  useEffect(() => {
    if (intentConsumed.current) return;
    const intent = useTradeBuilderStore.getState().consumeIntent();
    if (!intent) return;
    intentConsumed.current = true;
    if (intent.type === "sell") {
      handleSellAsset(intent.value);
    } else if (intent.type === "buy") {
      fireSuggest({ i_receive: [intent.value] }, `Targeting ${intent.value}`);
    } else if (intent.type === "position") {
      fireSuggest(
        { find_position: intent.value },
        `Finding ${intent.value} upgrades`,
      );
    }
  }, [handleSellAsset, fireSuggest]);

  const hasTray = giveNames.length > 0 || receiveNames.length > 0;
  const showResults = suggestedPkgs.length > 0 || suggestLoading;

  return {
    myRoster,
    theirRoster,
    otherOwners,
    myIntel,
    theirIntel,
    myGrades,
    theirGrades,
    computedOW,
    computedPW,
    leagueIntel,
    partner,
    setPartner,
    myWindow,
    setMyWindow,
    theirWindow,
    setTheirWindow,
    mode,
    setMode,
    giveNames,
    setGiveNames,
    receiveNames,
    setReceiveNames,
    evaluation,
    setEvaluation,
    showModal,
    setShowModal,
    analyzing,
    suggestedPkgs,
    suggestLoading,
    suggestQuery,
    activeSellAsset,
    error,
    setError,
    chatCollapsed,
    setChatCollapsed,
    chatInjection,
    hasTray,
    showResults,
    toggleGive,
    toggleReceive,
    handleAnalyze,
    handleSellAsset,
    handleFindPosition,
    handleSuggestWithPartner,
    handleTargetPlayer,
    buildPackage,
    handleClear,
    fireSuggest,
  };
}
