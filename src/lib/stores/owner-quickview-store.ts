import { create } from "zustand";

function _trackOwnerQuickView(owner: string) {
  try {
    const page = typeof window !== "undefined" ? window.location.pathname : "";
    import("@/lib/api").then(({ authHeaders }) =>
      authHeaders().then((hdrs) =>
        fetch("/api/events", {
          method: "POST", headers: hdrs,
          body: JSON.stringify({ event_type: "owner_quickview_opened", page, metadata: { owner_name: owner } }),
        }).catch(() => {})
      )
    ).catch(() => {});
  } catch { /* silent */ }
}

interface OwnerQuickViewState {
  isOpen: boolean;
  ownerName: string;
  ownerUserId: string | null;
  open: (name: string, userId?: string | null) => void;
  close: () => void;
}

export const useOwnerQuickViewStore = create<OwnerQuickViewState>((set) => ({
  isOpen: false,
  ownerName: "",
  ownerUserId: null,
  open: (name: string, userId?: string | null) => {
    _trackOwnerQuickView(name);
    set({ isOpen: true, ownerName: name, ownerUserId: userId || null });
  },
  close: () => set({ isOpen: false, ownerName: "", ownerUserId: null }),
}));
