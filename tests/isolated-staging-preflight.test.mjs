import assert from 'node:assert/strict';
import test from 'node:test';
import { validateIsolatedStageConfig, runIsolatedStagePreflight } from '../scripts/isolated-staging-preflight.mjs';

const config={
  baseUrl:'https://stage.foremention.com/',
  approvedHost:'stage.foremention.com',
  expectedSha:'a'.repeat(40),
  productionSha:'b'.repeat(40),
  stageProjectRef:'s'.repeat(20),
  productionProjectRef:'p'.repeat(20),
};
const health =()=>new Response(JSON.stringify({buildCommit:config.expectedSha,d1:'reachable',supabase:'reachable',secret:'must not surface'}),{
  status:200,headers:{'content-type':'application/json'}});
const fakeReq = async({url,method}) =>{
  assert.equal(method,'GET');
  const u=new URL(url);
  assert.equal(u.origin,'https://stage.foremention.com');
  if(u.pathname==='/api/health')return health();
  if(u.pathname==='/')return new Response('<html>safe</html>',{status:200,headers:{'content-type':'text/html'}});
  return new Response('',{status:307,headers:{location:'/login?next='+encodeURIComponent(u.pathname === '/app/outcomes/print' ? '/app/outcomes' : u.pathname)}});
};

test('accepts explicitly approved isolated stage declaration but does not attest remote bindings',()=>{
  const value=validateIsolatedStageConfig(config);
  assert.equal(value.baseUrl,'https://stage.foremention.com');
  assert.equal(value.expectedSha,config.expectedSha);
  assert.equal(Object.keys(value).includes('productionProjectRef'),false);
});

test('rejects unsafe production, credentialed, unapproved, local, HTTP, query or mismatched URLs',()=>{
  for(const input of [
    {baseUrl:'https://foremention.com/',approvedHost:'foremention.com'},
    {baseUrl:'https://www.foremention.com/',approvedHost:'www.foremention.com'},
    {baseUrl:'http://stage.foremention.com/'},
    {baseUrl:'https://wrong.foremention.com/'},
    {baseUrl:'https://user:pass@stage.foremention.com/'},
    {baseUrl:'https://stage.foremention.com:8443/'},
    {baseUrl:'https://stage.foremention.com/private'},
    {baseUrl:'https://stage.foremention.com/?api_key=x'},
    {baseUrl:'https://stage.foremention.com/#key'},
    {baseUrl:'https://127.0.0.1/',approvedHost:'127.0.0.1'},
    {baseUrl:'https://stage.foremention.com.attacker.net/',approvedHost:'stage.foremention.com.attacker.net'},
    {approvedHost:'other.foremention.com'},
    {stageProjectRef:config.productionProjectRef},
    {expectedSha:config.productionSha},
    {expectedSha:'invalid'},
    {productionSha:'invalid'},
    {stageProjectRef:'short'},
  ]) assert.throws(()=>validateIsolatedStageConfig({...config,...input}),undefined,JSON.stringify(input));
});

test('read-only exact-head remote preflight checks root and three anonymous protected routes',async()=>{
  const requested=[];
  const result=await runIsolatedStagePreflight(config,{request:async v=>{
    requested.push(new URL(v.url).pathname);
    return fakeReq(v);
  }});
  assert.equal(result.ok,true);
  assert.equal(result.expectedSha,config.expectedSha);
  assert.equal(result.routeChecks.length,4);
  assert.deepEqual(requested,['/api/health','/','/app','/app/outcomes','/app/outcomes/print']);
  assert.equal(JSON.stringify(result).includes('must not surface'),false);
  assert.equal(JSON.stringify(result).includes(config.stageProjectRef),false);
  assert.match(result.limitation,/independently unverified/);
});

test('wrong release SHA fails before making any protected or public-root calls',async()=>{
  const urls=[];
  const result=await runIsolatedStagePreflight(config,{request:async v=>{
    urls.push(new URL(v.url).pathname);
    return new Response(JSON.stringify({buildCommit:config.productionSha}),{status:200,headers:{'content-type':'application/json'}});
  }});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'stage_health_wrong_sha');
  assert.deepEqual(urls,['/api/health']);
});

test('503 then recovery is recorded as degraded-first-attempt failure, never an invisible green retry',async()=>{
  let count=0;
  const result=await runIsolatedStagePreflight(config,{request:async v=>{
    if(new URL(v.url).pathname==='/api/health' && ++count===1)
      return new Response(JSON.stringify({buildCommit:config.expectedSha,d1:'unavailable'}),{status:503,headers:{'content-type':'application/json'}});
    return fakeReq(v);
  }});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'degraded_first_attempt');
  assert.equal(result.health.length,2);
  assert.equal(result.routeChecks.length,0);
});

test('matching SHA with missing or degraded D1/Auth components fails closed',async()=>{
  for(const data of [
    {buildCommit:config.expectedSha,d1:'reachable'},
    {buildCommit:config.expectedSha,d1:'unavailable',supabase:'reachable'},
    {buildCommit:config.expectedSha,d1:'reachable',supabase:'not_configured'},
  ]){
    const result=await runIsolatedStagePreflight(config,{request:async v=>
      new URL(v.url).pathname==='/api/health'
        ? new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
        :fakeReq(v)});
    assert.equal(result.ok,false);
    assert.equal(result.reason,'stage_dependencies_unverified');
    assert.equal(result.routeChecks.length,0);
  }
});

test('root must serve HTML on exact candidate; landing page may not be replaced with an API body',async()=>{
  const result=await runIsolatedStagePreflight(config,{request:async v=>new URL(v.url).pathname==='/'
    ? new Response('{}',{status:200,headers:{'content-type':'application/json'}}):fakeReq(v)});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'public_root_invalid');
  assert.equal(result.routeChecks.length,1);
});

test('protected pages never allow anonymous 200 or redirect to an attacker',async()=>{
  for(const fail of [
    new Response('customer data',{status:200}),
    new Response('',{status:307,headers:{location:'https://evil.example/login?next=/app/outcomes'}}),
    new Response('',{status:307,headers:{location:'/login?next=/app'}}),
  ]){
    const result=await runIsolatedStagePreflight(config,{request:async v=>
      new URL(v.url).pathname==='/app/outcomes'?fail:fakeReq(v)});
    assert.equal(result.ok,false);
    assert.equal(result.reason,'anonymous_boundary_not_verified');
    assert.equal(result.routeChecks.find(x=>x.path==='/app/outcomes').ok,false);
  }
});

test('remote transport failures are sanitized and never considered successful',async()=>{
  const result=await runIsolatedStagePreflight(config,{request:async()=>{throw new Error('password=super-secret');}});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'stage_health_transient_health');
  assert.doesNotMatch(JSON.stringify(result),/password|super-secret/i);
});
