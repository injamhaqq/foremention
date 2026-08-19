begin;

-- These accounting mutations are server orchestration primitives. They must not
-- be callable directly with a browser/user JWT; the application server owns the
-- provider-spend, idempotency, and queueing checks that precede them.
revoke execute on function public.release_queued_run(uuid, uuid, text) from authenticated;
revoke execute on function public.reserve_run_budget(uuid, uuid, numeric) from authenticated;
revoke execute on function public.reserve_run_quota(uuid, integer, uuid) from authenticated;

commit;
