# Verified migration-ledger SQL content fingerprints — 27 September 2026

> **READ-ONLY EVIDENCE; NOT A PRODUCTION REPAIR AUTHORIZATION.** Source repository `fa02df24aca99e167c27a1736cf39cb8fd60c1bb` (`main` when inspected). Compared connected existing production's `supabase_migrations.schema_migrations` ledger with all checked-in `supabase/migrations/*.sql` blob objects. No raw production SQL, credentials, customer records, or backup content are in this document.

## Verified inventory and evidence classes

| Evidence class | Remote ledger rows |
| --- | ---: |
| Ledger-recorded statement exactly matches a repository file's **Git blob SHA-1** | **36** |
| Remote ledger text **plus exactly one trailing LF** matches a repository file's Git blob SHA-1 | **33** |
| No whole-file match under either strict variant | **27** |
| **Total production ledger rows** | **96** |

There are **93** checked-in SQL files, of which **67** have at least one strict content-match counterpart and **26** do not. **34** matched remote rows have differing repository version/name labels. The historical inventory's **69** shared names is a **separate** name-based count; it must not be conflated with content identity. All 96 ledger rows were independently verified to contain **one nonempty statement-array element** and **no recorded rollback SQL**.

The SHA-1 checks use actual Git object encoding: `SHA1("blob " + UTF8_BYTE_LENGTH(sql) + NUL + UTF8(sql))` and independently compare the returned digest against GitHub's blob object `sha`. The newline-only class hashes `remote_sql || LF`. This is evidence of **ledger-recorded text identity**, not proof that each recorded statement was successfully executed, not proof of currently identical schema, and not a basis for blindly repairing history. SHA-1 is Git's existing blob identifier, not a new security integrity primitive.

**Duplicate remote content:** `20260813025319_source_snapshot_privilege_hardening` and `20260813025339_source_snapshot_privilege_hardening` share the same recorded SQL hash. Likewise `20260904121425_acquisition_outreach_control` and `20260904121942_acquisition_outreach_control` share a hash. Duplicate recorded text is not independent evidence of duplicated successful SQL effects.

## Byte-identical SQL in ledger and Git repository (36 records)

