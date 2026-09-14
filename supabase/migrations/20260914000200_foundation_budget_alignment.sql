begin;

-- A five-question Groq baseline reserves $0.50 at $0.10 per provider-prompt
-- observation. Foundation access includes 20 observations per month, so the
-- conservative entitlement reserve must allow the full $2.00 monthly allowance.
-- Preserve explicitly customized entitlements by migrating only the legacy
-- Foundation shape: free_beta, 20 observations, and the old $1.00 cap.
alter table public.organization_entitlements
  alter column monthly_ai_spend_cap_usd set default 2.00;

update public.organization_entitlements
set monthly_ai_spend_cap_usd = 2.00
where plan = 'free_beta'
  and monthly_run_units = 20
  and monthly_ai_spend_cap_usd = 1.00;

commit;
