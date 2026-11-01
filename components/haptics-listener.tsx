"use client";

import { useEffect } from "react";
import { handleHapticClick } from "@/lib/haptics";

// Memberi getaran halus setiap kali tombol ditekan di perangkat sentuh.
export function HapticsListener() {
  useEffect(() => {
    document.addEventListener("click", handleHapticClick, { capture: true });
    return () => document.removeEventListener("click", handleHapticClick, { capture: true });
  }, []);

  return null;
}