| Remote ledger version and name | Repository migration | Git blob object ID |
| --- | --- | --- |
| `20260719000100_initial_schema` | `20260719000100_initial_schema.sql` | `a5ea0f3f254235d44885be6d258aa1e03bbe892e` |
| `20260722000100_recommendation_graph` | `20260722000100_recommendation_graph.sql` | `55e30f2002b82eba5ecffb6d2fb550840dac62b2` |
| `20260724000100_free_beta_usage_controls` | `20260724000100_free_beta_usage_controls.sql` | `18ddbb0958ad536f58fdcbc27226c88c2e65bdd3` |
| `20260728000100_live_collection_hardening` | `20260728000100_live_collection_hardening.sql` | `4f6de22d67b3538c233f3ff82f5371eda1384b9d` |
| `20260729000100_collaboration_lifecycle_alerts` | `20260729000100_collaboration_lifecycle_alerts.sql` | `2184cabcb9f964a9c2dd360dbb318aa583c57a02` |
| `20260729000110_collaboration_lifecycle_alerts` | `20260729000110_collaboration_lifecycle_alerts.sql` | `cd9b5ffbb3ece93b6999472a91f24585c6dd37b0` |
| `20260729000200_service_role_background_permissions` | `20260729000200_service_role_background_permissions.sql` | `8a3db36f39ede03088abc55efd0d991cda37af40` |
| `20260729000300_source_observation_upsert_fix` | `20260729000300_source_observation_upsert_fix.sql` | `25b23bc65deeee77b163b8d9d91f1732bc20102d` |
| `20260802000100_active_run_duplicate_prevention` | `20260802000100_active_run_duplicate_prevention.sql` | `8c44363c59a8de91d86bf21241e0ed021fc24d5e` |
| `20260802000200_source_monitoring` | `20260802000200_source_monitoring.sql` | `98fe4eef79fb7d73e5e63fb26ca2ad668bb48829` |
| `20260802000300_claim_evidence_links` | `20260802000300_claim_evidence_links.sql` | `4b3b8f688056f8a18109cb424c43aba9848f1d64` |
| `20260802000400_claim_verification_workflow` | `20260802000400_claim_verification_workflow.sql` | `bacbd8f7c3f2855a70630f59f309873ac9e6dddc` |
| `20260802000500_application_email_alerts` | `20260802000500_application_email_alerts.sql` | `b935d7834105e5f6a3ace99c3b3f604ff247b5f0` |
| `20260802000600_workspace_webhooks` | `20260802000600_workspace_webhooks.sql` | `da3be56b4f2927b7d1ceca5e9f75fdf8d1a1847b` |
| `20260802000700_workspace_comments` | `20260802000700_workspace_comments.sql` | `65bc64120455fce9bbb3baeea2be860b8fa465dc` |
| `20260802000800_hubspot_activity_connector` | `20260802000800_hubspot_activity_connector.sql` | `0863ae3170f05273b04885781eff888c8dc61679` |
| `20260802000900_public_visibility_reports` | `20260802000900_public_visibility_reports.sql` | `21e321652b5a34d4eec9dbf00715a78d707e255a` |
| `20260802001000_gdpr_data_deletion` | `20260802001000_gdpr_data_deletion.sql` | `4f3c6ec0bcbfc37e4f2b6bab6eff319410a056c5` |
| `20260804000100_resolution_engine` | `20260804000100_resolution_engine.sql` | `e6c8535a5dfe20bf38203693eab966218367d8a4` |
| `20260810142217_production_drift_hardening` | `20260810142217_production_drift_hardening.sql` | `6ab6d0ea6e44d2ab309934dc9f34f7d1e6fe0c2a` |
| `20260810142520_production_drift_performance_cleanup` | `20260810142520_production_drift_performance_cleanup.sql` | `1750c274154aa183e2d91aaa83298e6f66a1711e` |
| `20260813023904_source_snapshot_admin_policy` | `20260813083100_source_snapshot_admin_policy.sql` | `60da14a1ff39ffbbb3950164583174ff048228ec` |
| `20260814085609_live_foreign_key_indexes` | `20260814083000_live_foreign_key_indexes.sql` | `3b189bac2cbc6759f95aa9a08c3fead6d1817e77` |
| `20260819173416_service_only_run_rpc_actor_context` | `20260819154000_service_only_run_rpc_actor_context.sql` | `0d8e108236d0dc2303bb1e97bd7328537774cdc2` |
| `20260901064255_security_performance_advisor_hardening_main_2c306677` | `20260818000200_security_performance_advisor_hardening.sql` | `ecbc248543d2f4c62073a74364963f0a867e6338` |
| `20260901090148_measurement_moat_foundation_main_893e850c` | `20260901000200_measurement_moat_foundation.sql` | `c77af23f1e5d5c82ebcf708a4272fcf18bd68874` |
| `20260902000100_decision_intelligence_v1` | `20260902000100_decision_intelligence_v1.sql` | `2954d40c8dfe9282148c881c1023f6033e5bea10` |
| `20260902000200_next_best_design_partner_learning_v1` | `20260902000200_next_best_design_partner_learning_v1.sql` | `eed3ecfb4e2b5b9802449d7424a8dc068c1ba500` |
| `20260918000100_operating_agent_action_ledger` | `20260918000100_operating_agent_action_ledger.sql` | `0427c5826bb6a310ed18df15f610605e6359d563` |
| `20260918000200_agent_reasoning_runtime` | `20260918000200_agent_reasoning_runtime.sql` | `13bbc3fb08aef14dee78fda0a945b756fb1f316e` |
| `20260918000300_agent_action_execution` | `20260918000300_agent_action_execution.sql` | `edc1cb028ce75fff3ddfb43bde5b991e699b3002` |
| `20260918000400_support_agent` | `20260918000400_support_agent.sql` | `82a1a672680bbef1da234f86ce0ade9b5efc0204` |
| `20260919223104_source_map_review_monotonicity` | `20260920000100_source_map_review_monotonicity.sql` | `c8c5de18200b76a66e212962e235e3e4b813e630` |
| `20260926063633_company_operational_cost_readiness_20260926` | `20260926071500_company_operational_cost_readiness.sql` | `a50fe5ad2458cfdf63fb14a24e3d245a24a9e167` |
| `20260926064502_company_cost_view_read_grants_20260926` | `20260926081000_company_cost_view_read_grants.sql` | `712fe4ed61096b4660e8366b21f302dff4f0007d` |
| `20260926071020_support_ticket_auth_rls_initplan_20260926` | `20260926090000_support_ticket_auth_rls_initplan.sql` | `8b0d139492fad292d87f40a8b53d6d55d4106200` |

