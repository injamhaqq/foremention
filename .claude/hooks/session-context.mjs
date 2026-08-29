import { execFileSync } from "node:child_process";

let head = "unknown";
try {
  head = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}

process.stdout.write(`Foremention session contract (HEAD ${head})\n`);
process.stdout.write("- VISUAL FIRST only when proposing a new visual direction; do not create identity work unless the founder explicitly requests and approves it.\n");
process.stdout.write("- The previously introduced custom Foremention logo/mark/wordmark identity is RETIRED: never restore, redraw, trace, recolor, invert, derive, or ship it, including white/reverse variants. Use only neutral text `Foremention` where a label is required.\n");
process.stdout.write("- Product architecture: Attention -> Questions -> Records -> Comparisons -> Settings.\n");
process.stdout.write("- Source X-Ray is retired as a standalone surface; evidence inspection lives inside Recommendation Records.\n");
process.stdout.write("- Preserve causal restraint, explicit evidence states, auth/RLS/privacy boundaries, and no fake traction.\n");
process.stdout.write("- Use RED -> GREEN -> VERIFY and merge/deploy only an exact verified SHA.\n");
