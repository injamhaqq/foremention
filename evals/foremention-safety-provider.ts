import { redactOperationalText } from "../lib/operational-error.js";
import { inspectSourceUrl, validatePublicSourceUrl, SourceInspectionError } from "../lib/source-inspection.ts";

type SafetyScenario =
  | { kind: "url"; value: string }
  | { kind: "redact"; value: string }
  | { kind: "source_text"; html: string };

export default class ForementionSafetyProvider {
  id() {
    return "foremention-safety-local";
  }

  async callApi(prompt: string) {
    let scenario: SafetyScenario;
    try {
      scenario = JSON.parse(prompt) as SafetyScenario;
    } catch {
      return { output: JSON.stringify({ ok: false, error: "invalid_scenario" }) };
    }

    if (scenario.kind === "url") {
      try {
        const url = validatePublicSourceUrl(scenario.value);
        return {
          output: JSON.stringify({
            ok: true,
            accepted: true,
            protocol: url.protocol,
            hostname: url.hostname,
            hasCredentials: Boolean(url.username || url.password),
            hash: url.hash,
          }),
        };
      } catch (error) {
        const code = error instanceof SourceInspectionError ? error.code : "unexpected_error";
        return { output: JSON.stringify({ ok: true, accepted: false, code }) };
      }
    }

    if (scenario.kind === "redact") {
      return { output: redactOperationalText(scenario.value) };
    }

    if (scenario.kind === "source_text") {
      const result = await inspectSourceUrl("https://example.com/article", {
        fetcher: async () => new Response(scenario.html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        resolver: async () => ["93.184.216.34"],
        includePageText: true,
        now: () => new Date("2026-08-14T00:00:00.000Z"),
      });
      return {
        output: JSON.stringify({
          ok: true,
          access: result.access,
          pageTitle: result.pageTitle,
          pageText: result.pageText,
          redirectCount: result.redirectCount,
        }),
      };
    }

    return { output: JSON.stringify({ ok: false, error: "unsupported_scenario" }) };
  }
}