## Same SQL after **appending one trailing LF** (33 records)

These are byte-level candidate matches under exactly one documented formatting change. No SQL-comments, whitespace inside string literals, DDL order, or statement semantics were normalized.

| Remote ledger version and name | Repository migration | Git blob object ID |
| --- | --- | --- |
| `20260811044941_tenant_relation_integrity` | `20260811044941_tenant_relation_integrity.sql` | `6da7edb767d6e65cf7ea5b57ef613fac5fa42f31` |
| `20260813015442_source_snapshot_engine` | `20260813080000_source_snapshot_engine.sql` | `9c71c488ef993bc8152616114c9a8b756ab062b8` |
| `20260813025319_source_snapshot_privilege_hardening` | `20260813090000_source_snapshot_privilege_hardening.sql` | `aec1b5fc015aeadc77a12a287fbac04e99056fa5` |
| `20260813025339_source_snapshot_privilege_hardening` | `20260813090000_source_snapshot_privilege_hardening.sql` | `aec1b5fc015aeadc77a12a287fbac04e99056fa5` |
| `20260813075322_provider_cost_event_guard` | `20260813083000_provider_cost_event_guard.sql` | `34222481233f5f9c817cf6969f5ab38fe48e870a` |
| `20260813105817_inngest_runtime_probe` | `20260813170000_inngest_runtime_probe.sql` | `9bc606d3b1e44c5217c5c7afaafdea22164158ff` |
| `20260813124156_signup_security_attestation` | `20260813180000_signup_security_attestation.sql` | `83b4e297b0300aa229cc70da84b4716ccb587fa5` |
| `20260814034305_operator_alert_monitoring` | `20260814090000_operator_alert_monitoring.sql` | `27993c6b8ec1c570f4888321d4a8cd71de64a7a4` |
| `20260819171845_source_review_truth_release_9b335547` | `20260818000300_source_review_truth.sql` | `47a6c12e95d007261b63feef785d83cd054faecb` |
| `20260901071944_icp_category_evidence_main_7f591ad4` | `20260901000100_icp_category_evidence.sql` | `56f1c1184b05e44344334bd3018e796733c1a97c` |
| `20260901072125_outcomes_value_customer_success_main_7f591ad4` | `20260830000600_outcomes_value_customer_success.sql` | `21ac96b790e0f4ec0e88dc0f5feafa02b1c2b095` |
| `20260901072159_outcome_ledger_backfill_main_7f591ad4` | `20260830000700_outcome_ledger_backfill.sql` | `aec42f2f8b2bb423423ab108aecc8ec58d3d76aa` |
| `20260901072600_ai_measurement_context_main_7f591ad4` | `20260830113200_ai_measurement_context.sql` | `4f591616cf201101d90a0738429b9032f6e62df0` |
| `20260901073317_audit_log_hardening_main_0e0dcb82` | `20260830000900_audit_log_hardening.sql` | `5fa1edef8414e2e406ab3ae6d9e3fed4bf3ab57d` |
| `20260901073330_enterprise_fail_closed_hardening_main_0e0dcb82` | `20260830001000_enterprise_fail_closed_hardening.sql` | `6dab0b7ba1d86a465ea30eb875b3366a3f220037` |
| `20260901073349_scale_unit_economics_observability_main_0e0dcb82` | `20260830113100_scale_unit_economics_observability.sql` | `c9995cfae9e5706f147e871331a3c1bec9f10693` |
| `20260901113706_change_specification_domain_main_4139f817` | `20260901000300_change_specification_domain.sql` | `43ec526cae94ef26986767b62f05577ad95c62a5` |
| `20260904121425_acquisition_outreach_control` | `20260904000200_acquisition_outreach_control.sql` | `2a962aded7a0e266d4d748f73f64997dce6cad6a` |
| `20260904121942_acquisition_outreach_control` | `20260904000200_acquisition_outreach_control.sql` | `2a962aded7a0e266d4d748f73f64997dce6cad6a` |
| `20260905083931_acquisition_zoho_mail_canaries` | `20260905000100_acquisition_zoho_mail_canaries.sql` | `7d427ca1a6bc46687940bd3eaa8bbf2978dfa18f` |
| `20260914000100_core_tenant_relation_integrity` | `20260914000100_core_tenant_relation_integrity.sql` | `bb6f7b2bb17daa24f29ada78372fda2e0e2f6745` |
| `20260914000200_foundation_budget_alignment` | `20260914000200_foundation_budget_alignment.sql` | `b2c5abf4aa17d0b47ff3778e7cb021ffe366ef67` |
| `20260914000300_run_accounting_role_alignment` | `20260914000300_run_accounting_role_alignment.sql` | `f0a5abaa15a6175f45b4a9d8ff6c2a3d42281eee` |
| `20260915000100_source_map_review_state` | `20260915000100_source_map_review_state.sql` | `aaafa706dfff53d4d0d9cc5e704640328edb5d2c` |
| `20260915000300_performance_advisor_cleanup` | `20260915000300_performance_advisor_cleanup.sql` | `2acc7956ca8d31c3a4f24ed002742a037f60691f` |
| `20260915000400_decision_learning_production_parity` | `20260915000400_decision_learning_production_parity.sql` | `7f89ccaa1886dafe7857709757e1996d51a6a823` |
| `20260915000500_design_partner_trigger_execute_hardening` | `20260915000500_design_partner_trigger_execute_hardening.sql` | `7fb272680cd0167dd0569cb5d8ff204cd2a20fbc` |
| `20260915121058_remove_redundant_single_tenant_fks` | `20260915000600_remove_redundant_single_tenant_fks.sql` | `ee1c8d9c4d3ee743c7f857d894e5c3e5938d375e` |
| `20260915134115_source_snapshot_evidence_excerpt` | `20260915000700_source_snapshot_evidence_excerpt.sql` | `4e088e7bbb3768bf74d51c5fee968367fe1288ce` |
| `20260915160402_atomic_prompt_versioning` | `20260915160000_atomic_prompt_versioning.sql` | `91328d211094e7f0438572e66deef62491751d39` |
| `20260915184808_comparability_context_hardening` | `20260915170500_comparability_context_hardening.sql` | `9aa421fc9bd3a0667a302e441106de9880f93d7a` |
| `20260915184822_operator_run_diagnostics` | `20260915171000_operator_run_diagnostics.sql` | `54db30b48aaff647fc1631dee493631b8e5769e7` |
| `20260915184836_provider_attempt_cost_ledger` | `20260915171500_provider_attempt_cost_ledger.sql` | `7e8410abaa5e727bd4ebb406a8d642a9340191e2` |

