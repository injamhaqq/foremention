-- Evidence receipts follow-up (additive, non-destructive).
--
-- The receipt trigger runs with the privileges of the writing role
-- (service_role for the collection job, authenticated for RLS-scoped updates).
-- private.answer_text_sha256 is intentionally not executable by those roles,
-- so the trigger must not call it. Compute the identical
-- fm-answer-text-sha256.v1 expression inline from built-ins only.

create or replace function private.stamp_run_answer_evidence_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.answer_text_sha256 := encode(
    sha256(
      convert_to(
        btrim(
          replace(replace(normalize(new.answer_text, NFC), chr(13) || chr(10), chr(10)), chr(13), chr(10)),
          ' ' || chr(9) || chr(10) || chr(11) || chr(12)
        ),
        'UTF8'
      )
    ),
    'hex'
  );
  new.answer_text_hash_version := 'fm-answer-text-sha256.v1';
  return new;
end;
$$;

revoke all on function private.stamp_run_answer_evidence_receipt() from public, anon, authenticated;
