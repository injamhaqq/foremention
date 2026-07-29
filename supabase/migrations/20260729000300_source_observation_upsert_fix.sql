begin;

-- PostgREST cannot infer an ON CONFLICT target from the previous partial
-- unique index. A regular unique index still permits multiple NULL values,
-- while making observation_key a valid idempotent upsert target.
drop index if exists public.source_observations_observation_key_idx;
create unique index source_observations_observation_key_idx
  on public.source_observations (observation_key);

commit;
