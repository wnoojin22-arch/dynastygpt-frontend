"use client";

import { useState, useCallback } from "react";
import { authHeaders } from "@/lib/api";

type Surface = "v2_suggestion" | "v1_evaluate";

interface Props {
  surface: Surface;
  suggestionId: string;
  onSubmit?: (payload: { thumbs: "up" | "down"; reason_code?: string }) => void;
}

interface ReasonOption {
  code: string;
  label: string;
}

const V2_REASONS: ReasonOption[] = [
  { code: "not_realistic", label: "Not realistic" },
  { code: "wrong_partner", label: "Wrong partner" },
  { code: "lateral", label: "Feels lateral" },
  { code: "value_off", label: "Value seems off" },
  { code: "cant_trade_player", label: "Can't trade that player" },
  { code: "other", label: "Other" },
];

const V1_REASONS: ReasonOption[] = [
  { code: "analysis_wrong", label: "Analysis is wrong" },
  { code: "cites_untrue", label: "Cites something untrue" },
  { code: "no_new_info", label: "No new information" },
  { code: "contradicts", label: "Contradicts itself" },
  { code: "not_specific", label: "Too generic" },
  { code: "other", label: "Other" },
];

export default function FeedbackThumbs({ surface, suggestionId, onSubmit }: Props) {
  const [state, setState] = useState<"idle" | "picking" | "submitting" | "done" | "error">("idle");
  const [thumbs, setThumbs] = useState<"up" | "down" | null>(null);
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const reasons = surface === "v2_suggestion" ? V2_REASONS : V1_REASONS;

  const post = useCallback(
    async (body: { thumbs: "up" | "down"; reason_code?: string; reason_text?: string }) => {
      setState("submitting");
      setErrorMsg("");
      try {
        const hdrs = await authHeaders();
        const res = await fetch("/api/suggestion-feedback", {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({ suggestion_id: suggestionId, ...body }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`${res.status}: ${txt.slice(0, 120)}`);
        }
        setState("done");
        onSubmit?.({ thumbs: body.thumbs, reason_code: body.reason_code });
      } catch (e) {
        setState("error");
        setErrorMsg(e instanceof Error ? e.message : "Failed");
      }
    },
    [suggestionId, onSubmit],
  );

  const handleUp = useCallback(() => {
    setThumbs("up");
    void post({ thumbs: "up" });
  }, [post]);

  const handleDown = useCallback(() => {
    setThumbs("down");
    setState("picking");
  }, []);

  const handleReason = useCallback(
    (code: string) => {
      setReasonCode(code);
      if (code !== "other") {
        void post({ thumbs: "down", reason_code: code });
      }
    },
    [post],
  );

  const handleSubmitOther = useCallback(() => {
    const trimmed = reasonText.trim();
    if (!trimmed) return;
    void post({ thumbs: "down", reason_code: "other", reason_text: trimmed });
  }, [post, reasonText]);

  const handleRetry = useCallback(() => {
    if (thumbs === "up") {
      void post({ thumbs: "up" });
    } else if (reasonCode === "other") {
      handleSubmitOther();
    } else if (reasonCode) {
      void post({ thumbs: "down", reason_code: reasonCode });
    }
  }, [thumbs, reasonCode, post, handleSubmitOther]);

  // ── DONE STATE ────────────────────────────────────────────────────────
  if (state === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-[#1a1e30] pt-3">
        <span className="text-xs text-[#9596a5]">
          {thumbs === "up" ? "Thanks!" : "Feedback recorded"}
        </span>
      </div>
    );
  }

  // ── ERROR STATE ───────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="mt-3 flex items-center gap-2 border-t border-[#1a1e30] pt-3">
        <span className="text-xs text-[#e47272]">Couldn&apos;t send. {errorMsg}</span>
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-[36px] rounded border border-[#d4a532]/40 bg-transparent px-3 text-xs font-medium text-[#d4a532] transition-colors hover:border-[#d4a532] hover:bg-[#d4a532]/10"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── DOWN PICKER STATE ─────────────────────────────────────────────────
  if (state === "picking" || (state === "submitting" && thumbs === "down")) {
    return (
      <div className="mt-3 border-t border-[#1a1e30] pt-3">
        <div className="mb-2 text-xs text-[#9596a5]">What was off?</div>
        <div className="flex flex-col gap-1">
          {reasons.map((r) => {
            const selected = reasonCode === r.code;
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => handleReason(r.code)}
                disabled={state === "submitting"}
                className={`flex min-h-[44px] items-center rounded border px-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-[#d4a532] bg-[#d4a532]/10 text-[#d4a532]"
                    : "border-[#1a1e30] bg-transparent text-[#eeeef2] hover:border-[#2a2f44]"
                } ${state === "submitting" ? "opacity-50" : ""}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {reasonCode === "other" && (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Tell us more..."
              maxLength={500}
              className="min-h-[80px] w-full rounded border border-[#1a1e30] bg-[#0a0d15] px-3 py-2 text-sm text-[#eeeef2] placeholder:text-[#9596a5] focus:border-[#d4a532] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSubmitOther}
              disabled={!reasonText.trim() || state === "submitting"}
              className="min-h-[44px] rounded bg-[#d4a532] px-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {state === "submitting" ? "Sending..." : "Submit"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── IDLE STATE — initial thumbs ─────────────────────────────────────
  const submitting = state === "submitting";
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-[#1a1e30] pt-3">
      <span className="text-xs text-[#9596a5]">Was this helpful?</span>
      <button
        type="button"
        onClick={handleUp}
        disabled={submitting}
        aria-label="Thumbs up"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-[#1a1e30] bg-transparent text-base text-[#eeeef2] transition-colors hover:border-[#7dd3a0] hover:text-[#7dd3a0] disabled:opacity-40"
      >
        {"\u{1F44D}"}
      </button>
      <button
        type="button"
        onClick={handleDown}
        disabled={submitting}
        aria-label="Thumbs down"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-[#1a1e30] bg-transparent text-base text-[#eeeef2] transition-colors hover:border-[#e47272] hover:text-[#e47272] disabled:opacity-40"
      >
        {"\u{1F44E}"}
      </button>
    </div>
  );
}
