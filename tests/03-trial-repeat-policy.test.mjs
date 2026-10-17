import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planTrialFollowUp,
  admitRepeatDispatch,
  MIN_TRIAL_REPEAT_GAP_MS,
  TRIAL_COMPLETION_BUFFER_MS,
} from '../lib/trial-repeat-policy.ts';

const start = '2026-10-16T00:00:00.000Z';
const expiry = '2026-10-23T00:00:00.000Z';
const makePlan = (overrides = {}) => planTrialFollowUp({
  baselineStatus: 'complete', baselineCompletedAt: start,
  trialExpiresAt: expiry, now: '2026-10-16T01:00:00.000Z',
  billingSource: 'trial', entitlementStatus: 'active', ...overrides,
});
const makeAdmission = (overrides = {}) => admitRepeatDispatch({
  enabled: true, origin: 'trial', pinned: true, now: '2026-10-20T00:00:00.000Z',
  trialExpiresAt: expiry, currentBillingSource: 'trial', currentEntitlementStatus: 'active',
  remainingObservationUnits: 10, requestedObservationUnits: 5, ...overrides,
});

test('successful baseline gets a short-interval trial follow-up, not a weekly boundary', () => {
  assert.deepEqual(makePlan(), { eligible: true, dueAt: '2026-10-19T00:00:00.000Z' });
});
test('fixed clock: just before trial completion cutoff, exact boundary, and after expiry', () => {
  const cutoff = new Date(Date.parse(expiry) - TRIAL_COMPLETION_BUFFER_MS).toISOString();
  assert.equal(makeAdmission({ now: new Date(Date.parse(cutoff)-1).toISOString() }).eligible, true);
  assert.equal(makeAdmission({ now: cutoff }).eligible, false);
  assert.equal(makeAdmission({ now: expiry }).reason, 'TRIAL_WINDOW_EXPIRED');
});
test('late baseline schedules only if minimum repeat gap and headroom are possible', () => {
  const at = new Date(Date.parse(expiry) - MIN_TRIAL_REPEAT_GAP_MS - TRIAL_COMPLETION_BUFFER_MS - 1).toISOString();
  const possible = makePlan({ baselineCompletedAt: at, now: at });
  assert.equal(possible.eligible, true);
  const tooLate = new Date(Date.parse(at) + 2).toISOString();
  assert.equal(makePlan({ baselineCompletedAt: tooLate, now: tooLate }).reason, 'TRIAL_WINDOW_TOO_SHORT');
});
test('failed baseline, partial, cancelled, still running and missing completion are ineligible', () => {
  for (const status of ['failed', 'partial', 'cancelled', 'review', 'queued', 'running']) {
    assert.equal(makePlan({ baselineStatus: status }).reason, 'BASELINE_INCOMPLETE');
  }
  assert.equal(makePlan({ baselineCompletedAt: null }).reason, 'BASELINE_INCOMPLETE');
});
test('unknown or lapsed entitlement and expired trial never create a future repeat', () => {
  assert.equal(makePlan({ billingSource: 'trial_expired' }).reason, 'TRIAL_NOT_ACTIVE');
  assert.equal(makePlan({ entitlementStatus: 'inactive' }).reason, 'TRIAL_NOT_ACTIVE');
  assert.equal(makePlan({ trialExpiresAt: 'bad' }).reason, 'ENTITLEMENT_UNKNOWN');
  assert.equal(makePlan({ now: expiry }).reason, 'TRIAL_WINDOW_EXPIRED');
});
test('timezone-independent ISO instants and exact cutoff keep the same UTC contract', () => {
  const p = makePlan({ now: '2026-10-16T07:00:00+06:00' });
  assert.deepEqual(p, makePlan({ now: '2026-10-16T01:00:00Z' }));
});
test('delayed dispatch, downgraded Free, or changed paid source cannot borrow trial capacity', () => {
  assert.equal(makeAdmission({ now: expiry }).reason, 'TRIAL_WINDOW_EXPIRED');
  assert.equal(makeAdmission({ currentBillingSource: 'trial_expired', trialExpiresAt: null }).reason, 'ENTITLEMENT_UNKNOWN');
  assert.equal(makeAdmission({ currentBillingSource: 'trial_expired' }).reason, 'TRIAL_WINDOW_EXPIRED');
  assert.equal(makeAdmission({ origin: 'paid', currentBillingSource: 'trial' }).reason, 'ENTITLEMENT_CHANGED');
});
test('disabled/legacy unknown schedules are held; manual founder scheduling remains explicit', () => {
  assert.equal(makeAdmission({ enabled: false }).reason, 'USER_PAUSED');
  assert.equal(makeAdmission({ origin: null }).reason, 'CONTRACT_NOT_PINNED');
  assert.equal(makeAdmission({ pinned: false }).reason, 'CONTRACT_NOT_PINNED');
  assert.equal(makeAdmission({ origin: 'manual', currentBillingSource: 'trial_expired' }).eligible, true);
});
test('exhausted quota, unknown quota and zero-unit requests fail closed', () => {
  assert.equal(makeAdmission({ remainingObservationUnits: 4 }).reason, 'CAPACITY_UNAVAILABLE');
  assert.equal(makeAdmission({ remainingObservationUnits: null }).reason, 'CAPACITY_UNAVAILABLE');
  assert.equal(makeAdmission({ requestedObservationUnits: 0 }).reason, 'CAPACITY_UNAVAILABLE');
});
test('eligible pinned paid schedule with current verified entitlement is admitted', () => {
  assert.equal(makeAdmission({ origin: 'paid', currentBillingSource: 'paddle', trialExpiresAt: null }).eligible, true);
});

