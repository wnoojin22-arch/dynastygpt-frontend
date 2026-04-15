"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { authHeaders } from "@/lib/api";
// authHeaders still used by submit(). useUser + useLeagueStore used for payload.

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
  green: "#7dd3a0",
};
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const DISPLAY = "'Archivo Black', sans-serif";

const TOTAL_QUESTIONS = 5;
const LS_KEY = "beta_survey_completed";
const EVENT_THRESHOLD = 10;

interface SurveyAnswers {
  q1_comparison: string;
  q2_feature: string;
  q3_nps: number | null;
  q4_unique: string;
  q5_missing: string;
}

export default function SurveyModal() {
  const { user, isLoaded } = useUser();
  const { currentLeagueId, currentOwner } = useLeagueStore();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1); // 1-5 = questions, 6 = thank you
  const [answers, setAnswers] = useState<SurveyAnswers>({
    q1_comparison: "",
    q2_feature: "",
    q3_nps: null,
    q4_unique: "",
    q5_missing: "",
  });

  // Show survey for power users (10+ events) who haven't completed it yet.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LS_KEY)) return;

    (async () => {
      try {
        const hdrs = await authHeaders();
        const res = await fetch("/api/events/count", { headers: hdrs });
        if (res.ok) {
          const data = await res.json();
          if ((data.count || 0) >= EVENT_THRESHOLD) {
            setTimeout(() => setShow(true), 2000);
          }
        }
      } catch {
        // Silent — don't show survey if we can't check
      }
    })();
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, "true");
    setShow(false);
  }, []);

  const submit = useCallback(async () => {
    try {
      const hdrs = await authHeaders();
      await fetch("/api/user/feedback/thread/message", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
          page_url: window.location.href,
          feedback_type: "survey",
          message: JSON.stringify(answers),
          device: /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          browser: navigator.userAgent.slice(0, 200),
        }),
      });
    } catch {
      // Silent
    }
    setStep(6);
    setTimeout(dismiss, 2000);
  }, [answers, user, currentLeagueId, currentOwner, dismiss]);

  if (!show) return null;

  const pct = ((step > 5 ? 5 : step) / TOTAL_QUESTIONS) * 100;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 0,
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          maxHeight: "100dvh", overflowY: "auto",
          background: C.bg,
          border: `1.5px solid ${C.goldBorder}`,
          borderRadius: typeof window !== "undefined" && window.innerWidth < 640 ? 0 : 16,
          boxShadow: `0 0 0 1px ${C.goldBorder}, 0 24px 80px rgba(0,0,0,0.6)`,
          padding: "28px 24px",
        }}
      >
        {/* Progress */}
        {step <= 5 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: "0.06em" }}>
                Question {step} of {TOTAL_QUESTIONS}
              </span>
            </div>
            <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: C.gold, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Header — only on questions, not thank you */}
        {step <= 5 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: SANS, fontSize: 15, color: C.primary, lineHeight: 1.5, fontWeight: 500 }}>
              Thank you for being an early beta tester. Please take this short survey that will help shape the product.
            </p>
          </div>
        )}

        {/* Q1 */}
        {step === 1 && (
          <QuestionBlock
            label="Compared to other dynasty tools you've used, DynastyGPT is:"
            options={["Much better", "Better", "About the same", "Worse", "Haven't used others"]}
            selected={answers.q1_comparison}
            onSelect={(v) => setAnswers((a) => ({ ...a, q1_comparison: v }))}
            onNext={() => setStep(2)}
            canNext={!!answers.q1_comparison}
          />
        )}

        {/* Q2 */}
        {step === 2 && (
          <QuestionBlock
            label="The feature I've gotten the most value from:"
            options={["Trade Grades", "AI Trade Suggestions", "Owner Intel / Scouting", "Draft Room", "Power Rankings", "League Articles"]}
            selected={answers.q2_feature}
            onSelect={(v) => setAnswers((a) => ({ ...a, q2_feature: v }))}
            onNext={() => setStep(3)}
            canNext={!!answers.q2_feature}
          />
        )}

        {/* Q3 — NPS slider */}
        {step === 3 && (
          <div>
            <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 16 }}>
              How likely are you to recommend DynastyGPT to a dynasty friend?
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers((a) => ({ ...a, q3_nps: i }))}
                  style={{
                    width: 36, height: 44, borderRadius: 6, border: "none",
                    fontFamily: MONO, fontSize: 14, fontWeight: 700, cursor: "pointer",
                    background: answers.q3_nps === i ? C.gold : C.card,
                    color: answers.q3_nps === i ? C.bg : C.dim,
                    transition: "all 0.15s",
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Not at all</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>Definitely</span>
            </div>
            <NextButton onClick={() => setStep(4)} disabled={answers.q3_nps === null} />
          </div>
        )}

        {/* Q4 — Free text */}
        {step === 4 && (
          <div>
            <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 4 }}>
              What's one thing DynastyGPT does that no other dynasty tool does?
            </p>
            <p style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 12 }}>Optional</p>
            <textarea
              value={answers.q4_unique}
              onChange={(e) => setAnswers((a) => ({ ...a, q4_unique: e.target.value }))}
              placeholder="e.g. Shows me exactly how my leaguemates trade..."
              style={{
                width: "100%", minHeight: 80, padding: 12, borderRadius: 8,
                background: C.card, border: `1px solid ${C.border}`, color: C.primary,
                fontFamily: SANS, fontSize: 16, resize: "vertical",
                outline: "none",
              }}
            />
            <NextButton onClick={() => setStep(5)} disabled={false} />
          </div>
        )}

        {/* Q5 — Free text + submit */}
        {step === 5 && (
          <div>
            <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 4 }}>
              What's the one thing missing that would make this a must-have for your league?
            </p>
            <p style={{ fontFamily: SANS, fontSize: 11, color: C.dim, marginBottom: 12 }}>Optional</p>
            <textarea
              value={answers.q5_missing}
              onChange={(e) => setAnswers((a) => ({ ...a, q5_missing: e.target.value }))}
              placeholder="e.g. I wish it could..."
              style={{
                width: "100%", minHeight: 80, padding: 12, borderRadius: 8,
                background: C.card, border: `1px solid ${C.border}`, color: C.primary,
                fontFamily: SANS, fontSize: 16, resize: "vertical",
                outline: "none",
              }}
            />
            <button
              onClick={submit}
              style={{
                width: "100%", padding: "14px 0", marginTop: 16, borderRadius: 8,
                background: C.gold, border: "none", cursor: "pointer",
                fontFamily: DISPLAY, fontSize: 14, letterSpacing: "0.08em",
                color: C.bg, fontWeight: 900,
              }}
            >
              SUBMIT FEEDBACK
            </button>
          </div>
        )}

        {/* Thank you */}
        {step === 6 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
            <p style={{ fontFamily: DISPLAY, fontSize: 18, color: C.gold, marginBottom: 8 }}>Thank you!</p>
            <p style={{ fontFamily: SANS, fontSize: 14, color: C.secondary }}>
              You're helping build something special.
            </p>
          </div>
        )}

        {/* Skip link — only on questions */}
        {step <= 5 && (
          <button
            onClick={dismiss}
            style={{
              display: "block", width: "100%", marginTop: 20, padding: 8,
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: SANS, fontSize: 12, color: C.dim,
              textAlign: "center",
            }}
          >
            Skip survey
          </button>
        )}
      </div>
    </div>
  );
}


/* ── Reusable sub-components ── */

function QuestionBlock({
  label,
  options,
  selected,
  onSelect,
  onNext,
  canNext,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <div>
      <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 14 }}>
        {label}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            style={{
              padding: "12px 16px", borderRadius: 8, cursor: "pointer",
              border: `1.5px solid ${selected === opt ? C.gold : C.border}`,
              background: selected === opt ? C.goldDim : C.card,
              color: selected === opt ? C.goldBright : C.secondary,
              fontFamily: SANS, fontSize: 14, fontWeight: 500,
              textAlign: "left", transition: "all 0.15s",
              minHeight: 48,
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <NextButton onClick={onNext} disabled={!canNext} />
    </div>
  );
}


function NextButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "12px 0", marginTop: 16, borderRadius: 8,
        background: disabled ? C.border : C.gold,
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: DISPLAY, fontSize: 13, letterSpacing: "0.08em",
        color: disabled ? C.dim : C.bg, fontWeight: 900,
        transition: "all 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      NEXT
    </button>
  );
}
