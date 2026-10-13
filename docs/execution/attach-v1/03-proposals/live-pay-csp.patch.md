# Chat03 proposal — `/pay` CSP and Permissions-Policy for the live default payment link (FM-00 / Chat06 owned file)

`worker/index.ts` is a shared runtime file, so Chat03 does not edit it. Without this change the
Chat03 live `/pay` branch (gated by `lib/paddle-payment-page.ts`) cannot load the live Paddle frame,
because the current `/pay` policy only allows the **sandbox** hosts.

Why it matters: Paddle builds every transaction `checkout.url` from the account's default payment link
plus `?_ptxn=`, and also sends customers there to update a payment method
(https://developer.paddle.com/build/transactions/default-payment-link). Live self-serve checkout and
live payment-method updates therefore require a working live `/pay`.

Hosts below mirror the sandbox pattern already in `worker/index.ts` (`sandbox-buy.paddle.com`,
`sandbox-checkout-service.paddle.com`). Verify them in a staging browser run with the browser console
open before release. They are not confirmed by a live checkout.

```diff
-const paddleSandboxPayContentSecurityPolicy = contentSecurityPolicy
-  .replace("script-src 'self'", "script-src 'self' https://cdn.paddle.com")
-  .replace("style-src 'self'", "style-src 'self' https://cdn.paddle.com")
-  .replace("connect-src 'self'", "connect-src 'self' https://cdn.paddle.com https://sandbox-checkout-service.paddle.com")
-  .replace("frame-src 'self'", "frame-src 'self' https://sandbox-buy.paddle.com");
+// /pay only. Live hosts are listed but the page renders live checkout only
+// behind lib/paddle-payment-page.ts (every live gate + canonical host).
+const paddlePayContentSecurityPolicy = contentSecurityPolicy
+  .replace("script-src 'self'", "script-src 'self' https://cdn.paddle.com")
+  .replace("style-src 'self'", "style-src 'self' https://cdn.paddle.com")
+  .replace("connect-src 'self'", "connect-src 'self' https://cdn.paddle.com https://sandbox-checkout-service.paddle.com https://checkout-service.paddle.com")
+  .replace("frame-src 'self'", "frame-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com");
@@
-    url.pathname === "/pay" ? paddleSandboxPayContentSecurityPolicy : contentSecurityPolicy,
+    url.pathname === "/pay" ? paddlePayContentSecurityPolicy : contentSecurityPolicy,
@@
-  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
+  // Apple Pay / Google Pay inside the Paddle frame need the Payment Request
+  // API delegated to Paddle's checkout origin on /pay only. The domain shows
+  // Apple Pay "verified" in the read-only checkout-domains API (2026-10-13).
+  secured.headers.set("Permissions-Policy", url.pathname === "/pay"
+    ? 'camera=(), microphone=(), geolocation=(), payment=(self "https://buy.paddle.com"), usb=()'
+    : "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
```

Tests to update with it (FM-00): any worker CSP contract that asserts the sandbox-only policy string.
Rollback: revert the hunk. The live `/pay` branch then stays inert because the frame is blocked, and the gate still refuses it unless `PADDLE_LIVE_CHECKOUT_PAGE_ENABLED=1`.
