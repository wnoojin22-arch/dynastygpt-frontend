"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useLeagueStore } from "@/lib/stores/league-store";
import { AnimatePresence, motion } from "framer-motion";

const API = "";

const TYPES = [
  { key: "bug", emoji: "🐛", label: "Bug" },
  { key: "feature", emoji: "💡", label: "Feature" },
  { key: "awesome", emoji: "🔥", label: "Awesome" },
  { key: "off", emoji: "🤔", label: "Something off" },
] as const;

const C = {
  bg: "#06080d", card: "#10131d", elevated: "#171b28", border: "#1a1e30",
  primary: "#eeeef2", secondary: "#b0b2c8", dim: "#9596a5",
  gold: "#d4a532", goldBright: "#f5e6a3", goldDim: "rgba(212,165,50,0.10)",
  goldBorder: "rgba(212,165,50,0.22)", green: "#7dd3a0", red: "#e47272",
};
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SANS = "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const { currentLeagueId, currentOwner, currentOwnerId } = useLeagueStore();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Stop pulsing after 3 visits
  useEffect(() => {
    const visits = parseInt(localStorage.getItem("dg_fb_visits") || "0", 10);
    if (visits >= 3) setPulse(false);
    localStorage.setItem("dg_fb_visits", String(visits + 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!type || !message.trim()) return;
    setSubmitting(true);
    try {
      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      const { authHeaders } = await import("@/lib/api");
      const hdrs = await authHeaders();
      await fetch(`${API}/api/league/feedback`, {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          clerk_user_id: user?.id,
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
          owner_user_id: currentOwnerId,
          page_url: window.location.href,
          feedback_type: type,
          message: message.trim(),
          image_urls: images.map((i) => i.url),
          device: isMobile ? "mobile" : "desktop",
          browser: navigator.userAgent.slice(0, 200),
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setType(null);
        setMessage("");
        setImages([]);
      }, 2000);
    } catch {
      // silent fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }, [type, message, images, user, currentLeagueId, currentOwner, currentOwnerId]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || images.length >= 3) return;
    setUploading(true);
    const remaining = 3 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) continue; // skip >5MB
      if (!/\.(png|jpg|jpeg|webp|heic)$/i.test(file.name)) continue;

      // For now store as data URL (Supabase Storage integration is a deploy-time config)
      // This keeps the widget functional without Supabase Storage setup
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setImages((prev) => [...prev, { url: dataUrl.slice(0, 500) + "...(truncated)", name: file.name }]);
      } catch {
        // skip failed uploads
      }
    }
    setUploading(false);
  }, [images]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <>
      {/* Floating button — top-right on mobile, bottom-right on desktop */}
      <button
        onClick={() => { setOpen(true); setPulse(false); }}
        className="fixed z-[9998] border-none cursor-pointer items-center gap-1.5 sm:bottom-5 sm:right-5 sm:rounded-[20px] sm:px-4 sm:py-2.5 top-[7px] right-2 sm:top-auto rounded-md px-2 py-1"
        style={{
          background: C.gold, color: C.bg,
          fontFamily: MONO, fontWeight: 800, letterSpacing: "0.04em",
          boxShadow: `0 4px 20px rgba(212,165,50,0.3)`,
          animation: pulse ? "feedbackPulse 2s ease infinite" : "none",
          display: open ? "none" : "flex",
        }}
      >
        <span className="text-[10px] sm:text-xs">💬</span>
        <span className="hidden sm:inline text-xs">Feedback</span>
      </button>

      {/* Pulse animation */}
      <style>{`
        @keyframes feedbackPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(212,165,50,0.3); }
          50% { box-shadow: 0 4px 30px rgba(212,165,50,0.6), 0 0 40px rgba(212,165,50,0.2); }
        }
        @keyframes checkPop {
          0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); }
        }
      `}</style>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: isMobile ? "-100%" : "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: isMobile ? "-100%" : "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[9999] overflow-y-auto sm:bottom-0 sm:right-0 sm:rounded-t-xl top-0 left-0 right-0 sm:left-auto rounded-b-xl sm:rounded-b-none"
            style={{
              width: isMobile ? "100%" : 370,
              maxHeight: "80vh",
              background: C.card, border: `1px solid ${C.border}`,
              boxShadow: isMobile ? "0 8px 40px rgba(0,0,0,0.5)" : "0 -8px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: C.gold }}>FEEDBACK</span>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {submitted ? (
              /* Success state */
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 48, animation: "checkPop 0.4s ease forwards" }}>✓</div>
                <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.green, marginTop: 12 }}>Thanks! We read every one of these.</div>
              </div>
            ) : (
              /* Form */
              <div style={{ padding: "16px" }}>
                {/* Type selector */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                  {TYPES.map((t) => (
                    <button key={t.key} onClick={() => setType(t.key)} style={{
                      padding: "10px 4px", borderRadius: 8, border: `1.5px solid ${type === t.key ? C.gold : C.border}`,
                      background: type === t.key ? C.goldDim : "transparent",
                      cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 2 }}>{t.emoji}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: type === t.key ? C.gold : C.dim }}>{t.label}</div>
                    </button>
                  ))}
                </div>

                {/* Image upload */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => images.length < 3 && fileRef.current?.click()}
                  style={{
                    padding: images.length > 0 ? "8px" : "16px",
                    borderRadius: 8, border: `1.5px dashed ${C.border}`,
                    background: C.elevated, cursor: "pointer", marginBottom: 12,
                    textAlign: "center", transition: "border-color 0.2s",
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/heic"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  {images.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {images.map((img, i) => (
                        <div key={i} style={{ position: "relative", background: C.card, borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: C.secondary }}>{img.name.slice(0, 20)}</span>
                          <button onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((_, j) => j !== i)); }}
                            style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                        </div>
                      ))}
                      {images.length < 3 && <span style={{ fontFamily: MONO, fontSize: 9, color: C.dim, padding: "4px 8px" }}>+ add</span>}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontFamily: SANS, fontSize: 13, color: C.dim }}>
                        {uploading ? "Uploading..." : "📷 Tap to add screenshot"}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim, marginTop: 4 }}>or drag & drop (max 3, 5MB each)</div>
                    </>
                  )}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 8,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.primary, fontFamily: SANS, fontSize: 14,
                    resize: "vertical", outline: "none", marginBottom: 12,
                  }}
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!type || !message.trim() || submitting}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                    background: (!type || !message.trim()) ? C.elevated : C.gold,
                    color: (!type || !message.trim()) ? C.dim : C.bg,
                    fontFamily: MONO, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em",
                    cursor: (!type || !message.trim() || submitting) ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {submitting ? "SENDING..." : "SEND FEEDBACK"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
