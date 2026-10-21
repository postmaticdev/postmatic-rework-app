/*
  Getaran halus (haptic feedback) untuk tampilan mobile.

  - Android (Chrome dll): memakai Vibration API dengan pola pendek di bawah.
  - iOS Safari tidak punya Vibration API. Sejak iOS 18 Safari memberi satu
    "tick" haptic saat <input type="checkbox" switch> berganti nilai, jadi
    dipakai sebagai fallback. Trik ini hanya bekerja di dalam aksi pengguna
    (tap), sehingga getaran setelah proses async di iOS tidak selalu terasa.
  - Desktop / perangkat tanpa layar sentuh diabaikan.
*/

export type HapticKind = "tap" | "success" | "warning" | "error" | "notification";

// Durasi dalam milidetik; sengaja pendek agar terasa halus, bukan "buzz".
const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  success: [10, 60, 14],
  warning: [16, 80, 16],
  error: [20, 60, 20],
  notification: [12, 90, 12],
};

const MIN_TAP_INTERVAL_MS = 60;

let lastTapAt = 0;
let iosSwitchLabel: HTMLLabelElement | null = null;

function isTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function iosTick() {
  if (!iosSwitchLabel) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.dataset.haptic = "off";
    label.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
  }

  // Klik label memindahkan fokus ke checkbox; kembalikan agar keyboard tidak tertutup.
  const active = document.activeElement;
  iosSwitchLabel.click();
  if (active instanceof HTMLElement && active !== document.activeElement) {
    active.focus({ preventScroll: true });
  }
}

export function haptic(kind: HapticKind = "tap") {
  if (!isTouchDevice()) return;

  if (kind === "tap") {
    const now = Date.now();
    if (now - lastTapAt < MIN_TAP_INTERVAL_MS) return;
    lastTapAt = now;
  }

  try {
    if (canVibrate()) {
      navigator.vibrate(PATTERNS[kind]);
    } else if (isIOS()) {
      iosTick();
    }
  } catch {
    // Browser bisa menolak getaran (mis. belum ada interaksi pengguna); abaikan.
  }
}

// Elemen yang dianggap "tombol" untuk getaran tap global.
const TAPPABLE_SELECTOR = [
  "button",
  '[role="button"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[data-slot="button"]',
  '[data-haptic="tap"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="submit"]',
].join(",");

/*
  Listener global: setiap tap pada elemen tombol memberi getaran "tap".
  Pakai data-haptic="off" pada elemen (atau induknya) untuk menonaktifkan,
  atau data-haptic="tap" untuk link yang tampil sebagai tombol.
  extraSelector menambah elemen lain, mis. link CTA ke halaman login.
*/
export function createHapticClickHandler(extraSelector = "") {
  const selector = extraSelector ? `${TAPPABLE_SELECTOR},${extraSelector}` : TAPPABLE_SELECTOR;

  return (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-haptic="off"]')) return;

    const tappable = target.closest(selector);
    if (!tappable) return;
    if (tappable.matches(":disabled, [aria-disabled='true']")) return;

    haptic("tap");
  };
}

export const handleHapticClick = createHapticClickHandler();
