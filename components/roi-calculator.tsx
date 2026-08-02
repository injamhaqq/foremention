"use client";

import { useMemo, useState } from "react";

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function RoiCalculator() {
  const [spend, setSpend] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [benchmarkRate, setBenchmarkRate] = useState("");

  const result = useMemo(() => {
    const monthlySpend = Math.max(0, numberValue(spend));
    const current = Math.min(100, Math.max(0, numberValue(currentRate)));
    const benchmark = Math.min(100, Math.max(0, numberValue(benchmarkRate)));
    const gap = Math.max(0, benchmark - current);
    const relativeChange = current > 0 ? (gap / current) * 100 : null;
    return { monthlySpend, current, benchmark, gap, relativeChange };
  }, [benchmarkRate, currentRate, spend]);

  const ready = spend !== "" && currentRate !== "" && benchmarkRate !== "";

  return <div className="roi-calculator">
    <form className="roi-calculator__inputs" onSubmit={(event) => event.preventDefault()}>
      <div><span className="eyebrow">Your measured inputs</span><h2>Model the visibility gap.</h2><p>Use your own reviewed run data or a documented category benchmark. Foremention does not insert an invented benchmark.</p></div>
      <label>Monthly content spend (USD)<input inputMode="decimal" type="number" min="0" step="1" value={spend} onChange={(event) => setSpend(event.target.value)} placeholder="5000" /></label>
      <label>Current brand mention rate (%)<input inputMode="decimal" type="number" min="0" max="100" step="0.1" value={currentRate} onChange={(event) => setCurrentRate(event.target.value)} placeholder="12" /></label>
      <label>Documented category benchmark (%)<input inputMode="decimal" type="number" min="0" max="100" step="0.1" value={benchmarkRate} onChange={(event) => setBenchmarkRate(event.target.value)} placeholder="25" /></label>
    </form>

    <section className="roi-calculator__result" aria-live="polite">
      {!ready ? <div className="roi-calculator__empty"><span className="eyebrow">Scenario output</span><h2>Enter three real inputs.</h2><p>The calculator will show the arithmetic gap without predicting rankings, citations, traffic, leads, or revenue.</p></div> : <>
        <div className="roi-calculator__summary"><span className="eyebrow">Conservative scenario</span><h2>{result.gap > 0 ? `A ${result.gap.toFixed(1)}-point visibility gap.` : "No positive benchmark gap."}</h2><p>{result.gap > 0 ? `Across 100 comparable AI answers, reaching the benchmark would mean about ${result.gap.toFixed(1)} additional answers mentioning the brand.` : "The supplied benchmark is at or below the current rate, so this scenario does not model an increase."}</p></div>
        <div className="roi-calculator__metrics">
          <article><span>Current rate</span><strong>{result.current.toFixed(1)}%</strong><small>customer-supplied</small></article>
          <article><span>Benchmark</span><strong>{result.benchmark.toFixed(1)}%</strong><small>customer-supplied</small></article>
          <article><span>Point change</span><strong>+{result.gap.toFixed(1)}</strong><small>per 100 comparable answers</small></article>
          <article><span>Relative change</span><strong>{result.relativeChange === null ? "n/a" : `+${result.relativeChange.toFixed(0)}%`}</strong><small>{result.current === 0 ? "undefined from a zero baseline" : "arithmetic, not a forecast"}</small></article>
        </div>
        <div className="roi-calculator__spend"><strong>{money(result.monthlySpend)} monthly content spend</strong><p>This spend is context only. The calculator does not claim that spending causes AI mentions or assign revenue to a visibility change. Prove movement with comparable dated runs before making an investment decision.</p></div>
      </>}
    </section>
  </div>;
}
