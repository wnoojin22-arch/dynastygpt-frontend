"use client";

/**
 * F2 Pick Screen preview — mounts PickScreen with the Duke Nukem 1.12 mocks.
 * Route only exists for design review / screenshots. Dropped once F2 is
 * wired into the live phase machine in page.tsx.
 */

import React from "react";
import PickScreen from "../PickScreen";
import { mockPreDraft, mockSimSnapshot } from "../mocks";

export default function PickPreviewPage() {
  const currentSlot = "1.12";
  // Everything picked before Duke's 1.12 = chalk picks 1.01-1.11.
  const pickedNames = mockSimSnapshot.chalk
    .filter((c) => {
      const [round, inRound] = c.slot.split(".").map(Number);
      if (round > 1) return false;
      return inRound < 12;
    })
    .map((c) => c.prospect_name);

  return (
    <PickScreen
      preDraft={mockPreDraft}
      simSnapshot={mockSimSnapshot}
      currentSlot={currentSlot}
      pickedNames={pickedNames}
      onDraft={(name) => console.log("DRAFT:", name)}
      onTrade={(buyer) => console.log("TRADE:", buyer)}
    />
  );
}
