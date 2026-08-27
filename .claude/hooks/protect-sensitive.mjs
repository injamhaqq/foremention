import fs from "node:fs";

const raw = fs.readFileSync(0, "utf8").trim();
const payload = raw ? JSON.parse(raw) : {};
const input = payload.tool_input ?? {};
const candidate = input.file_path ?? input.path ?? input.filePath ?? "";
const normalized = String(candidate).replaceAll("\\", "/").replace(/^\.\//, "");

if (!normalized || normalized === ".env.example") process.exit(0);

const blocked = [
  /^\.env(?:\.|$)/i,
  /(?:^|\/)\.env(?:\.|$)/i,
  /(?:^|\/)[^/]+\.(?:pem|key|p12|pfx)$/i,
  /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/i,
  /(?:^|\/)service[-_]?role(?:[-_.]|$)/i,
  /(?:^|\/)secrets?(?:\.|\/|$)/i,
];

if (blocked.some((pattern) => pattern.test(normalized))) {
  process.stderr.write(
    `Foremention guard blocked an agent edit to sensitive path: ${normalized}. ` +
      "Use an approved secret-management or explicit human-reviewed workflow instead.\n",
  );
  process.exit(2);
}

process.exit(0);