## Unmatched production ledger records (27)

**27 unmatched remote** entries and **26 unmatched local** files remain for manual statement-level and resulting-schema investigation.

**UNRESOLVED:** A shared title below is only a search hint. Different statement length or name cannot establish execution equivalence.

| Recorded production version and name | Candidate local filename(s) by name only |
| --- | --- |
| `20260811045535_verified_claim_evidence_delete_semantics` | `20260811045535_verified_claim_evidence_delete_semantics.sql` (byte difference -223) |
| `20260813010016_rls_auth_initplan_hardening` | `20260813023000_rls_auth_initplan_hardening.sql` (byte difference -410) |
| `20260813033833_suppress_legacy_ungated_movement_alerts` | `20260813033833_suppress_legacy_ungated_movement_alerts.sql` (byte difference -196) |
| `20260813053302_foreign_key_performance_indexes` | `20260813055000_foreign_key_performance_indexes.sql` (byte difference -228) |
| `20260813084219_reviewed_opportunity_bridge_unique` | `20260813153000_reviewed_opportunity_bridge_unique.sql` (byte difference -369) |
| `20260813085445_resolution_exact_comparability` | `20260813160000_resolution_exact_comparability.sql` (byte difference -366) |
| `20260813090712_resolution_evidence_snapshot_provenance` | `20260813163000_resolution_evidence_snapshot_provenance.sql` (byte difference -345) |
| `20260814002421_placement_events_org_fk_index_20260814` | No name-equivalent repository file |
| `20260816192504_tighten_service_only_run_rpcs` | `20260816192504_tighten_service_only_run_rpcs.sql` (byte difference -251) |
| `20260901064346_company_customer_proof_main_2c306677` | No name-equivalent repository file |
| `20260901064411_retention_loop_v1_main_2c306677` | No name-equivalent repository file |
| `20260901064423_design_partner_applications_main_2c306677` | No name-equivalent repository file |
| `20260901064848_billing_webhook_events_main_2c306677` | No name-equivalent repository file |
| `20260901064908_design_partner_submission_limits_main_2c306677` | No name-equivalent repository file |
| `20260901064926_apply_billing_event_atomic_main_2c306677` | No name-equivalent repository file |
| `20260901064937_customer_proof_research_events_main_2c306677` | No name-equivalent repository file |
| `20260901065011_commercial_engine_main_2c306677` | No name-equivalent repository file |
| `20260901065043_billing_commercial_hardening_main_2c306677` | No name-equivalent repository file |
| `20260901073304_enterprise_security_governance_main_0e0dcb82` | No name-equivalent repository file |
| `20260904115039_acquisition_research_provenance` | `20260904000100_acquisition_research_provenance.sql` (byte difference -510) |
| `20260914000400_security_definer_execute_hardening` | `20260914000400_security_definer_execute_hardening.sql` (byte difference -369) |
| `20260915000200_private_org_permission_helper` | `20260915000200_private_org_permission_helper.sql` (byte difference -350) |
| `20260915153758_workspace_deletion_graph_hardening` | `20260915144000_workspace_deletion_graph_hardening.sql` (byte difference -1134) |
| `20260915153822_workspace_deletion_remaining_check_fix` | `20260915144600_workspace_deletion_remaining_check_fix.sql` (byte difference -144) |
| `20260915184755_evidence_semantics_hardening` | `20260915170000_evidence_semantics_hardening.sql` (byte difference -205) |
| `20260915185110_qualified_paid_pilot_evidence_view` | No name-equivalent repository file |
| `20260915185158_customer_value_validation_evidence_compat` | No name-equivalent repository file |

