-- Chat06 verified billing inbox. Additive; feature flag remains disabled.
begin;
create table if not exists public.billing_verified_event_inbox (
 provider text not null check (provider='paddle'),
 event_id text not null check(event_id ~ '^evt_[a-z0-9]{26}$'),
 source_mode text not null check (source_mode in ('live','sandbox')),
 event_type text not null check(length(event_type) between 3 and 100),
 payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
 raw_body text not null check(octet_length(raw_body) between 2 and 262144),
 status text not null default 'pending'
   check(status in ('pending','leased','applied','ignored','needs_review','dead_letter')),
 attempt_count int not null default 0 check(attempt_count between 0 and 100),
 next_attempt_at timestamptz not null default now(),
 lease_token uuid,
 generation int not null default 0 check(generation>=0),
 lease_expires_at timestamptz,
 last_error_code text check(last_error_code is null or length(last_error_code)<=80),
 verified_at timestamptz not null default now(),
 processed_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(provider,event_id),
 constraint billing_inbox_lease_pair_check check((lease_token is null)=(lease_expires_at is null))
);
create index if not exists billing_inbox_ready_idx on public.billing_verified_event_inbox
  (next_attempt_at,verified_at) where status='pending';
create index if not exists billing_inbox_lease_idx on public.billing_verified_event_inbox
  (lease_expires_at) where status='leased';
alter table public.billing_verified_event_inbox enable row level security;
revoke all on public.billing_verified_event_inbox from public,anon,authenticated;
grant select,insert,update on public.billing_verified_event_inbox to service_role;
comment on table public.billing_verified_event_inbox is
  'Service-only verified raw Paddle payload; retention/deletion requires legal approval.';

create or replace function public.enqueue_verified_billing_event(
 p_provider text,p_event_id text,p_source_mode text,p_event_type text,
 p_payload_sha256 text,p_raw_body text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.billing_verified_event_inbox%rowtype; v_inserted_count bigint:=0;
begin
 if p_provider is distinct from 'paddle'
    or p_event_id is null or p_event_id !~ '^evt_[a-z0-9]{26}$'
    or p_source_mode is null or p_source_mode not in ('sandbox','live')
    or p_event_type is null or length(p_event_type) not between 3 and 100
    or p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$'
    or p_raw_body is null or octet_length(p_raw_body) not between 2 and 262144
    or encode(extensions.digest(convert_to(p_raw_body,'UTF8'),'sha256'),'hex') <> p_payload_sha256
 then raise exception 'invalid_verified_billing_event'; end if;
 insert into public.billing_verified_event_inbox
  (provider,event_id,source_mode,event_type,payload_sha256,raw_body)
 values(p_provider,p_event_id,p_source_mode,p_event_type,p_payload_sha256,p_raw_body)
 on conflict(provider,event_id) do nothing;
 get diagnostics v_inserted_count = row_count;
 if v_inserted_count=0 then
  select * into v from public.billing_verified_event_inbox
   where provider=p_provider and event_id=p_event_id for update;
  if not found or v.payload_sha256<>p_payload_sha256 or v.source_mode<>p_source_mode
    or v.event_type<>p_event_type or v.raw_body<>p_raw_body then
    raise exception 'billing_event_integrity_conflict';
  end if;
 end if;
 return jsonb_build_object('accepted',true,'duplicate',v_inserted_count=0);
end;
$$;

create or replace function public.claim_verified_billing_batch(
 p_limit int default 10,p_lease_seconds int default 120
) returns table(provider text,event_id text,source_mode text,event_type text,
 raw_body text,generation int,lease_token uuid,attempt_count int)
language plpgsql security definer set search_path='' as $$
begin
 if p_limit is null or p_limit not between 1 and 20
    or p_lease_seconds is null or p_lease_seconds not between 30 and 300 then
   raise exception 'invalid_billing_claim_bounds';
 end if;
 update public.billing_verified_event_inbox i set
   status='dead_letter',last_error_code='billing_attempts_exhausted',
   lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
  where i.status='leased' and i.lease_expires_at<=clock_timestamp() and i.attempt_count>=8;
 return query with candidates as (
  select i.provider,i.event_id from public.billing_verified_event_inbox i
   where ((i.status='pending' and i.next_attempt_at<=clock_timestamp())
      or (i.status='leased' and i.lease_expires_at<=clock_timestamp()))
     and i.attempt_count<8
   order by i.verified_at,i.event_id limit p_limit for update skip locked
 ), claimed as (
  update public.billing_verified_event_inbox i set
   status='leased',generation=i.generation+1,attempt_count=i.attempt_count+1,
   lease_token=pg_catalog.gen_random_uuid(),
   lease_expires_at=clock_timestamp()+make_interval(secs=>p_lease_seconds),
   updated_at=clock_timestamp()
  from candidates c where i.provider=c.provider and i.event_id=c.event_id
  returning i.provider,i.event_id,i.source_mode,i.event_type,i.raw_body,
            i.generation,i.lease_token,i.attempt_count
 ) select c.* from claimed c;
end;
$$;

create or replace function public.settle_verified_billing_event(
 p_provider text,p_event_id text,p_generation int,p_lease_token uuid,
 p_outcome text,p_error_code text default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare v public.billing_verified_event_inbox%rowtype; v_processed boolean:=false; v_status text;
begin
 if p_outcome is null or p_outcome not in ('applied','ignored','needs_review','retry')
    or (p_error_code is not null and (length(p_error_code)>80 or p_error_code !~ '^[a-z0-9_:-]+$'))
 then raise exception 'invalid_billing_settlement'; end if;
 select * into v from public.billing_verified_event_inbox i
  where i.provider=p_provider and i.event_id=p_event_id for update;
 if not found or v.status<>'leased' or v.generation<>p_generation
    or v.lease_token is distinct from p_lease_token
    or v.lease_expires_at<=clock_timestamp() then return false; end if;
 if p_outcome='applied' then
  select exists(select 1 from public.billing_webhook_events b
   where b.provider=p_provider and b.event_id=p_event_id and b.processed_at is not null)
  into v_processed;
  if not v_processed then raise exception 'billing_event_not_applied'; end if;
 end if;
 v_status:=case when p_outcome='retry' and v.attempt_count>=8 then 'dead_letter'
                when p_outcome='retry' then 'pending' else p_outcome end;
 update public.billing_verified_event_inbox i set
  status=v_status,lease_token=null,lease_expires_at=null,
  next_attempt_at=case when v_status='pending' then clock_timestamp()
    +make_interval(secs=>(least(900,15*power(2,least(v.attempt_count,5))::int)+floor(random()*10)::int))
    else i.next_attempt_at end,
  last_error_code=case when p_outcome='retry' and v_status='dead_letter'
    then 'billing_attempts_exhausted' else p_error_code end,
  processed_at=case when v_status in ('applied','ignored','needs_review') then clock_timestamp() else i.processed_at end,
  updated_at=clock_timestamp()
 where i.provider=p_provider and i.event_id=p_event_id;
 return true;
end;
$$;
revoke all on function public.enqueue_verified_billing_event(text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.claim_verified_billing_batch(integer,integer) from public,anon,authenticated;
revoke all on function public.settle_verified_billing_event(text,text,integer,uuid,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_verified_billing_event(text,text,text,text,text,text) to service_role;
grant execute on function public.claim_verified_billing_batch(integer,integer) to service_role;
grant execute on function public.settle_verified_billing_event(text,text,integer,uuid,text,text) to service_role;
commit;