const ctx = {
  locale: 'en-US', market: 'global', buyerStage: 'evaluation', promptVersion: 'qv1',
  parserVersion: 'pv1', retrievalVersion: 'rv1', policyVersion: 'pl1', schemaVersion: 'sv1', evaluationVersion: 'ev1',
};
const makeBaseline = (overrides = {}) => ({
  runId: 'baseline-1', status: 'complete', completedAt: '2026-10-16T01:00:00Z',
  methodologyVersion: '3.0', expectedAnswers: 2,
  answers: [
    { promptKey: 'q1', promptText: 'What is the best CRM?', provider: 'groq', model: 'exact-model', measurementContext: ctx },
    { promptKey: 'q2', promptText: 'Which CRM is secure?', provider: 'groq', model: 'exact-model', measurementContext: { ...ctx, promptVersion: 'qv2' } },
  ], ...overrides,
});

test('successful complete baseline pins actual model, methodology and per-question versions', async () => {
  const { pinCompleteBaseline } = await import('../lib/trial-repeat-policy.ts');
  const result = pinCompleteBaseline(makeBaseline());
  assert.equal(result.eligible, true);
  assert.equal(result.pin.model, 'exact-model');
  assert.equal(result.pin.questionPins[1].context.promptVersion, 'qv2');
});
test('baseline pin refuses partial, missing answer, duplicate, changed model, unknown locale and missing versions', async () => {
  const { pinCompleteBaseline } = await import('../lib/trial-repeat-policy.ts');
  const src = makeBaseline();
  const cases = [
    makeBaseline({ status: 'partial' }),
    makeBaseline({ expectedAnswers: 3 }),
    makeBaseline({ answers: [src.answers[0], src.answers[0]] }),
    makeBaseline({ answers: [src.answers[0], { ...src.answers[1], model: 'different-model' }] }),
    makeBaseline({ answers: [src.answers[0], { ...src.answers[1], measurementContext: { ...ctx, locale: null } }] }),
    makeBaseline({ answers: [src.answers[0], { ...src.answers[1], measurementContext: { ...ctx, retrievalVersion: undefined } }] }),
  ];
  for (const input of cases) assert.equal(pinCompleteBaseline(input).eligible, false);
});

test("explicit manual schedule stays bound to the exact original plan and deadline", async () => {
  const { admitManualScheduleAuthorization } = await import("../lib/trial-repeat-policy.ts");
  const pin = { authorizationBillingSource:"trial", authorizationPackageKey:"core", authorizationExpiresAt:expiry };
  const allowed = { pin, currentBillingSource:"trial", currentPackageKey:"core",
    currentExpiresAt:expiry, currentStatus:"active" };
  assert.equal(admitManualScheduleAuthorization({...allowed,at:"2026-10-19T00:00:00Z"}).eligible,true);
  assert.equal(admitManualScheduleAuthorization({...allowed,at:"2026-10-22T22:00:00Z"}).eligible,false);
  assert.equal(admitManualScheduleAuthorization({...allowed,at:"2026-10-24T00:00:00Z",currentBillingSource:"trial_expired"}).eligible,false);
  assert.equal(admitManualScheduleAuthorization({...allowed,at:"2026-10-20T00:00:00Z",currentPackageKey:"signal"}).reason,"ENTITLEMENT_CHANGED");
  assert.equal(admitManualScheduleAuthorization({...allowed,at:"2026-10-20T00:00:00Z",pin:null}).reason,"ENTITLEMENT_UNKNOWN");
  const now=new Date("2026-10-20T00:00:00Z");
  assert.equal(admitManualScheduleAuthorization({pin:{authorizationBillingSource:"founder_grant",authorizationPackageKey:null,authorizationExpiresAt:null},
    currentBillingSource:"founder_grant",currentPackageKey:null,currentExpiresAt:null,currentStatus:"active",at:now}).eligible,true);
});
