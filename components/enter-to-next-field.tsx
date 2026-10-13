"use client";

import { useEffect } from "react";

const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Di perangkat sentuh (keyboard virtual), tombol Enter pada input memindahkan
 * fokus ke field berikutnya di form yang sama. Pada field terakhir Enter tetap
 * berperilaku normal (submit). Tidak mengubah perilaku desktop/keyboard fisik.
 */
export function EnterToNextField() {
  useEffect(() => {
    const isTouchDevice = () =>
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
      if (!isTouchDevice()) return;

      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.form) return;

      const fields = Array.from(
        target.form.querySelectorAll<HTMLElement>(FIELD_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      const index = fields.indexOf(target);
      if (index === -1 || index === fields.length - 1) return;

      event.preventDefault();
      fields[index + 1].focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return null;
}
