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

    const commit = () => {
      frame = 0;
      if (!active) return;
      root.style.setProperty("--fm-depth-x", pointerX.toFixed(4));
      root.style.setProperty("--fm-depth-y", pointerY.toFixed(4));
      root.style.setProperty("--fm-depth-scroll", scrollDepth.toFixed(4));
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
      className={`canonical-signal canonical-signal--reference canonical-signal--5d${compact ? " canonical-signal--compact" : ""}`}
      aria-hidden="true"
      data-motion="active"
    >
      <div className="canonical-signal__ambient canonical-signal__ambient--far" />
      <svg className="canonical-signal__svg canonical-signal__svg--5d" viewBox="0 0 760 720" role="presentation">
        <defs>
          <radialGradient id="fm-signal-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFDF9" stopOpacity="0.98" />
            <stop offset="18%" stopColor="#BFFFD8" stopOpacity="0.84" />
            <stop offset="55%" stopColor="#65B58E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#176347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fm-signal-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#65B58E" stopOpacity="0.03" />
            <stop offset="34%" stopColor="#FFFDF9" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#BFFFD8" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="fm-horizon-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#176347" stopOpacity="0" />
            <stop offset="42%" stopColor="#65B58E" stopOpacity="0.62" />
            <stop offset="55%" stopColor="#FFFDF9" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#176347" stopOpacity="0.18" />
          </linearGradient>
          <filter id="fm-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="fm-core-glow" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="canonical-signal__depth canonical-signal__depth--far">
          {farPoints.map(([cx, cy, r], index) => <circle key={`far-${index}`} cx={cx} cy={cy} r={r} className="canonical-signal__particle canonical-signal__particle--far" />)}
        </g>

        <g className="canonical-signal__depth canonical-signal__depth--rings">
          <line className="canonical-signal__axis" x1="44" x2="742" y1="302" y2="302" />
          <line className="canonical-signal__axis canonical-signal__axis--vertical" x1="456" x2="456" y1="20" y2="633" />
          {[64, 104, 148, 196, 250, 308].map((radius, index) => (
            <circle key={radius} className={`canonical-signal__ring canonical-signal__ring--${index + 1}`} cx="456" cy="302" r={radius} />
          ))}
          {[92, 174, 262, 350, 438, 526, 614, 702].map((x, index) => (
            <circle key={x} className="canonical-signal__node" cx={x} cy="302" r={index === 4 ? 3.1 : 2.4} />
          ))}
        </g>

        <g className="canonical-signal__depth canonical-signal__depth--core">
          <rect className="canonical-signal__beam-glow" x="448" y="296" width="16" height="352" rx="8" filter="url(#fm-soft-glow)" />
          <rect className="canonical-signal__beam" x="454.7" y="47" width="2.6" height="600" fill="url(#fm-signal-beam)" />
          <circle className="canonical-signal__halo" cx="456" cy="302" r="72" fill="url(#fm-signal-halo)" />
          <circle className="canonical-signal__core" cx="456" cy="302" r="4.8" filter="url(#fm-core-glow)" />
        </g>

        <g className="canonical-signal__depth canonical-signal__depth--horizon">
          <path className="canonical-signal__horizon canonical-signal__horizon--glow" d="M -70 650 Q 380 493 830 650" />
          <path className="canonical-signal__horizon canonical-signal__horizon--front" d="M -70 650 Q 380 493 830 650" stroke="url(#fm-horizon-line)" />
          {[80, 146, 212, 278, 344, 410, 476, 542, 608, 674].map((x) => (
            <path key={x} className="canonical-signal__horizon-ray" d={`M ${x} 720 L 456 544`} />
          ))}
          {[574, 596, 618, 640, 662, 684].map((y, index) => (
            <path key={y} className="canonical-signal__horizon-arc" d={`M ${32 - index * 16} ${y} Q 380 ${y - 82 - index * 5} ${728 + index * 16} ${y}`} />
          ))}
        </g>

        <g className="canonical-signal__depth canonical-signal__depth--near">
          {nearPoints.map(([cx, cy, r], index) => <circle key={`near-${index}`} cx={cx} cy={cy} r={r} className="canonical-signal__particle canonical-signal__particle--near" />)}
        </g>
      </svg>
      <div className="canonical-signal__ambient canonical-signal__ambient--near" />
    </div>
  );
}
