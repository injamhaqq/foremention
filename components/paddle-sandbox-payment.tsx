"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";

type PaddleJs = {
  Environment: { set(value: "sandbox"): void };
  Initialize(options: { token: string; checkout: { settings: { displayMode: "overlay"; theme: "light" } } }): void;
};
type PaddleWindow = Window & { Paddle?: PaddleJs };

const TXN_ID = /^txn_[a-z0-9]{26}$/;

export function PaddleSandboxPayment({ clientToken }: { clientToken: string }) {
  const started = useRef(false);
  const [message, setMessage] = useState("Loading secure Paddle sandbox checkout…");

  const initialize = useCallback(() => {
    if (started.current) return;
    const transactionId = new URLSearchParams(window.location.search).get("_ptxn");
    if (!transactionId || !TXN_ID.test(transactionId)) {
      setMessage("A valid Paddle test transaction link is required. Open checkout from your Foremention sandbox workspace.");
      return;
    }
    const paddle = (window as PaddleWindow).Paddle;
    if (!paddle) {
      setMessage("Paddle's checkout script could not be loaded. Reload the page and try again.");
      return;
    }
    try {
      // Paddle.js automatically opens the referenced transaction when _ptxn
      // is present. Do NOT also call Checkout.open(): that can double-open.
      paddle.Environment.set("sandbox");
      paddle.Initialize({
        token: clientToken,
        checkout: { settings: { displayMode: "overlay", theme: "light" } },
      });
      started.current = true;
      setMessage("Opening the Paddle test checkout. If it does not appear, check that this is a valid sandbox transaction.");
    } catch {
      setMessage("Paddle checkout could not initialize. No payment was completed on this page.");
    }
  }, [clientToken]);

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onReady={initialize}
      />
      <p role="status" aria-live="polite">{message}</p>
      <p>
        Payment and refund assistance: <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle buyer support</a>.
        See the <a href="/refund-policy">refund and cancellation policy</a> before a live purchase.
      </p>
    </>
  );
}
