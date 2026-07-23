import { Arrow, StatusDot } from "@/components/brand";
import { sourceMapEntries } from "@/lib/demo-data";

export function SourceMapPreview() {
  return (
    <div className="source-preview">
      <div className="source-preview__bar">
        <div>
          <span className="eyebrow eyebrow--dark">Live product preview</span>
          <h2>Source Map</h2>
        </div>
        <span className="source-preview__category">HR software · 40 prompts</span>
      </div>
      <div className="source-preview__summary">
        <div><strong>12</strong><span>sources shaping answers</span></div>
        <div><strong>3</strong><span>already name you</span></div>
        <div><strong>6</strong><span>realistic entry routes</span></div>
      </div>
      <div className="source-preview__table" role="table" aria-label="Example Source Map">
        <div className="source-row source-row--head" role="row">
          <span>Source</span><span>AI evidence</span><span>You</span><span>Route in</span>
        </div>
        {sourceMapEntries.slice(0, 4).map((source) => (
          <div className="source-row" role="row" key={source.id}>
            <div className="source-cell__title">
              <span className="source-rank">{String(source.rank).padStart(2, "0")}</span>
              <span><strong>{source.domain}</strong><small>{source.type}</small></span>
            </div>
            <div><strong>{source.evidenceCount}</strong><small>citations observed</small></div>
            <div className="presence-cell"><StatusDot tone={source.clientPresent ? "green" : "red"} />{source.clientPresent ? "Present" : "Absent"}</div>
            <div className="route-cell">{source.route}<Arrow direction="up" /></div>
          </div>
        ))}
      </div>
      <div className="source-preview__foot">
        <span>Evidence, crawler access, competitors, and route are stored per URL.</span>
        <span>Demo data</span>
      </div>
    </div>
  );
}
