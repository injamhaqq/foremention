// Applies the proposal SQL on top of the replay + rls-probe seed and checks it.
import { readFileSync } from "node:fs";
import probe from "./rls-probe.mjs";
const A = "aaaaaaaa-0000-4000-8000-00000000000a", B = "bbbbbbbb-0000-4000-8000-00000000000b";
const A1 = "a1a1a1a1-0000-4000-8000-0000000000a1", A2 = "a2a2a2a2-0000-4000-8000-0000000000a2", B1 = "b1b1b1b1-0000-4000-8000-0000000000b1";
const PA2 = "9a200000-0000-4000-8000-0000000000a2", PB1 = "9b100000-0000-4000-8000-0000000000b1";
const analyst = "11111111-0000-4000-8000-000000000002";
export default async function proposalProbe(db) {
  await probe(db);
  await db.exec(readFileSync(new URL("../proposed-migration-update-prompt-in-project.sql", import.meta.url), "utf8"));
  const as = async () => { await db.query("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [analyst]); await db.query("set role authenticated"); };
  const rejects = async (args, m) => { await as(); let threw = false; try { await db.query("select public.update_prompt_versioned_in_project($1,$2,$3,'x',null,'r')", args); } catch { threw = true; } await db.query("reset role"); if (!threw) throw new Error("expected rejection: " + m); console.log("ok   proposal rejects", m); };
  await rejects([PA2, A, A1], "sibling-project prompt from A1 context");
  await rejects([PB1, A, A1], "other-org prompt");
  await rejects([PB1, B, B1], "other-org prompt with its own ids");
  await as();
  await db.query("select public.update_prompt_versioned_in_project($1,$2,$3,'edited in own project',null,'r') r", [PA2, A, A2]);
  await db.query("reset role");
  const text = (await db.query("select prompt_text from prompts where id=$1", [PA2])).rows[0].prompt_text;
  if (text !== "edited in own project") throw new Error("own-project edit failed");
  const anon = (await db.query("select has_function_privilege('anon','public.update_prompt_versioned_in_project(uuid,uuid,uuid,text,boolean,text)','execute') a")).rows[0].a;
  if (anon) throw new Error("anon can execute proposal RPC");
  console.log("ok   proposal allows own-project edit; not anon-executable");
}
