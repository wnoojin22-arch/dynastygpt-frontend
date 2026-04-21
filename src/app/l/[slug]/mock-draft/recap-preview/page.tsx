"use client";

/**
 * F3 Recap preview — mounts DraftRecap + RecapShareCard with three mock
 * scenarios so every hero variant can be screenshot-reviewed.
 *
 * Query params:
 *   ?variant=steal|grade|identity  (default: steal)
 *   ?view=recap|card               (default: recap)
 *
 * Variant construction strategy:
 *   steal    — Duke takes Love 1.12 (rank 1 → delta 11). STEAL hero wins.
 *   grade    — Bespoke owner, CRIT/WEAK starting grades lifted to STRONG/ELITE,
 *              all picks FAIR (delta < 3). Score → A- (86). GRADE hero wins.
 *   identity — Duke with all-FAIR picks, small grade upgrades (score 74 B).
 *              Neither steal nor grade threshold met → IDENTITY hero.
 *
 * Route only exists for design review; deleted once F3 is wired into the real
 * post-draft flow in page.tsx.
 */

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DraftRecap from "../DraftRecap";
import RecapShareCard from "../RecapShareCard";
import {
  mockConsensusBoard,
  mockPreDraft,
  mockTradeFlags,
} from "../mocks";
import type {
  DraftIdentity,
  PostDraftPositionalGrades,
  PreDraftResponse,
} from "../contracts";

type Variant = "steal" | "grade" | "identity";
type View = "recap" | "card";

interface Scenario {
  preDraft: PreDraftResponse;
  userPicks: Record<string, string>;
  postDraftGrades: PostDraftPositionalGrades | null;
  identity: DraftIdentity | null;
  avatarId: string | null;
}

// ── Variant A — STEAL hero ──────────────────────────────────────────────
// Duke picks Love at 1.12; delta=11 past ADP. Triggers P1 hero.
const stealScenario: Scenario = {
  preDraft: mockPreDraft,
  userPicks: {
    "1.12": "Jeremiyah Love",
    "2.03": "Mike Washington Jr.",
    "2.05": "Elijah Sarratt",
    "3.09": "Adam Randall",
    "3.12": "Justin Joly",
  },
  postDraftGrades: {
    QB: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
    RB: { before: "ELITE", after: "ELITE", delta: 0 },
    WR: { before: "ELITE", after: "ELITE", delta: 0 },
    TE: { before: "AVERAGE", after: "STRONG", delta: 1 },
  },
  identity: "PIPELINE BUILDER",
  avatarId: "e4b2c8a6d13f5e9c",
};

// ── Variant B — GRADE hero ──────────────────────────────────────────────
// Bespoke owner with CRIT/WEAK starting grades. All picks FAIR (delta < 3)
// so no pick triggers steal hero. Heavy position upgrades push score into
// the A- band.
//   valueSum = 0 (all FAIR)
//   gradeBonus = QB CRIT→STRONG(9) + RB WEAK→STRONG(5) + WR AVG→STRONG(2) + TE 0 = 16
//   score = 70 + 0 + 16 = 86 → A- ✓
const gradePreDraft: PreDraftResponse = {
  ...mockPreDraft,
  owner: "Barrens McGee",
  league_name: "Big Jer Dynasty",
  positional_grades: { QB: "CRITICAL", RB: "WEAK", WR: "AVERAGE", TE: "AVERAGE" },
  needs: ["QB", "RB"],
};

const gradeScenario: Scenario = {
  preDraft: gradePreDraft,
  userPicks: {
    "1.12": "Eli Stowers",             // pick 12, rank 12 → delta 0 FAIR
    "2.03": "Mike Washington Jr.",     // pick 15, rank 14 → delta 1 FAIR
    "2.05": "Emmett Johnson",          // pick 17, rank 17 → delta 0 FAIR
    "3.09": "Adam Randall",            // not in board → skipped in calcs
    "3.12": "Justin Joly",             // not in board → skipped in calcs
  },
  postDraftGrades: {
    QB: { before: "CRITICAL", after: "STRONG", delta: 3 },
    RB: { before: "WEAK", after: "STRONG", delta: 2 },
    WR: { before: "AVERAGE", after: "STRONG", delta: 1 },
    TE: { before: "AVERAGE", after: "AVERAGE", delta: 0 },
  },
  identity: "DEVELOPER",
  avatarId: "c9d7e5b3a16f48e2",
};

// ── Variant C — IDENTITY hero ───────────────────────────────────────────
// Duke with all-FAIR picks, smallest steal delta 1, grade score 74 (B).
// Neither P1 nor P2 threshold satisfied → falls to P3 identity hero.
const identityScenario: Scenario = {
  preDraft: mockPreDraft,
  userPicks: {
    "1.12": "Ty Simpson",              // pick 12, rank 11 → delta 1 FAIR
    "2.03": "Mike Washington Jr.",     // pick 15, rank 14 → delta 1 FAIR
    "2.05": "Nicholas Singleton",      // pick 17, rank 16 → delta 1 FAIR
    "3.09": "Adam Randall",            // skipped
    "3.12": "Justin Joly",             // skipped
  },
  postDraftGrades: {
    QB: { before: "AVERAGE", after: "STRONG", delta: 1 },
    RB: { before: "ELITE", after: "ELITE", delta: 0 },
    WR: { before: "ELITE", after: "ELITE", delta: 0 },
    TE: { before: "AVERAGE", after: "STRONG", delta: 1 },
  },
  identity: "PIPELINE BUILDER",
  avatarId: "e4b2c8a6d13f5e9c",
};

const SCENARIOS: Record<Variant, Scenario> = {
  steal: stealScenario,
  grade: gradeScenario,
  identity: identityScenario,
};

export default function RecapPreviewPage() {
  return (
    <Suspense fallback={null}>
      <RecapPreviewInner />
    </Suspense>
  );
}

function RecapPreviewInner() {
  const params = useSearchParams();
  const variant = ((params.get("variant") as Variant) ?? "steal") as Variant;
  const view = ((params.get("view") as View) ?? "recap") as View;

  const scenario = SCENARIOS[variant] ?? stealScenario;

  if (view === "card") {
    // Fixed-positioned overlay so the league app shell (sidebar + header)
    // doesn't crop the 1080×1080 canvas during screenshot capture.
    // The <style> block hides the sidebar/feedback widget for a clean capture —
    // none of this code ships; route is design-review only.
    return (
      <>
        <style>{`
          body > * { visibility: hidden !important; }
          #share-card-root, #share-card-root * { visibility: visible !important; }
        `}</style>
        <div
          id="share-card-root"
          style={{
            position: "fixed", inset: 0, zIndex: 2147483647,
            width: "100vw", height: "100vh", background: "#06080d",
          }}
        >
          <div style={{ width: 1080, height: 1080, position: "absolute", top: 0, left: 0 }}>
            <RecapShareCard
              preDraft={scenario.preDraft}
              consensusBoard={mockConsensusBoard}
              userPicks={scenario.userPicks}
              avatarId={scenario.avatarId}
              identity={scenario.identity}
              postDraftGrades={scenario.postDraftGrades}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <DraftRecap
      preDraft={scenario.preDraft}
      consensusBoard={mockConsensusBoard}
      userPicks={scenario.userPicks}
      tradeFlags={mockTradeFlags}
      postDraftGrades={scenario.postDraftGrades}
      missedOpportunities={null}
      identity={scenario.identity}
      avatarId={scenario.avatarId}
      alternateSimulateAvailable={false}
      simulationsRun={100}
    />
  );
}

