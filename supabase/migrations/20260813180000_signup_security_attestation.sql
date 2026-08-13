create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.signup_security_attestations (
  token_hash text primary key,
  email_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint signup_security_attestations_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint signup_security_attestations_email_hash_format
    check (email_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists signup_security_attestations_expires_at_idx
  on private.signup_security_attestations (expires_at);

revoke all on table private.signup_security_attestations from public, anon, authenticated;
grant usage on schema private to service_role, supabase_auth_admin;
grant select, insert, update, delete on table private.signup_security_attestations to service_role;
grant select, delete on table private.signup_security_attestations to supabase_auth_admin;
grant usage on schema extensions to supabase_auth_admin;

create or replace function public.issue_signup_security_attestation(
  p_token_hash text,
  p_email_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_email_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= now()
    or p_expires_at > now() + interval '10 minutes'
  then
    raise exception 'invalid signup security attestation';
  end if;

  delete from private.signup_security_attestations
  where expires_at <= now();

  insert into private.signup_security_attestations (token_hash, email_hash, expires_at)
  values (p_token_hash, p_email_hash, p_expires_at)
  on conflict (token_hash) do update
  set email_hash = excluded.email_hash,
      expires_at = excluded.expires_at,
      created_at = now();
end;
$$;

revoke all on function public.issue_signup_security_attestation(text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_signup_security_attestation(text, text, timestamptz)
  to service_role;

create or replace function public.hook_require_signup_security_attestation(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  provider text;
  email text;
  attestation text;
  matched_token text;
begin
  provider := coalesce(event->'user'->'app_metadata'->>'provider', '');

  if provider <> 'email' then
    return '{}'::jsonb;
  end if;

  email := lower(trim(coalesce(event->'user'->>'email', '')));
  attestation := coalesce(event->'user'->'user_metadata'->>'signup_security_attestation', '');

  if email = '' or attestation = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Complete signup through Foremention before creating this account.'
      )
    );
  end if;

  delete from private.signup_security_attestations
  where token_hash = encode(extensions.digest(attestation, 'sha256'), 'hex')
    and email_hash = encode(extensions.digest(email, 'sha256'), 'hex')
    and expires_at > now()
  returning token_hash into matched_token;

  if matched_token is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Signup verification expired. Start signup again in Foremention.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_require_signup_security_attestation(jsonb)
  to supabase_auth_admin;
revoke execute on function public.hook_require_signup_security_attestation(jsonb)
  from authenticated, anon, public;
