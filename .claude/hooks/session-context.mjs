import { execFileSync } from "node:child_process";

let head = "unknown";
try {
  head = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}

process.stdout.write(`Foremention session contract (HEAD ${head})\n`);
process.stdout.write("- VISUAL FIRST: before material UI/product/brand/SEO changes, show the founder the intended visual and explain the change, then implement.\n");
process.stdout.write("- Exact canonical Foremention logo + wordmark are locked; never retype or redraw them.\n");
process.stdout.write("- Product architecture: Attention -> Questions -> Records -> Comparisons -> Settings.\n");
process.stdout.write("- Source X-Ray is retired as a standalone surface; evidence inspection lives inside Recommendation Records.\n");
process.stdout.write("- Preserve causal restraint, explicit evidence states, auth/RLS/privacy boundaries, and no fake traction.\n");
process.stdout.write("- Use RED -> GREEN -> VERIFY and merge/deploy only an exact verified SHA.\n");
