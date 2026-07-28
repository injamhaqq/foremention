import { serve } from "inngest/next";
import { cleanupCancelledCollection, inngest, runMultiEngineScan } from "@/lib/jobs/inngest";
export const { GET, POST, PUT } = serve({ client: inngest, functions: [runMultiEngineScan, cleanupCancelledCollection] });
