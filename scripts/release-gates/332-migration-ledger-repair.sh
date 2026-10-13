#!/usr/bin/env bash
# #332 migration-ledger repair. GENERATED 2026-10-13 from a read-only comparison
# of production (vuujwdxivjsdikdstwib) schema_migrations vs main @ 6b93c88.
# DO NOT RUN without: (1) a verified production backup, (2) founder written
# approval on #332, (3) a fresh `supabase migration list --linked` matching this file.
# Steps 1-2 edit ONLY the migration history table. Step 3 is the one schema change.
set -euo pipefail
[ "${I_HAVE_A_VERIFIED_BACKUP:-}" = yes ] || { echo "Set I_HAVE_A_VERIFIED_BACKUP=yes after taking a backup" >&2; exit 1; }
[ "${FOUNDER_APPROVED_332:-}" = yes ] || { echo "Set FOUNDER_APPROVED_332=yes only after written approval on #332" >&2; exit 1; }

# STEP 1: forget production-only version numbers whose content shipped under a repo file of the same name.
supabase migration repair --linked --status reverted \
  20260813010016 \
  20260813015442 \
  20260813023904 \
  20260813025319 \
  20260813025339 \
  20260813053302 \
  20260813075322 \
  20260813084219 \
  20260813085445 \
  20260813090712 \
  20260813105817 \
  20260813124156 \
  20260814002421 \
  20260814034305 \
  20260814085609 \
  20260819171845 \
  20260819173416 \
  20260901064255 \
  20260901064346 \
  20260901064411 \
  20260901064423 \
  20260901064848 \
  20260901064908 \
  20260901064926 \
  20260901064937 \
  20260901065011 \
  20260901065043 \
  20260901071944 \
  20260901072125 \
  20260901072159 \
  20260901072600 \
  20260901073304 \
  20260901073317 \
  20260901073330 \
  20260901073349 \
  20260901090148 \
  20260901113706 \
  20260904115039 \
  20260904121425 \
  20260904121942 \
  20260905083931 \
  20260915121058 \
  20260915134115 \
  20260915153758 \
  20260915153822 \
  20260915160402 \
  20260915184755 \
  20260915184808 \
  20260915184822 \
  20260915184836 \
  20260915185110 \
  20260915185158 \
  20260919223104 \
  20260926063633 \
  20260926064502 \
  20260926071020

# STEP 2: record repo versions whose content is already present in production.
supabase migration repair --linked --status applied \
  20260813023000 \
  20260813055000 \
  20260813080000 \
  20260813083000 \
  20260813083100 \
  20260813090000 \
  20260813153000 \
  20260813160000 \
  20260813163000 \
  20260813170000 \
  20260813180000 \
  20260814060000 \
  20260814083000 \
  20260814090000 \
  20260818000100 \
  20260818000200 \
  20260818000300 \
  20260819154000 \
  20260829000100 \
  20260829000200 \
  20260829000300 \
  20260830000100 \
  20260830000200 \
  20260830000300 \
  20260830000400 \
  20260830000500 \
  20260830000600 \
  20260830000700 \
  20260830000800 \
  20260830000900 \
  20260830001000 \
  20260830113100 \
  20260830113200 \
  20260901000100 \
  20260901000200 \
  20260901000300 \
  20260904000100 \
  20260904000200 \
  20260905000100 \
  20260915000600 \
  20260915000700 \
  20260915144000 \
  20260915144600 \
  20260915160000 \
  20260915170000 \
  20260915170500 \
  20260915171000 \
  20260915171500 \
  20260920000100 \
  20260926071500 \
  20260926081000 \
  20260926090000

# STEP 3 (schema change; rehearse on a restored copy first):
# 20260915172000_customer_value_pilot_evidence_gates is NOT in production. Missing:
# customer_success_reviews.customer_confirmed_value / confirmed_decision_event_id /
# confirmed_second_use_assessment_id, the evidence check constraint, and the
# validate_customer_confirmed_value_evidence() function + trigger. After steps 1-2,
# `supabase db push --linked --include-all` pushes only that file.
supabase migration list --linked
