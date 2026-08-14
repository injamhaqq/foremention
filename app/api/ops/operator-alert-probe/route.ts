import { env } from "cloudflare:workers";
import { getOperatorAlertDelivery, operatorAlertPublicState, sendOperatorAlertProbe } from "@/lib/operator-alerts";

const BUILD_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const NO_STORE = { "Cache-Control": "no-store" };

type RuntimeBindings = {
  FOREMENTION_BUILD_COMMIT?: string;
};

function resolveCurrentBuild() {
  const bindings = env as unknown as RuntimeBindings;
  const buildCommit = String(bindings.FOREMENTION_BUILD_COMMIT || "").trim().toLowerCase();
  if (!BUILD_COMMIT_PATTERN.test(buildCommit)) throw new Error("invalid_build_commit");
  return buildCommit;
}

export async function GET() {
  try {
    const buildCommit = resolveCurrentBuild();
    const delivery = await getOperatorAlertDelivery(buildCommit);
    return Response.json({ buildCommit, ...operatorAlertPublicState(delivery) }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: "The operator alert probe status is unavailable." }, { status: 503, headers: NO_STORE });
  }
}

export async function POST() {
  try {
    // Deliberately accepts no request body, query parameters, recipient, message,
    // customer identifier, or SHA. The build comes only from the live Worker binding.
    const buildCommit = resolveCurrentBuild();
    const delivery = await sendOperatorAlertProbe(buildCommit);
    const state = operatorAlertPublicState(delivery);
    const status = state.status === "sent" ? 200 : state.status === "failed" ? 503 : 202;
    return Response.json({ buildCommit, ...state }, { status, headers: NO_STORE });
  } catch {
    return Response.json({ error: "The controlled operator alert probe could not be completed." }, { status: 503, headers: NO_STORE });
  }
}
