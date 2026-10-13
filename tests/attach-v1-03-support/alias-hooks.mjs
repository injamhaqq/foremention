// Chat03 test-only module hooks: resolve the "@/..." path alias used by app
// routes, and swap the request-scoped auth/data modules for in-memory stubs
// so billing routes can be exercised at runtime without Next.js.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);
const stubs = {
  "@/lib/auth": new URL("./stub-auth.mjs", import.meta.url).href,
  "@/lib/data": new URL("./stub-data.mjs", import.meta.url).href,
};

export async function resolve(specifier, context, next) {
  if (stubs[specifier]) return { url: stubs[specifier], shortCircuit: true };
  if (specifier === "next/server") return { url: new URL("./stub-next-server.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const base = fileURLToPath(new URL(specifier.slice(2), root));
    const found = [base + ".ts", base + ".tsx", base + "/index.ts", base].find((candidate) => existsSync(candidate));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  return next(specifier, context);
}
