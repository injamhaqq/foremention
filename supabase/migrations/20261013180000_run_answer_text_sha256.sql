-- Evidence receipts: make every stored answer reproducible by content hash.
-- run_answers already keeps answer_text and raw_json; this adds a stored
-- SHA-256 of the exact UTF-8 answer text so a Record can prove which text it
-- was built from. Additive and computed; creates no customer facts.
begin;

-- convert_to() is STABLE only because client_encoding could vary; the target
-- encoding here is fixed ('UTF8'), so the result is deterministic.
create or replace function private.utf8_sha256(p_text text) returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$ select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_text, 'UTF8')), 'hex') $$;

revoke all on function private.utf8_sha256(text) from public, anon, authenticated;

alter table public.run_answers
  add column if not exists answer_text_sha256 text
  generated always as (private.utf8_sha256(answer_text)) stored;

comment on column public.run_answers.answer_text_sha256 is
  'SHA-256 (hex) of the exact UTF-8 answer_text, computed by the database. Evidence receipt for reproducibility.';

commit;