## Local migration files without strict content matches (26)

- `20260811045535_verified_claim_evidence_delete_semantics.sql`
- `20260813023000_rls_auth_initplan_hardening.sql`
- `20260813033833_suppress_legacy_ungated_movement_alerts.sql`
- `20260813055000_foreign_key_performance_indexes.sql`
- `20260813153000_reviewed_opportunity_bridge_unique.sql`
- `20260813160000_resolution_exact_comparability.sql`
- `20260813163000_resolution_evidence_snapshot_provenance.sql`
- `20260814060000_placement_events_organization_index.sql`
- `20260816192504_tighten_service_only_run_rpcs.sql`
- `20260818000100_company_customer_proof.sql`
- `20260829000100_retention_loop_v1.sql`
- `20260829000200_design_partner_applications.sql`
- `20260829000300_billing_webhook_events.sql`
- `20260830000100_design_partner_submission_limits.sql`
- `20260830000200_apply_billing_event_atomic.sql`
- `20260830000300_customer_proof_research_events.sql`
- `20260830000400_commercial_engine.sql`
- `20260830000500_billing_commercial_hardening.sql`
- `20260830000800_enterprise_security_governance.sql`
- `20260904000100_acquisition_research_provenance.sql`
- `20260914000400_security_definer_execute_hardening.sql`
- `20260915000200_private_org_permission_helper.sql`
- `20260915144000_workspace_deletion_graph_hardening.sql`
- `20260915144600_workspace_deletion_remaining_check_fix.sql`
- `20260915170000_evidence_semantics_hardening.sql`
- `20260915172000_customer_value_pilot_evidence_gates.sql`

