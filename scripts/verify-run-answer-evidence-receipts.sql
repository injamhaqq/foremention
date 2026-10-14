\set ON_ERROR_STOP on

-- Evidence receipts: every saved run answer stores its text plus a write-time
-- SHA-256 of the normalized text. Disposable fixtures; always rolled back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_expected text;
  v_actual text;
begin
  -- Golden vectors shared with tests/evidence-receipts.test.mjs.
  if private.answer_text_sha256('') <> 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' then
    raise exception 'evidence receipt: empty vector mismatch';
  end if;
  if private.answer_text_sha256(convert_from(decode('202048656c6c6f0d0a576f726c640d0a0920', 'hex'), 'UTF8')) <> '35c6b9f66dceb6cf8f733d08689564e420e18eb40250d9435352617c027f36d6' then
    raise exception 'evidence receipt: CRLF/trim vector mismatch';
  end if;
  if private.answer_text_sha256(convert_from(decode('43616665cc81206175206c616974', 'hex'), 'UTF8')) <> '793e7643ce558259f6fe71f9ecaaf268acbcd011a2bb4c7f561df05a133d4d08' then
    raise exception 'evidence receipt: NFC vector mismatch';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'run_answers'
      and column_name in ('answer_text_sha256', 'answer_text_hash_version') and is_nullable <> 'NO'
  ) or (
    select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'run_answers'
      and column_name in ('answer_text_sha256', 'answer_text_hash_version')
  ) <> 2 then
    raise exception 'evidence receipt columns missing or nullable';
  end if;
end $$;

insert into auth.users (id) values ('f9100000-0000-4000-8000-000000000001'::uuid);
insert into public.organizations (id, name, slug, created_by) values
  ('f9200000-0000-4000-8000-000000000001'::uuid, 'Evidence Receipt Fixture', 'evidence-receipt-fixture', 'f9100000-0000-4000-8000-000000000001'::uuid);
insert into public.categories (id, organization_id, name) values
  ('f9300000-0000-4000-8000-000000000001'::uuid, 'f9200000-0000-4000-8000-000000000001'::uuid, 'Receipt Category');
insert into public.runs (id, organization_id, category_id, created_by) values
  ('f9500000-0000-4000-8000-000000000001'::uuid, 'f9200000-0000-4000-8000-000000000001'::uuid, 'f9300000-0000-4000-8000-000000000001'::uuid, 'f9100000-0000-4000-8000-000000000001'::uuid);

-- Write as the collection job does (service_role), so the trigger is proven
-- to work without privileges on private helper functions.
set local role service_role;

-- A client-supplied wrong hash is overwritten by the authoritative trigger.
insert into public.run_answers (id, run_id, organization_id, prompt_key, provider, model, answer_text, answer_text_sha256, answer_text_hash_version, collected_at) values
  ('f9600000-0000-4000-8000-000000000001'::uuid, 'f9500000-0000-4000-8000-000000000001'::uuid, 'f9200000-0000-4000-8000-000000000001'::uuid,
   'receipt-question', 'fixture', 'fixture-v1', 'abc', repeat('0', 64), 'fm-answer-text-sha256.v1', now());
-- Omitting the receipt entirely still stamps one.
insert into public.run_answers (id, run_id, organization_id, prompt_key, provider, model, answer_text, collected_at) values
  ('f9600000-0000-4000-8000-000000000002'::uuid, 'f9500000-0000-4000-8000-000000000001'::uuid, 'f9200000-0000-4000-8000-000000000001'::uuid,
   'receipt-question-2', 'fixture', 'fixture-v1', '  abc' || chr(13) || chr(10), now());

do $$
begin
  if exists (
    select 1 from public.run_answers
    where run_id = 'f9500000-0000-4000-8000-000000000001'::uuid
      and (answer_text_sha256 <> 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        or answer_text_hash_version <> 'fm-answer-text-sha256.v1')
  ) then
    raise exception 'evidence receipt trigger did not stamp the authoritative hash on insert';
  end if;
end $$;

-- An update to the answer text re-stamps the receipt.
update public.run_answers set answer_text = 'Abc' where id = 'f9600000-0000-4000-8000-000000000001'::uuid;
reset role;
do $$
begin
  if (select answer_text_sha256 from public.run_answers where id = 'f9600000-0000-4000-8000-000000000001'::uuid)
     <> encode(sha256(convert_to('Abc', 'UTF8')), 'hex') then
    raise exception 'evidence receipt trigger did not re-stamp on update';
  end if;
end $$;

rollback;
