export type ApplicationEmailStatus = {
  available: false;
  label: "Not connected";
  reason: string;
};

export function getApplicationEmailStatus(): ApplicationEmailStatus {
  return {
    available: false,
    label: "Not connected",
    reason: "Authentication email is separate. Application alerts require a dedicated delivery provider and a completed production delivery test.",
  };
}
