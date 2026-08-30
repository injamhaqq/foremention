export type RetentionHealthStatus = "not_activated" | "waiting_for_second_cycle" | "needs_schedule" | "at_risk" | "healthy";

export type RetentionHealthInput = {
  activated: boolean;
  secondComparableCycleCompleted: boolean;
  scheduleEnabled: boolean;
  overdueActionCount: number;
};

export type RetentionHealth = {
  status: RetentionHealthStatus;
  label: string;
  reason: string;
};

/**
 * A deliberately transparent state machine, not a proprietary score.
 * Every status maps to an inspectable product fact and can be explained to the customer.
 */
export function deriveRetentionHealth(input: RetentionHealthInput): RetentionHealth {
  if (!input.activated) {
    return { status: "not_activated", label: "Activation incomplete", reason: "The account has not yet completed the owned-action activation boundary." };
  }
  if (input.overdueActionCount > 0) {
    return { status: "at_risk", label: "Needs attention", reason: `${input.overdueActionCount} owned action${input.overdueActionCount === 1 ? " is" : "s are"} overdue.` };
  }
  if (!input.secondComparableCycleCompleted) {
    return { status: "waiting_for_second_cycle", label: "Build the second cycle", reason: "Activation is complete, but a second exact-comparable reviewed measurement has not completed yet." };
  }
  if (!input.scheduleEnabled) {
    return { status: "needs_schedule", label: "Make it repeatable", reason: "A second comparable cycle exists, but recurring measurement is not enabled." };
  }
  return { status: "healthy", label: "Retained workflow", reason: "The account has an owned action, a second comparable reviewed cycle, no overdue owned actions, and recurring measurement enabled." };
}
