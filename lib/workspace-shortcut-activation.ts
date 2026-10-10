/** Report only actual shortcut activation, never successful completion of an async action. */
type ShortcutTarget = Pick<HTMLElement, "hasAttribute" | "getAttribute" | "click"> & Partial<Pick<HTMLElement, "getClientRects">>;

export function activateShortcutTarget(target: ShortcutTarget | null): boolean {
  if (!target ||
      target.hasAttribute("disabled") ||
      target.hasAttribute("inert") ||
      target.hasAttribute("hidden") ||
      target.getAttribute("aria-disabled") === "true" ||
      target.getAttribute("aria-hidden") === "true" ||
      (target.getClientRects && target.getClientRects().length === 0)) {
    return false;
  }
  target.click();
  return true;
}

/** Skip unavailable bulk controls so a visible per-record action can still work. */
export function activateFirstAvailableShortcutTarget(targets: Iterable<ShortcutTarget>): boolean {
  for (const target of targets) {
    if (activateShortcutTarget(target)) return true;
  }
  return false;
}
