"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { activateShortcutTarget } from "@/lib/workspace-shortcut-activation";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function availableItems() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-workspace-item]"))
    .filter((item) => item.offsetParent !== null);
}

export function WorkspaceKeyboardShortcuts() {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    function activate(selector: string, fallback?: () => void) {
      const activeItem = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-workspace-item]") : null;
      const target = activeItem?.querySelector<HTMLElement>(selector) || document.querySelector<HTMLElement>(selector);
      if (activateShortcutTarget(target)) return true;
      if (fallback) {
        fallback();
        return true;
      }
      return false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      // A background shortcut must not activate controls behind an open modal.
      if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        const items = availableItems();
        if (!items.length) return;
        event.preventDefault();
        const current = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-workspace-item]") : null;
        const index = current ? items.indexOf(current) : -1;
        const nextIndex = key === "j" ? (index + 1 + items.length) % items.length : (index <= 0 ? items.length - 1 : index - 1);
        items[nextIndex].focus();
        items[nextIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
        setAnnouncement(`Focused item ${nextIndex + 1} of ${items.length}.`);
        return;
      }
      if (key === "r") {
        if (activate("[data-workspace-review]")) {
          event.preventDefault();
          setAnnouncement("Review control activated.");
        }
      } else if (key === "a") {
        if (activate("[data-workspace-action]", () => router.push("/app/placements"))) {
          event.preventDefault();
          setAnnouncement("Action control activated or opening Actions.");
        }
      } else if (key === "e") {
        if (activate("[data-workspace-export]")) {
          event.preventDefault();
          setAnnouncement("Export control activated.");
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return <p className="sr-only" aria-live="polite">{announcement}</p>;
}
