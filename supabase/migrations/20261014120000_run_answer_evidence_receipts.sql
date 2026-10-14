-- Evidence receipts for persisted provider answers (additive only).
--
-- Every saved AI answer in public.run_answers already keeps the provider's
-- answer text (answer_text, NOT NULL) and full provider payload (raw_json).
-- This migration adds a reproducible content hash of the normalized answer
-- text, computed by the database at write time, so a Recommendation Record can
-- prove which exact text it was built from.
--
-- Normalization "fm-answer-text-sha256.v1" (must match lib/evidence-receipt.ts):
--   NFC -> CRLF/CR to LF -> strip leading/trailing ASCII space/TAB/LF/VT/FF
--   -> SHA-256 over UTF-8 bytes -> lowercase hex.
--
-- No table, column, or row is dropped or rewritten; existing answers only gain
-- a hash derived from the answer text they already store.

create or replace function private.answer_text_sha256(p_text text)
returns text
language sql
stable
strict
parallel safe
set search_path = ''
as $$
  select encode(
    sha256(
      convert_to(
        btrim(
          replace(replace(normalize(p_text, NFC), chr(13) || chr(10), chr(10)), chr(13), chr(10)),
          ' ' || chr(9) || chr(10) || chr(11) || chr(12)
        ),
        'UTF8'
      )
    ),
    'hex'
  )
$$;

revoke all on function private.answer_text_sha256(text) from public, anon, authenticated;

alter table public.run_answers
  add column if not exists answer_text_sha256 text
    constraint run_answers_answer_text_sha256_format
    check (answer_text_sha256 is null or answer_text_sha256 ~ '^[0-9a-f]{64}$'),
  add column if not exists answer_text_hash_version text
    constraint run_answers_answer_text_hash_version_known
    check (answer_text_hash_version is null or answer_text_hash_version = 'fm-answer-text-sha256.v1');

comment on column public.run_answers.answer_text_sha256 is
  'Evidence receipt: SHA-256 (hex) of answer_text normalized per answer_text_hash_version. Computed by trigger at write time; client-supplied values are overwritten.';
comment on column public.run_answers.answer_text_hash_version is
  'Evidence receipt normalization version for answer_text_sha256 (fm-answer-text-sha256.v1 = NFC, CRLF/CR->LF, trim ASCII edge whitespace, SHA-256 hex).';

-- Authoritative stamp: every insert and every update recomputes the receipt
-- from the stored answer text, so the hash can never drift from the text.
create or replace function private.stamp_run_answer_evidence_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.answer_text_sha256 := private.answer_text_sha256(new.answer_text);
  new.answer_text_hash_version := 'fm-answer-text-sha256.v1';
  return new;
end;
$$;

revoke all on function private.stamp_run_answer_evidence_receipt() from public, anon, authenticated;

create or replace trigger stamp_run_answer_evidence_receipt
before insert or update on public.run_answers
for each row
execute function private.stamp_run_answer_evidence_receipt();

-- Backfill existing answers from the answer text they already store.
update public.run_answers
set answer_text_sha256 = private.answer_text_sha256(answer_text),
    answer_text_hash_version = 'fm-answer-text-sha256.v1'
where answer_text_sha256 is null
   or answer_text_hash_version is null;

-- answer_text is NOT NULL and the trigger stamps every write, so every saved
-- answer now carries a receipt; enforce it.
alter table public.run_answers alter column answer_text_sha256 set not null;
alter table public.run_answers alter column answer_text_hash_version set not null;
