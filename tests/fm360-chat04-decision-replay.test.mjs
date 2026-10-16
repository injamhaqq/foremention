import assert from 'node:assert/strict';
import test from 'node:test';
import { sameDecisionReplayIdentity, reconcilePersistedDecisionReplay } from '../lib/decision-replay-identity.ts';

const input = {
  baselineRunId: '00000000-0000-4000-8000-000000000101',
  kind: 'change_specification', decisionState: 'TEST_FIRST',
  rationale: 'Synthetic reviewer judged the evidence sufficient for a test.',
  ownerId: null, ownerRole: 'PMM', actionSummary: 'Test proof copy on owned comparison page',
  dueDate: '2026-10-23',
  changeSpecificationId: '00000000-0000-4000-8000-000000000201',
  approve: true,
};
const row = {
  baseline_run_id: input.baselineRunId,
  decision_kind: input.kind, decision_state: input.decisionState,
  rationale: input.rationale, owner_id: input.ownerId, owner_role: input.ownerRole,
  action_summary: input.actionSummary, due_date: input.dueDate,
  change_specification_id: input.changeSpecificationId,
  approved_by: '00000000-0000-4000-8000-000000000301',
  approved_at: '2026-10-16T10:00:00Z',
};

test('exact complete idempotent replay is accepted', () => {
  assert.equal(sameDecisionReplayIdentity(row, input), true);
});

test('each decision material mutation is rejected even with same key and Record', () => {
  for (const [key, value] of [
    ['kind', 'no_action'], ['decisionState', 'DO_NOW'],
    ['rationale', 'Different synthetic rationale'], ['ownerRole', 'Growth'],
    ['actionSummary', 'Different task'], ['dueDate', '2026-10-24'],
    ['changeSpecificationId', null], ['approve', false],
    ['baselineRunId', '00000000-0000-4000-8000-000000000999'],
  ]) {
    assert.equal(sameDecisionReplayIdentity(row, { ...input, [key]: value }), false, key);
  }
});

test('disagreement and no-action need no invented owner/action/approval', () => {
  const request = { ...input, kind: 'no_action', decisionState: 'MONITOR_ONLY',
    ownerRole: null, actionSummary: null, dueDate: null, changeSpecificationId: null, approve: false };
  const stored = { ...row, decision_kind: 'no_action', decision_state: 'MONITOR_ONLY',
    owner_role: null, action_summary: null, due_date: null,
    change_specification_id: null, approved_by: null, approved_at: null };
  assert.equal(sameDecisionReplayIdentity(stored, request), true);
  assert.equal(sameDecisionReplayIdentity({ ...stored, owner_role: 'Invented' }, request), false);
});

test('half-stamped approval cannot pass reconciliation', () => {
  assert.equal(sameDecisionReplayIdentity({ ...row, approved_at: null }, input), false);
  assert.equal(sameDecisionReplayIdentity({ ...row, approved_by: null }, input), false);
});

const scope = { organizationId: 'org-A', projectId: 'project-A' };
const persisted = { ...row, id: 'decision-A', organization_id: 'org-A', project_id: 'project-A' };

test('lost acknowledgment reconciles only identical scoped immutable content', async () => {
  const lookup = async () => [persisted];
  assert.deepEqual(await reconcilePersistedDecisionReplay(lookup, scope, 'savekey', input),
    { state: 'match', id: 'decision-A' });
  assert.deepEqual(await reconcilePersistedDecisionReplay(lookup, scope, 'savekey', {
    ...input, rationale: 'Changed intention with reused save key',
  }), { state: 'conflict' });
});

test('wrong-project row, missing row, duplicates and network errors never imply success', async () => {
  for (const lookup of [
    async () => [{ ...persisted, project_id: 'other-project' }],
    async () => [],
    async () => { throw Error('db temporarily unavailable'); },
  ]) {
    assert.deepEqual(await reconcilePersistedDecisionReplay(lookup, scope, 'savekey', input),
      { state: 'unconfirmed' });
  }
  assert.deepEqual(await reconcilePersistedDecisionReplay(
    async () => [persisted, persisted], scope, 'savekey', input), { state: 'conflict' });
});
