// Chat06 test support: executes an Inngest function handler the way the
// Inngest executor does — the handler is re-invoked from the top for every new
// step, memoized step results are returned without re-running their bodies,
// and code OUTSIDE step.run re-executes on every replay. That re-execution is
// exactly where non-idempotent side effects hide.
import { NonRetriableError } from "inngest";

class StepInterrupt extends Error {}

export async function runWithReplay(handler, { event, maxInvocations = 500, stepRetries = 2, afterStep } = {}) {
  const memo = new Map();
  const executedOrder = [];
  let invocations = 0;
  const attempts = new Map();
  for (;;) {
    if (++invocations > maxInvocations) throw new Error("Replay harness exceeded invocation budget");
    let executedThisInvocation = false;
    let inFlight = null;
    const seen = new Map();
    const uniqueId = (id) => {
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      return n ? `${id}:${n}` : id;
    };
    const runStep = async (rawId, fn) => {
      const id = uniqueId(rawId);
      if (memo.has(id)) {
        const entry = memo.get(id);
        if (entry.error) throw entry.error;
        return entry.value;
      }
      if (executedThisInvocation) throw new StepInterrupt();
      executedThisInvocation = true;
      let release;
      inFlight = new Promise((resolve) => { release = resolve; });
      try {
        const value = await fn();
        memo.set(id, { value: value === undefined ? null : JSON.parse(JSON.stringify(value)) });
        executedOrder.push(id);
      } catch (error) {
        const attempt = (attempts.get(id) ?? 0) + 1;
        attempts.set(id, attempt);
        if (error instanceof NonRetriableError || attempt > stepRetries) {
          memo.set(id, { error });
          executedOrder.push(id + "!error");
        }
      }
      if (afterStep) await afterStep(id, memo);
      release();
      throw new StepInterrupt();
    };
    const step = {
      run: runStep,
      sendEvent: (id, payload) => runStep(id, async () => ({ ids: [payload.id ?? id] })),
      sleep: (id) => runStep(id, async () => null),
    };
    try {
      const result = await handler({ event, step, attempt: 0 });
      return { result, invocations, executedOrder, memo };
    } catch (error) {
      if (error instanceof StepInterrupt) { if (inFlight) await inFlight; continue; }
      error.replay = { invocations, executedOrder };
      throw error;
    }
  }
}
