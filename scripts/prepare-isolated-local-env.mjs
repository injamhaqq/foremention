#!/usr/bin/env node
// Converts SUPABASE **LOCAL** CLI status to a private Worker/test env file.
// Never accepts a non-loopback API URL; never prints a token or password.
import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";
const input=process.argv[2];
if (!input) throw Error("Provide the private local CLI status file.");
const raw=await readFile(resolve(input),"utf8");
const vars={};
for(const line of raw.split(/\r?\n/)){
  const m=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if(!m) continue;
  let val=m[2].trim();
  if((val.startsWith("'")&&val.endsWith("'"))||(val.startsWith('"')&&val.endsWith('"')))val=val.slice(1,-1);
  vars[m[1]]=val;
}
const anon=vars.ANON_KEY||vars.PUBLISHABLE_KEY||"";
const service=vars.SERVICE_ROLE_KEY||vars.SECRET_KEY||"";
const parsed=new URL(vars.API_URL||"http://127.0.0.1:54321");
if(parsed.protocol!=="http:"||!["localhost","127.0.0.1"].includes(parsed.hostname)||
   !anon||!service||/\s/.test(anon)||/\s/.test(service)){
  throw Error("Refusing unexpected or missing local Supabase environment.");
}
const entries={
  NEXT_PUBLIC_SUPABASE_URL:parsed.origin,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,
  SUPABASE_SERVICE_ROLE_KEY:service,
  FOREMENTION_ISOLATED_APP_URL:"http://127.0.0.1:4174",
};
const content=Object.entries(entries).map(([k,v])=>k+"="+v).join("\n")+"\n";
await writeFile(".isolated-local-env",content,{mode:0o600});
await writeFile(".dev.vars",content,{mode:0o600});
await chmod(".isolated-local-env",0o600);
await chmod(".dev.vars",0o600);
process.stdout.write("[isolated-env] Ready with loopback-only URLs and private runtime keys.\n");
