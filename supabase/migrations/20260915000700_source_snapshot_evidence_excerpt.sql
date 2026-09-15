begin;

-- Preserve a small human-readable historical evidence window alongside the
-- immutable page fingerprint. This is deliberately bounded and is not a raw
-- page archive or full-body capture.
alter table public.source_snapshots
  add column if not exists evidence_excerpt text;

alter table public.source_snapshots
  drop constraint if exists source_snapshots_evidence_excerpt_length_check;

alter table public.source_snapshots
  add constraint source_snapshots_evidence_excerpt_length_check
  check (evidence_excerpt is null or char_length(evidence_excerpt) <= 4000);

comment on column public.source_snapshots.evidence_excerpt is
  'Optional normalized historical evidence excerpt capped at 4,000 characters. It is retained for source-claim inspection and is not a full page archive or proof of absence/causation.';

commit;
