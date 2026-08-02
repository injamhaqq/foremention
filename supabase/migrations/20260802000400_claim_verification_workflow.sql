-- Separate evidence linkage from the human decision about whether a claim is verified or disputed.
begin;

alter table public.verified_claims
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_note text;

alter table public.verified_claims drop constraint if exists verified_claims_verification_status_check;
alter table public.verified_claims add constraint verified_claims_verification_status_check
  check (verification_status in ('pending','verified','disputed'));

update public.verified_claims set verification_status = 'verified' where verified_at is not null;

commit;
