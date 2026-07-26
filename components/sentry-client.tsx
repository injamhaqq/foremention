"use client";

import * as Sentry from "@sentry/react";
import { useEffect } from "react";

/** Starts browser monitoring only when a public Sentry DSN is configured. */
export function SentryClient() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
    });
  }, []);

  return null;
}