## Evidence required before reconciliation

1. Privately preserve the **versioned 96-row ledger snapshot with actual statement text** and source/extraction attestations in access-controlled backup storage; this public review contains only hashes, names, and classification. Do not treat GitHub as that private snapshot.
2. For each of the **27 unmatched remote rows and 26 unmatched local files**, perform a **many-to-many** review of SQL statements, comment-only differences, renames, split/combined migrations and intended postconditions. Record exact source blobs and reviewer decision; do not mark unknown entries as unapplied based on names.
3. Capture an approved production backup/restore path, with independent **test restore**, retention, responsible operator and rollback rehearsal. Production ledger contains no rollback SQL. Verify current tenant RLS policies, grants, trigger/function definitions, extension and advisor findings against a staging clone.
4. Present the proposed history repair as a reviewed, version-by-version diff. A history mark is bookkeeping only and cannot truthfully claim DDL happened. Require explicit owner authorization before any repair or an automated production migration push.
5. PR #352's nine-field `validate_resolution_follow_up()` correction remains **staged only**; generate a new forward migration in a trusted CLI-enabled environment **after** this evidence and backup review. The existing live trigger remains uncorrected for per-answer material context until then.

## Read-only fingerprint procedure

Run this SELECT on the exact connected production project only with authorized access. It returns object fingerprints, not statement bodies, and does not mutate the database:

```sql
select version,name,
 encode(extensions.digest(
   convert_to('blob '||octet_length(statements[1])::text,'UTF8')
   ||decode('00','hex')||convert_to(statements[1],'UTF8'),'sha1'),'hex')
   as raw_git_blob_sha,
 encode(extensions.digest(
   convert_to('blob '||octet_length(statements[1]||E'\n')::text,'UTF8')
   ||decode('00','hex')||convert_to(statements[1]||E'\n','UTF8'),'sha1'),'hex')
   as append_lf_git_blob_sha
from supabase_migrations.schema_migrations
order by version;
```

Store a **private hash-only** JSON snapshot **outside the repository** in the shape `{ "schemaVersion": 1, "records": [{ "version": "...", "name": "...", "raw_git_blob_sha": "...", "append_lf_git_blob_sha": "..." }] }` (fill with the authorized read-only query results, never raw statements). In a checkout of the pinned commit, run `node scripts/audit/compare-migration-fingerprints.mjs --snapshot /private/ledger-hashes.local.json` to regenerate deterministic classifications. The script does not connect to production, accept raw SQL, or authorize repair.

Compare only against Git blob `sha` values at the pinned commit above. **Do not publish the ledger's raw SQL** and do not grant new database rights merely to run this audit.

_This document is a repeatable evidence checkpoint; issue #332 remains open._
