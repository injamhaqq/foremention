/** Only report a shortcut as activated when a usable control was clicked. */
export function activateShortcutTarget(target: Pick<HTMLElement, "hasAttribute" | "getAttribute" | "click"> | null): boolean {
  if (!target || target.hasAttribute("disabled") || target.hasAttribute("inert") || target.getAttribute("aria-disabled") === "true") {
    return false;
  }
  target.click();
  return true;
}
