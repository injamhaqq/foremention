"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      if (target && !target.hasAttribute("disabled")) target.click();
      else fallback?.();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
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
        event.preventDefault();
        activate("[data-workspace-review]");
        setAnnouncement("Opened the review action.");
      } else if (key === "a") {
        event.preventDefault();
        activate("[data-workspace-action]", () => router.push("/app/placements"));
        setAnnouncement("Opened the action workflow.");
      } else if (key === "e") {
        event.preventDefault();
        activate("[data-workspace-export]");
        setAnnouncement("Started the available export.");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return <p className="sr-only" aria-live="polite">{announcement}</p>;
}
