"use client";

import Link from "next/link";
import { useState } from "react";

/** Browser-only state for the illustrative graph. All static homepage content renders on the server. */
export function IllustrativeRecommendationGraph() {
  const [sampleSurface, setSampleSurface] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<"competitor" | "brand" | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<"source-01" | "source-02" | null>(null);
  const sampleSurfaceReady = sampleSurface === "workers-ai-bing-rss";

  const inspector = !sampleSurfaceReady
    ? {
        label: "STEP 02 / EXAMPLE SURFACE",
        title: "Choose the supported example surface.",
        detail: "The question is visible first. Selecting the surface unlocks the illustrative answer, brands, and returned sources.",
      }
    : selectedEvidence
      ? {
          label: "EVIDENCE DETAIL",
          title: selectedEvidence === "source-01" ? "Source 01 · review pending" : "Source 02 · review pending",
          detail: "Returned and sample-retrievable. Human review remains open, and this source is not presented as the cause of the recommendation.",
        }
      : selectedBrand === "competitor"
        ? {
            label: "OBSERVED BRAND",
            title: "Competitor A appears in the sample answer.",
            detail: "The observed answer and returned sources stay attached to the same illustrative Recommendation Record.",
          }
        : selectedBrand === "brand"
          ? {
              label: "OBSERVED BRAND",
              title: "Your brand is present, but not top-listed.",
              detail: "That is an observation only. The sample does not invent a causal explanation for the ordering.",
            }
          : {
              label: "STEP 03 / OBSERVED ANSWER",
              title: "Provider response preserved.",
              detail: "Select a brand or returned source to inspect its state, then open the Recommendation Record for the full evidence boundary.",
            };

  return <>
        <div id="sample-recommendation-graph" className="fm-recommendation-graph" role="group" aria-label="Illustrative recommendation graph connecting one buyer question to an observed answer, recommended brands, returned sources, and an inspectable Recommendation Record">
          <div className="fm-recommendation-graph__label"><span>ILLUSTRATIVE SIGNAL MAP</span><strong>Question → answer → brands → sources</strong></div>
          <label className="fm-recommendation-graph__surface">
            <span>EXAMPLE MEASUREMENT SURFACE</span>
            <select
              aria-label="Choose the supported example measurement surface"
              value={sampleSurface}
              onChange={(event) => {
                setSampleSurface(event.target.value);
                setSelectedBrand(null);
                setSelectedEvidence(null);
              }}
            >
              <option value="">Choose a surface</option>
              <option value="workers-ai-bing-rss">Workers AI + Brave Search grounded synthesis</option>
            </select>
          </label>
          <svg className="fm-recommendation-graph__lines" viewBox="0 0 760 620" aria-hidden="true" preserveAspectRatio="none">
            <path d="M130 310 C230 310 220 190 330 190" />
            <path d="M130 310 C230 310 220 420 330 420" />
            <path d="M430 190 C525 190 520 150 635 150" />
            <path d="M430 190 C525 190 520 265 635 265" />
            <path d="M430 420 C525 420 520 355 635 355" />
            <path d="M430 420 C525 420 520 505 635 505" />
          </svg>

          <div className="fm-graph-node fm-graph-node--question">
            <span>BUYER QUESTION</span>
            <strong>Best platform for enterprise product marketing?</strong>
            <small>Priority question · demonstration</small>
          </div>
          <div className={`fm-graph-node fm-graph-node--answer${sampleSurfaceReady ? "" : " is-muted"}`}>
            <span>OBSERVED ANSWER</span>
            <strong>{sampleSurfaceReady ? "Provider response preserved" : "Select an example surface"}</strong>
            <small>{sampleSurfaceReady ? "Timestamp + model provenance attached" : "No live research is triggered"}</small>
          </div>
          <button
            type="button"
            disabled={!sampleSurfaceReady}
            aria-pressed={selectedBrand === "competitor"}
            className={`fm-graph-node fm-graph-node--brand${selectedBrand === "competitor" ? " is-selected" : ""}`}
            onClick={() => {
              setSelectedBrand("competitor");
              setSelectedEvidence(null);
            }}
          >
            <span>RECOMMENDED BRAND</span>
            <strong>Competitor A</strong>
            <small>Observed in this sample answer</small>
          </button>
          <button
            type="button"
            disabled={!sampleSurfaceReady}
            aria-pressed={selectedBrand === "brand"}
            className={`fm-graph-node fm-graph-node--brand-secondary${selectedBrand === "brand" ? " is-selected" : ""}`}
            onClick={() => {
              setSelectedBrand("brand");
              setSelectedEvidence(null);
            }}
          >
            <span>YOUR BRAND</span>
            <strong>Present, not top-listed</strong>
            <small>Illustrative state only</small>
          </button>
          <button
            type="button"
            disabled={!sampleSurfaceReady}
            aria-pressed={selectedEvidence === "source-01"}
            className={`fm-graph-node fm-graph-node--source-a${selectedEvidence === "source-01" ? " is-selected" : ""}`}
            onClick={() => {
              setSelectedEvidence("source-01");
              setSelectedBrand(null);
            }}
          >
            <span>RETURNED SOURCE</span>
            <strong>Source 01</strong>
            <small>Retrievable · review pending</small>
          </button>
          <button
            type="button"
            disabled={!sampleSurfaceReady}
            aria-pressed={selectedEvidence === "source-02"}
            className={`fm-graph-node fm-graph-node--source-b${selectedEvidence === "source-02" ? " is-selected" : ""}`}
            onClick={() => {
              setSelectedEvidence("source-02");
              setSelectedBrand(null);
            }}
          >
            <span>RETURNED SOURCE</span>
            <strong>Source 02</strong>
            <small>Retrievable · review pending</small>
          </button>

          <Link
            data-public-evidence-inspect
            className="fm-graph-record"
            href="#recommendation-record"
            aria-live="polite"
          >
            <span>{inspector.label}</span>
            <strong>{inspector.title}</strong>
            <small>{inspector.detail} <b aria-hidden="true">→</b></small>
          </Link>

          <ol className="sr-only">
            <li>One illustrative buyer question is shown before any measurement surface is selected.</li>
            <li>The visitor can select the currently supported example surface: Cloudflare Workers AI with independently retrieved Brave Search grounded synthesis.</li>
            <li>The provider answer is preserved with provenance.</li>
            <li>Observed brand recommendations remain attached to that answer.</li>
            <li>Returned sources remain distinct and inspectable.</li>
            <li>The evidence resolves into one sample Recommendation Record.</li>
          </ol>
        </div>
  </>;
}
