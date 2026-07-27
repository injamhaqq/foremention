"use client";

import { useEffect } from "react";

export function AuthHashRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/auth/callback") return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const hasSession = Boolean(hash.get("access_token"));
    const authType = hash.get("type");
    const hasAuthError = Boolean(hash.get("error") || hash.get("error_code"));

    if (!hasSession && !hasAuthError) return;
    if (!authType && !hasAuthError) return;

    window.location.replace(`/auth/callback${window.location.hash}`);
  }, []);

  return null;
}
