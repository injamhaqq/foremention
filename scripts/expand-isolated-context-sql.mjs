#!/usr/bin/env node
// Expand one trusted staging include OUTSIDE the isolated Postgres container.
// The pipe feeds expanded SQL to psql stdin; no credentials, production access,
// dynamic paths, migrations or shell interpolation are involved.
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fixture = await readFile(new URL("scripts/verify-follow-up-material-context.sql", root), "utf8");
const staged = await readFile(new URL("scripts/staging/resolution-material-context-parity.sql", root), "utf8");
const directive = String.raw`\i scripts/staging/resolution-material-context-parity.sql`;
if (fixture.split(directive).length !== 2 ||
    !staged.includes("create or replace function public.validate_resolution_follow_up()") ||
    !fixture.includes("rollback;") ||
    !fixture.includes("begin;")) {
  throw new Error("Trusted, rollback-only isolated SQL include was not recognized.");
}
process.stdout.write(fixture.replace(directive, staged));
