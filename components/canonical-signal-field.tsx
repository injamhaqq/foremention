"use client";

import { useEffect, useRef } from "react";

const farPoints = [
  [92, 142, 1.4], [148, 83, 1.1], [191, 214, 1.5], [236, 128, 1.1], [276, 72, 1.3],
  [316, 188, 1.1], [361, 108, 1.6], [410, 66, 1.1], [459, 151, 1.3], [504, 94, 1.1],
  [553, 202, 1.5], [598, 118, 1.2], [653, 75, 1.4], [692, 168, 1.1], [718, 227, 1.2],
] as const;

const nearPoints = [
  [118, 338, 2.4], [175, 286, 1.8], [233, 365, 2.1], [286, 308, 1.7], [343, 397, 2.3],
  [402, 281, 1.8], [468, 348, 2.5], [526, 302, 1.7], [583, 389, 2.2], [642, 325, 1.9],
] as const;

export function CanonicalSignalField({ compact = false }: { compact?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    if (reduceMotion.matches || coarsePointer.matches) {
      root.dataset.motion = "static";
      return;
    }

    let frame = 0;
    let active = true;
    let pointerX = 0;
    let pointerY = 0;
    let scrollDepth = 0;
    const setCustomProperty = root.style.setProperty.bind(root.style) as (name: string, value: string) => void;

    const commit = () => {
      frame = 0;
      if (!active) return;
      setCustomProperty("--fm-depth-x", pointerX.toFixed(4));
      setCustomProperty("--fm-depth-y", pointerY.toFixed(4));
      setCustomProperty("--fm-depth-scroll", scrollDepth.toFixed(4));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(commit);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      schedule();
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
      schedule();
    };

    const onScroll = () => {
      const rect = root.getBoundingClientRect();
      const viewport = Math.max(window.innerHeight, 1);
      scrollDepth = Math.max(-1, Math.min(1, (viewport * 0.5 - (rect.top + rect.height * 0.5)) / viewport));
      schedule();
    };

    const observer = new IntersectionObserver(([entry]) => {
      active = Boolean(entry?.isIntersecting);
      root.dataset.motion = active ? "active" : "paused";
      if (active) onScroll();
    }, { rootMargin: "120px" });

    observer.observe(root);
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      active = false;
      observer.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`canonical-signal-field canonical-signal canonical-signal--5d${compact ? " canonical-signal-field--compact" : ""}`}
      data-motion="active"
      aria-hidden="true"
    >
      <svg className="canonical-signal-field__svg canonical-signal__svg--5d" viewBox="0 0 760 620" role="presentation" focusable="false">
        <defs>
          <radialGradient id="fm-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="0.14" stopColor="#cffff0" stopOpacity="0.98" />
            <stop offset="0.42" stopColor="#65b58e" stopOpacity="0.56" />
            <stop offset="1" stopColor="#176347" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fm-horizon" cx="50%" cy="0%" r="76%">
            <stop offset="0" stopColor="#dfffee" stopOpacity="0.95" />
            <stop offset="0.2" stopColor="#65b58e" stopOpacity="0.5" />
            <stop offset="0.62" stopColor="#176347" stopOpacity="0.14" />
            <stop offset="1" stopColor="#176347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fm-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#65b58e" stopOpacity="0" />
            <stop offset="0.42" stopColor="#65b58e" stopOpacity="0.16" />
            <stop offset="0.73" stopColor="#eafff4" stopOpacity="0.78" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="fm-blur-18"><feGaussianBlur stdDeviation="18" /></filter>
          <filter id="fm-blur-7"><feGaussianBlur stdDeviation="7" /></filter>
        </defs>

        <g className="canonical-signal-field__far canonical-signal__depth canonical-signal__depth--far">
          {farPoints.map(([cx, cy, r], index) => <circle key={`far-${index}`} cx={cx} cy={cy} r={r} className="canonical-signal__particle--far" />)}
        </g>

        <g className="canonical-signal-field__ring-plane canonical-signal__depth canonical-signal__depth--rings">
          <ellipse cx="520" cy="350" rx="258" ry="136" className="canonical-signal-field__ring canonical-signal-field__ring--outer canonical-signal__ring canonical-signal__ring--1" />
          <ellipse cx="520" cy="350" rx="208" ry="110" className="canonical-signal-field__ring canonical-signal-field__ring--mid canonical-signal__ring canonical-signal__ring--2" />
          <ellipse cx="520" cy="350" rx="154" ry="82" className="canonical-signal-field__ring canonical-signal-field__ring--inner canonical-signal__ring canonical-signal__ring--3" />
          <path d="M270 350H742" className="canonical-signal-field__axis canonical-signal__axis" />
          <path d="M520 194V486" className="canonical-signal-field__axis canonical-signal-field__axis--vertical canonical-signal__axis" />
        </g>

        <g className="canonical-signal-field__horizon-plane canonical-signal__depth canonical-signal__depth--horizon">
          <path d="M220 488C314 426 424 400 520 400C616 400 710 426 790 482L790 620H220Z" fill="url(#fm-horizon)" filter="url(#fm-blur-18)" />
          <path d="M226 486C322 428 424 405 520 405C620 405 710 430 786 482" className="canonical-signal-field__horizon-line canonical-signal__horizon canonical-signal__horizon--front" />
        </g>

        <g className="canonical-signal-field__beam-plane canonical-signal__depth canonical-signal__depth--core">
          <rect x="498" y="64" width="44" height="354" rx="22" fill="url(#fm-beam)" filter="url(#fm-blur-7)" className="canonical-signal__beam" />
          <path d="M520 70V414" className="canonical-signal-field__beam-line canonical-signal__beam" />
        </g>

        <g className="canonical-signal-field__core-plane canonical-signal__depth canonical-signal__depth--core">
          <circle cx="520" cy="350" r="96" fill="url(#fm-core)" filter="url(#fm-blur-18)" className="canonical-signal-field__core-halo canonical-signal__halo" />
          <circle cx="520" cy="350" r="34" fill="url(#fm-core)" className="canonical-signal-field__core canonical-signal__core" />
          <circle cx="520" cy="350" r="5" className="canonical-signal-field__core-point canonical-signal__core" />
        </g>

        <g className="canonical-signal-field__near canonical-signal__depth canonical-signal__depth--near">
          {nearPoints.map(([cx, cy, r], index) => <circle key={`near-${index}`} cx={cx} cy={cy} r={r} className="canonical-signal__particle--near" />)}
        </g>
      </svg>
      <span className="canonical-signal-field__caption">REGISTERED SIGNAL / EVIDENCE CONVERGENCE</span>
    </div>
  );
}
