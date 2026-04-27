"use client";

/**
 * BetaFeedbackModal — beta survey shown on league home navigation.
 * One question at a time. Eligibility decided server-side at
 * /api/beta/feedback/should-show. Backdrop click is inert.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { authHeaders } from "@/lib/api";

const C = {
  bg: "#06080d",
  card: "#10131d",
  border: "#1a1e30",
  gold: "#d4a532",
  goldBright: "#f5e6a3",
  goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)",
  primary: "#eeeef2",
  secondary: "#b0b2c8",
  dim: "#9596a5",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const DISPLAY = "'Archivo Black', sans-serif";

const Q1_OPTIONS = [
  "AI Chat Advisor",
  "Trade Suggestions & Builder",
  "Trade Grading & Hindsight",
  "Owner Scouting Reports",
  "Power Rankings",
  "Franchise Health",
  "Real-Time Player Markets",
  "Other",
];

const Q2_OPTIONS = [
  "Yes, big improvements",
  "Yes, some improvements",
  "Haven't really noticed",
  "Things feel worse",
];

const Q3_OPTIONS = [
  "Improving features I already use",
  "Smarter AI Chat Advisor",
  "Draft tools (mock draft sim, draft profiles, hit rate)",
  "AI-generated articles & content",
  "New scouting/analytics features",
  "Fixing bugs and polish",
  "Mobile experience",
  "Other",
];

const Q4_OPTIONS = [
  "Great — I'd actually make these trades",
  "Good — useful as conversation starters with leaguemates",
  "Hit or miss — some are solid, some are off",
  "Mostly a waste of time",
];

const TOTAL_STEPS = 6;
const Q6_MAX = 500;

interface Answers {
  q1_favorite: string;
  q1_other: string;
  q2_improvement: string;
  q3_focus: string;
  q3_other: string;
  q4_ai_quality: string;
  q5_nps: number | null;
  q6_open_feedback: string;
}

const EMPTY: Answers = {
  q1_favorite: "",
  q1_other: "",
  q2_improvement: "",
  q3_focus: "",
  q3_other: "",
  q4_ai_quality: "",
  q5_nps: null,
  q6_open_feedback: "",
};

export default function BetaFeedbackModal() {
  useUser();
  const { currentLeagueId, currentOwner, currentOwnerId } = useLeagueStore();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [a, setA] = useState<Answers>(EMPTY);

  // Eligibility check — 800ms after mount, then call backend.
  useEffect(() => {
    if (!currentLeagueId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const hdrs = await authHeaders();
        const params = new URLSearchParams();
        if (currentLeagueId) params.set("league_id", currentLeagueId);
        if (currentOwnerId) params.set("sleeper_user_id", currentOwnerId);
        const res = await fetch(
          `/api/beta/feedback/should-show?${params}`,
          { headers: hdrs },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.show) setShow(true);
      } catch {
        // Silent
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentLeagueId, currentOwnerId]);

  const skip = useCallback(async () => {
    setShow(false);
    try {
      const hdrs = await authHeaders();
      await fetch("/api/beta/feedback/dismiss", { method: "POST", headers: hdrs });
    } catch {
      // Silent
    }
  }, []);

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const hdrs = await authHeaders();
      await fetch("/api/beta/feedback", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          league_id: currentLeagueId,
          owner_name: currentOwner,
          sleeper_user_id: currentOwnerId,
          q1_favorite: a.q1_favorite,
          q1_other: a.q1_favorite === "Other" ? a.q1_other : null,
          q2_improvement: a.q2_improvement,
          q3_focus: a.q3_focus,
          q3_other: a.q3_focus === "Other" ? a.q3_other : null,
          q4_ai_quality: a.q4_ai_quality,
          q5_nps: a.q5_nps,
          q6_open_feedback: a.q6_open_feedback || null,
        }),
      });
    } catch {
      // Silent — still show thank-you
    }
    setDone(true);
    setTimeout(() => setShow(false), 1500);
  }, [a, currentLeagueId, currentOwner, currentOwnerId, submitting]);

  if (!show) return null;

  const q1Valid = !!a.q1_favorite && (a.q1_favorite !== "Other" || a.q1_other.trim().length > 0);
  const q2Valid = !!a.q2_improvement;
  const q3Valid = !!a.q3_focus && (a.q3_focus !== "Other" || a.q3_other.trim().length > 0);
  const q4Valid = !!a.q4_ai_quality;
  const q5Valid = a.q5_nps !== null;

  const stepValid =
    step === 1 ? q1Valid :
    step === 2 ? q2Valid :
    step === 3 ? q3Valid :
    step === 4 ? q4Valid :
    step === 5 ? q5Valid :
    true; // Q6 optional

  const allRequiredAnswered = q1Valid && q2Valid && q3Valid && q4Valid && q5Valid;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "100dvh",
          overflowY: "auto",
          background: C.bg,
          border: `1.5px solid ${C.goldBorder}`,
          borderRadius: typeof window !== "undefined" && window.innerWidth < 640 ? 0 : 16,
          boxShadow: `0 0 0 1px ${C.goldBorder}, 0 24px 80px rgba(0,0,0,0.6)`,
          padding: "28px 24px",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontFamily: DISPLAY, fontSize: 18, color: C.gold, marginBottom: 8 }}>
              Thanks.
            </p>
            <p style={{ fontFamily: SANS, fontSize: 14, color: C.secondary }}>
              We read every response.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 22,
                  color: C.goldBright,
                  letterSpacing: "0.02em",
                  marginBottom: 8,
                }}
              >
                Got 60 seconds?
              </p>
              <p style={{ fontFamily: SANS, fontSize: 13, color: C.secondary, lineHeight: 1.5 }}>
                Your feedback shapes what we build next. Six quick questions, then back to your league.
              </p>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
                  Question {step} of {TOTAL_STEPS}
                </span>
              </div>
              <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(step / TOTAL_STEPS) * 100}%`,
                    background: C.gold,
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>

            {/* Q1 */}
            {step === 1 && (
              <Question label="What's your favorite thing about DynastyGPT?">
                <Options
                  options={Q1_OPTIONS}
                  selected={a.q1_favorite}
                  onSelect={(v) => setA({ ...a, q1_favorite: v })}
                />
                {a.q1_favorite === "Other" && (
                  <TextInput
                    value={a.q1_other}
                    onChange={(v) => setA({ ...a, q1_other: v })}
                    placeholder="Tell us…"
                  />
                )}
              </Question>
            )}

            {/* Q2 */}
            {step === 2 && (
              <Question label="Have you noticed improvements over the last week?">
                <Options
                  options={Q2_OPTIONS}
                  selected={a.q2_improvement}
                  onSelect={(v) => setA({ ...a, q2_improvement: v })}
                />
              </Question>
            )}

            {/* Q3 */}
            {step === 3 && (
              <Question label="What should we focus on next?">
                <Options
                  options={Q3_OPTIONS}
                  selected={a.q3_focus}
                  onSelect={(v) => setA({ ...a, q3_focus: v })}
                />
                {a.q3_focus === "Other" && (
                  <TextInput
                    value={a.q3_other}
                    onChange={(v) => setA({ ...a, q3_other: v })}
                    placeholder="Tell us…"
                  />
                )}
              </Question>
            )}

            {/* Q4 */}
            {step === 4 && (
              <Question label="How are the AI trade suggestions?">
                <Options
                  options={Q4_OPTIONS}
                  selected={a.q4_ai_quality}
                  onSelect={(v) => setA({ ...a, q4_ai_quality: v })}
                />
              </Question>
            )}

            {/* Q5 — NPS */}
            {step === 5 && (
              <Question label="How likely are you to recommend DynastyGPT to another dynasty player?">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 4 }}>
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setA({ ...a, q5_nps: i })}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 6,
                        border: "none",
                        fontFamily: MONO,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: a.q5_nps === i ? C.gold : C.card,
                        color: a.q5_nps === i ? C.bg : C.dim,
                        transition: "all 0.15s",
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                    0 — Not at all likely
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                    10 — Extremely likely
                  </span>
                </div>
              </Question>
            )}

            {/* Q6 */}
            {step === 6 && (
              <Question label="Anything else? Feature requests, feedback, things that are broken — we read every response.">
                <textarea
                  value={a.q6_open_feedback}
                  onChange={(e) =>
                    setA({ ...a, q6_open_feedback: e.target.value.slice(0, Q6_MAX) })
                  }
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    minHeight: 110,
                    padding: 12,
                    borderRadius: 8,
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    color: C.primary,
                    fontFamily: SANS,
                    fontSize: 14,
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <div style={{ textAlign: "right", marginTop: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>
                    {a.q6_open_feedback.length} / {Q6_MAX}
                  </span>
                </div>
              </Question>
            )}

            {/* Footer — Submit on final step, Next otherwise. Skip always available. */}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!stepValid}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  marginTop: 8,
                  borderRadius: 8,
                  background: stepValid ? C.gold : C.border,
                  border: "none",
                  cursor: stepValid ? "pointer" : "not-allowed",
                  fontFamily: DISPLAY,
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: stepValid ? C.bg : C.dim,
                  fontWeight: 900,
                  opacity: stepValid ? 1 : 0.6,
                  transition: "all 0.15s",
                }}
              >
                NEXT
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!allRequiredAnswered || submitting}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  marginTop: 8,
                  borderRadius: 8,
                  background: allRequiredAnswered && !submitting ? C.gold : C.border,
                  border: "none",
                  cursor: allRequiredAnswered && !submitting ? "pointer" : "not-allowed",
                  fontFamily: DISPLAY,
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  color: allRequiredAnswered && !submitting ? C.bg : C.dim,
                  fontWeight: 900,
                  opacity: allRequiredAnswered && !submitting ? 1 : 0.6,
                  transition: "all 0.15s",
                }}
              >
                {submitting ? "SUBMITTING…" : "SUBMIT"}
              </button>
            )}

            <button
              onClick={skip}
              style={{
                display: "block",
                width: "100%",
                marginTop: 12,
                padding: 8,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: SANS,
                fontSize: 13,
                color: C.dim,
                textAlign: "center",
              }}
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: C.primary,
          marginBottom: 14,
          lineHeight: 1.45,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Options({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            cursor: "pointer",
            border: `1.5px solid ${selected === opt ? C.gold : C.border}`,
            background: selected === opt ? C.goldDim : C.card,
            color: selected === opt ? C.goldBright : C.secondary,
            fontFamily: SANS,
            fontSize: 13,
            fontWeight: 500,
            textAlign: "left",
            transition: "all 0.15s",
            minHeight: 44,
            lineHeight: 1.35,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        background: C.card,
        border: `1px solid ${C.border}`,
        color: C.primary,
        fontFamily: SANS,
        fontSize: 14,
        outline: "none",
      }}
    />
  );
}
