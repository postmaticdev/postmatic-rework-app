// Event global untuk menampilkan layar loading saat keluar menuju halaman auth.
// Dipicu dari luar React (config/api.ts) maupun dari tombol logout.
export const LOGOUT_OVERLAY_EVENT = "postmatic:logout-overlay";

export function showLogoutOverlay() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOGOUT_OVERLAY_EVENT));
}
