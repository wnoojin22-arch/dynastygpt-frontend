"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useLeagueStore } from "@/lib/stores/league-store";
import { AnimatePresence, motion } from "framer-motion";
import { authHeaders } from "@/lib/api";

const TYPES = [
  { key: "bug", emoji: "\u{1F41B}", label: "Bug" },
  { key: "feature", emoji: "\u{1F4A1}", label: "Feature" },
  { key: "awesome", emoji: "\u{1F525}", label: "Awesome" },
  { key: "off", emoji: "\u{1F914}", label: "Something off" },
] as const;

type FeedbackType = (typeof TYPES)[number]["key"];

interface ThreadMessage {
  id: string;
  sender_type: "user" | "admin";
  sender_name: string | null;
  message: string | null;
  feedback_type: string | null;
  image_urls: string[] | null;
  page_url: string | null;
  created_at: string;
}

interface ThreadData {
  thread: { id: string; status: string } | null;
  messages: ThreadMessage[];
  has_unread: boolean;
  unread_count: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function typeBadge(t: string | null) {
  const map: Record<string, { emoji: string; label: string }> = {
    bug: { emoji: "\u{1F41B}", label: "Bug" },
    feature: { emoji: "\u{1F4A1}", label: "Feature" },
    awesome: { emoji: "\u{1F525}", label: "Awesome" },
    off: { emoji: "\u{1F914}", label: "Off" },
    thumbs_up: { emoji: "\u{1F44D}", label: "Thumbs up" },
    thumbs_down: { emoji: "\u{1F44E}", label: "Thumbs down" },
    thumbs: { emoji: "\u{1F44D}", label: "Thumbs" },
  };
  return map[t || ""] || null;
}

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"feedback" | "messages">("feedback");
  const [type, setType] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [chatImages, setChatImages] = useState<{ url: string; name: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { currentLeagueId, currentOwner, currentOwnerId } = useLeagueStore();
  const pathname = usePathname();
  const isTradeBuilder = pathname.includes("/trades") || pathname.includes("/trade-analyzer") || pathname.includes("/war-room");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const check = () => setModalOpen(document.body.style.overflow === "hidden");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handler = () => { setOpen(true); setPulse(false); };
    window.addEventListener("open-feedback", handler);
    return () => window.removeEventListener("open-feedback", handler);
  }, []);

  useEffect(() => {
    const visits = parseInt(localStorage.getItem("dg_fb_visits") || "0", 10);
    if (visits >= 3) setPulse(false);
    localStorage.setItem("dg_fb_visits", String(visits + 1));
  }, []);

  // Poll for unread every 60s
  useEffect(() => {
    const poll = async () => {
      try {
        const hdrs = await authHeaders();
        const res = await fetch("/api/user/feedback/thread?summary=true", { headers: hdrs });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || (data.has_unread ? 1 : 0));
        }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load thread when messages tab opened
  const loadThread = useCallback(async () => {
    try {
      const hdrs = await authHeaders();
      const res = await fetch("/api/user/feedback/thread", { headers: hdrs });
      if (res.ok) {
        const data: ThreadData = await res.json();
        setThreadData(data);
        setUnreadCount(data.unread_count || (data.has_unread ? 1 : 0));
        // Mark as read
        fetch("/api/user/feedback/thread/read", { method: "POST", headers: hdrs }).catch(() => {});
        setUnreadCount(0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (open && tab === "messages") {
      loadThread();
    }
  }, [open, tab, loadThread]);

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (tab === "messages" && threadData?.messages.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [tab, threadData?.messages.length]);

  // Submit feedback (Feedback tab)
  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const mobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      const hdrs = await authHeaders();
      const res = await fetch("/api/user/feedback/thread/message", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          feedback_type: type || "general",
          message: message.trim(),
          image_urls: images.map((i) => i.url),
          page_url: window.location.href,
          device: mobile ? "mobile" : "desktop",
          browser: navigator.userAgent.slice(0, 200),
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
        }),
      });
      if (!res.ok) {
        setError(`Failed to send (${res.status}). Try again.`);
        return;
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setType(null);
        setMessage("");
        setImages([]);
        setError(null);
      }, 2000);
    } catch {
      setError("Failed to send. Check your connection and try again.");
    }
    finally { setSubmitting(false); }
  }, [type, message, images, user, currentLeagueId, currentOwner]);

  // Chat image upload handler
  const handleChatFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || chatImages.length >= 3) return;
    const remaining = 3 - chatImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!/\.(png|jpg|jpeg|webp|heic)$/i.test(file.name)) continue;
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        let finalUrl = dataUrl;
        if (dataUrl.length > 300_000 && typeof document !== "undefined") {
          try {
            const img = new Image();
            const loaded = new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
            img.src = dataUrl;
            await loaded;
            const canvas = document.createElement("canvas");
            const maxDim = 1200;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) { const scale = maxDim / Math.max(w, h); w = Math.round(w * scale); h = Math.round(h * scale); }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            finalUrl = canvas.toDataURL("image/jpeg", 0.7);
          } catch { /* use original */ }
        }
        setChatImages((prev) => [...prev, { url: finalUrl, name: file.name }]);
      } catch { /* skip */ }
    }
  }, [chatImages]);

  // Send reply in Messages tab
  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() && chatImages.length === 0) return;
    setSendingReply(true);
    try {
      const hdrs = await authHeaders();
      const res = await fetch("/api/user/feedback/thread/message", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          feedback_type: "general",
          message: replyText.trim() || null,
          image_urls: chatImages.map((i) => i.url),
          page_url: window.location.href,
          email: user?.primaryEmailAddress?.emailAddress,
          league_id: currentLeagueId,
          owner_name: currentOwner,
        }),
      });
      if (!res.ok) {
        setReplyError(`Failed to send (${res.status})`);
        return;
      }
      setReplyText("");
      setChatImages([]);
      setReplyError(null);
      loadThread();
    } catch {
      setReplyError("Failed to send. Check your connection.");
    }
    finally { setSendingReply(false); }
  }, [replyText, chatImages, user, currentLeagueId, currentOwner, loadThread]);

  // Image upload handler (identical to before)
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || images.length >= 3) return;
    setUploading(true);
    const remaining = 3 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!/\.(png|jpg|jpeg|webp|heic)$/i.test(file.name)) continue;
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        let finalUrl = dataUrl;
        if (dataUrl.length > 300_000 && typeof document !== "undefined") {
          try {
            const img = new Image();
            const loaded = new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });
            img.src = dataUrl;
            await loaded;
            const canvas = document.createElement("canvas");
            const maxDim = 1200;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              const scale = maxDim / Math.max(w, h);
              w = Math.round(w * scale);
              h = Math.round(h * scale);
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            finalUrl = canvas.toDataURL("image/jpeg", 0.7);
          } catch { /* use original */ }
        }
        setImages((prev) => [...prev, { url: finalUrl, name: file.name }]);
      } catch { /* skip */ }
    }
    setUploading(false);
  }, [images]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setPulse(false); }}
        className={`fixed z-[9998] cursor-pointer items-center gap-1.5 sm:bottom-5 sm:right-5 sm:rounded-[20px] sm:px-4 sm:py-2.5 top-2 right-3 sm:top-auto rounded-md px-2.5 py-1.5 bg-[#d4a532] text-[#06080d] font-mono font-extrabold tracking-wide shadow-[0_4px_20px_rgba(212,165,50,0.3)] ${pulse ? "animate-[feedbackPulse_2s_ease_infinite]" : ""} ${open || modalOpen || (isMobile && isTradeBuilder) ? "hidden" : "flex"}`}
      >
        <span className="text-[10px] sm:text-xs relative">
          {"\u{1F4AC}"}
          {unreadCount > 0 && (
            <span className="absolute -top-2.5 -right-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#e47272] text-white text-[10px] font-bold leading-none px-1 border-2 border-[#06080d] shadow-[0_2px_8px_rgba(228,114,114,0.5)] animate-bounce">{unreadCount}</span>
          )}
        </span>
        <span className="hidden sm:inline text-xs">Feedback</span>
      </button>

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
            className={`fixed z-[9999] overflow-hidden sm:bottom-0 sm:right-0 sm:rounded-t-xl top-0 left-0 right-0 sm:left-auto rounded-b-xl sm:rounded-b-none bg-[#10131d] border border-[#1a1e30] flex flex-col ${isMobile ? "shadow-[0_8px_40px_rgba(0,0,0,0.5)]" : "shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"}`}
            style={{ width: isMobile ? "100%" : 380, maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1e30]">
              <span className="font-mono text-[11px] font-extrabold tracking-widest text-[#d4a532]">SUPPORT</span>
              <button onClick={() => setOpen(false)} className="text-[#9596a5] hover:text-[#eeeef2] text-lg bg-transparent border-none cursor-pointer transition-colors">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#1a1e30]">
              <button
                onClick={() => setTab("feedback")}
                className={`flex-1 py-2.5 font-mono text-[10px] font-bold tracking-widest text-center transition-all border-b-2 ${tab === "feedback" ? "text-[#d4a532] border-[#d4a532]" : "text-[#9596a5] border-transparent hover:text-[#b0b2c8]"}`}
              >
                FEEDBACK
              </button>
              <button
                onClick={() => setTab("messages")}
                className={`flex-1 py-2.5 font-mono text-[10px] font-bold tracking-widest text-center transition-all border-b-2 relative ${tab === "messages" ? "text-[#d4a532] border-[#d4a532]" : "text-[#9596a5] border-transparent hover:text-[#b0b2c8]"}`}
              >
                MESSAGES
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[#e47272] text-white text-[9px] font-bold leading-none px-1 border border-[#10131d]">{unreadCount}</span>
                )}
              </button>
            </div>

            {/* ═══ FEEDBACK TAB ═══ */}
            {tab === "feedback" && (
              <div className="overflow-y-auto flex-1">
                {submitted ? (
                  <div className="py-10 px-5 text-center">
                    <div className="text-5xl animate-[checkPop_0.4s_ease_forwards]">{"\u2713"}</div>
                    <div className="font-sans text-[15px] font-semibold text-[#7dd3a0] mt-3">Thanks! We read every one of these.</div>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Type selector */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {TYPES.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setType(t.key)}
                          className={`py-2.5 px-1 rounded-lg border-[1.5px] text-center transition-all cursor-pointer ${type === t.key ? "border-[#d4a532] bg-[rgba(212,165,50,0.10)]" : "border-[#1a1e30] bg-transparent hover:border-[#2a2e40]"}`}
                        >
                          <div className="text-xl mb-0.5">{t.emoji}</div>
                          <div className={`font-mono text-[9px] font-bold ${type === t.key ? "text-[#d4a532]" : "text-[#9596a5]"}`}>{t.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* Image upload */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => images.length < 3 && fileRef.current?.click()}
                      className={`rounded-lg border-[1.5px] border-dashed border-[#1a1e30] bg-[#171b28] cursor-pointer mb-3 text-center transition-colors hover:border-[#2a2e40] ${images.length > 0 ? "p-2" : "py-4 px-4"}`}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/heic"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                      {images.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {images.map((img, i) => (
                            <div key={i} className="relative bg-[#10131d] rounded-md px-2 py-1 flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[#b0b2c8]">{img.name.slice(0, 20)}</span>
                              <button onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((_, j) => j !== i)); }} className="bg-transparent border-none text-[#e47272] cursor-pointer text-sm p-0">&times;</button>
                            </div>
                          ))}
                          {images.length < 3 && <span className="font-mono text-[9px] text-[#9596a5] px-2 py-1">+ add</span>}
                        </div>
                      ) : (
                        <>
                          <div className="font-sans text-[13px] text-[#9596a5]">{uploading ? "Uploading..." : "\u{1F4F7} Tap to add screenshot"}</div>
                          <div className="font-mono text-[9px] text-[#9596a5] mt-1">or drag & drop (max 3, 5MB each)</div>
                        </>
                      )}
                    </div>

                    {/* Message */}
                    <textarea
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); if (error) setError(null); }}
                      placeholder="What's on your mind?"
                      rows={4}
                      className="w-full p-3 rounded-lg bg-[#06080d] border border-[#1a1e30] text-[#eeeef2] font-sans text-sm resize-y outline-none mb-3 focus:border-[#d4a532] transition-colors"
                    />

                    {/* Error */}
                    {error && (
                      <div className="px-3 py-2 rounded-lg bg-[rgba(228,114,114,0.1)] border border-[rgba(228,114,114,0.3)] font-sans text-[12px] text-[#e47272] mb-2">
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={!message.trim() || submitting}
                      className={`w-full py-3 rounded-lg border-none font-mono text-[13px] font-extrabold tracking-wide transition-all ${!message.trim() ? "bg-[#171b28] text-[#9596a5] cursor-not-allowed" : "bg-[#d4a532] text-[#06080d] cursor-pointer hover:brightness-110"}`}
                    >
                      {submitting ? "SENDING..." : "SEND FEEDBACK"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ MESSAGES TAB ═══ */}
            {tab === "messages" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Message list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {!threadData?.messages.length ? (
                    <div className="text-center py-8">
                      <div className="font-sans text-sm text-[#9596a5]">No messages yet.</div>
                      <div className="font-mono text-[10px] text-[#9596a5] mt-1">Submit feedback to start a conversation.</div>
                    </div>
                  ) : (
                    threadData.messages.map((m) => {
                      const isUser = m.sender_type === "user";
                      const badge = typeBadge(m.feedback_type);
                      return (
                        <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${isUser ? "bg-[rgba(212,165,50,0.12)] border border-[rgba(212,165,50,0.22)]" : "bg-[#171b28] border border-[#1a1e30]"}`}>
                            {/* Sender + badge */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-mono text-[9px] font-bold tracking-wide ${isUser ? "text-[#d4a532]" : "text-[#6bb8e0]"}`}>
                                {isUser ? "You" : m.sender_name || "Admin"}
                              </span>
                              {badge && (
                                <span className="font-mono text-[8px] text-[#9596a5] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">
                                  {badge.emoji} {badge.label}
                                </span>
                              )}
                              <span className="font-mono text-[8px] text-[#9596a5] ml-auto">{timeAgo(m.created_at)}</span>
                            </div>
                            {/* Message text */}
                            {m.message && (
                              <p className="font-sans text-[13px] text-[#eeeef2] leading-relaxed m-0 whitespace-pre-wrap break-words">{m.message}</p>
                            )}
                            {/* Images */}
                            {m.image_urls && m.image_urls.length > 0 && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {m.image_urls.map((url, i) => (
                                  <img key={i} src={url} alt="" className="max-w-[120px] max-h-[80px] rounded object-cover border border-[#1a1e30]" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input with image upload */}
                <div className="border-t border-[#1a1e30]">
                  {replyError && (
                    <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-[rgba(228,114,114,0.1)] border border-[rgba(228,114,114,0.3)] font-sans text-[11px] text-[#e47272]">
                      {replyError}
                    </div>
                  )}
                  {/* Staged images */}
                  {chatImages.length > 0 && (
                    <div className="px-3 pt-2 flex gap-1.5 flex-wrap">
                      {chatImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img.url} alt="" className="w-12 h-12 rounded-md object-cover border border-[#1a1e30]" />
                          <button
                            onClick={() => setChatImages((prev) => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#e47272] text-white text-[10px] flex items-center justify-center border border-[#10131d] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-3 flex gap-2 items-center">
                    {/* Hidden file input */}
                    <input
                      ref={chatFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/heic"
                      multiple
                      className="hidden"
                      onChange={(e) => { handleChatFileSelect(e.target.files); if (chatFileRef.current) chatFileRef.current.value = ""; }}
                    />
                    {/* Image upload button */}
                    <button
                      onClick={() => chatImages.length < 3 && chatFileRef.current?.click()}
                      className={`p-2 rounded-lg transition-all ${chatImages.length >= 3 ? "text-[#9596a5]/30 cursor-not-allowed" : "text-[#9596a5] hover:text-[#d4a532] hover:bg-[rgba(212,165,50,0.08)] cursor-pointer"}`}
                      title="Attach screenshot"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 rounded-lg bg-[#06080d] border border-[#1a1e30] text-[#eeeef2] font-sans text-sm outline-none focus:border-[#d4a532] transition-colors"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={(!replyText.trim() && chatImages.length === 0) || sendingReply}
                      className={`px-4 py-2 rounded-lg font-mono text-[11px] font-bold tracking-wide transition-all ${!replyText.trim() && chatImages.length === 0 ? "bg-[#171b28] text-[#9596a5] cursor-not-allowed" : "bg-[#d4a532] text-[#06080d] cursor-pointer hover:brightness-110"}`}
                    >
                      {sendingReply ? "..." : "SEND"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
