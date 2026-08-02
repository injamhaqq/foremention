-- Store non-content fingerprints so cited pages can be monitored without retaining their bodies.
begin;

alter table public.sources
  add column if not exists content_signature text,
  add column if not exists content_length integer check (content_length is null or content_length >= 0),
  add column if not exists last_reachable_at timestamptz,
  add column if not exists last_content_change_at timestamptz;

comment on column public.sources.content_signature is
  'A bounded 32-bit similarity fingerprint of visible text. It is not page content or a page review.';

commit;
