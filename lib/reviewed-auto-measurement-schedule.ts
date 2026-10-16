import { nextScheduleAt, validateMeasurementSchedule } from "@/lib/measurement-schedules";
import { autoScheduleCadence } from "@/lib/product-limits";
import { supabaseRest } from "@/lib/supabase-rest";
import { pinCompleteBaseline, planTrialFollowUp } from "@/lib/trial-repeat-policy";

type Run = { id:string; status:string; completed_at:string|null; answer_count:number|null; methodology_version:string|null; category_id:string|null; created_by:string|null; idempotency_key:string|null };
type Answer = { prompt_key:string; prompt_text:string|null; provider:string; model:string|null; measurement_context_json:unknown; review_status:string };
type Selection = { prompt_id:string; prompt_key:string; prompt_text:string; locale:string|null; market:string|null };
type Entitlement = { status:string; package_key:string|null; billing_source:string|null; expires_at:string|null };

/** Best-effort, never rewrites an existing/paused schedule. Requires human-reviewed complete baseline. */
export async function ensureReviewedAutoMeasurementSchedule(input: {
  organizationId:string; projectId:string; runId:string; actorId:string; token:string; now?:Date;
}):Promise<{status:"created"|"exists"|"not_eligible"|"failed";reason?:string}> {
  const now = input.now ?? new Date();
  const scope = "&organization_id=eq." + input.organizationId + "&project_id=eq." + input.projectId;
  try {
    const old = await supabaseRest<Array<{id:string;enabled:boolean}>>(
      "measurement_schedules?select=id,enabled&organization_id=eq." + input.organizationId + "&project_id=eq." + input.projectId + "&limit=1", {token:input.token});
    if (old.length) return {status:"exists",reason:old[0].enabled?"EXISTING_SCHEDULE":"USER_PAUSED"};
    const runs = await supabaseRest<Run[]>(
      "runs?select=id,status,completed_at,answer_count,methodology_version,category_id,created_by,idempotency_key&id=eq." + input.runId + scope + "&limit=1", {token:input.token});
    const run = runs[0];
    if (!run || run.status!=="complete" || !run.completed_at || !run.category_id || !run.created_by)
      return {status:"not_eligible",reason:"BASELINE_INCOMPLETE"};
    if (run.idempotency_key?.startsWith("measurement-schedule:"))
      return {status:"not_eligible",reason:"SCHEDULED_RUN_NOT_BASELINE"};
    const [answers,selections,entitlements] = await Promise.all([
      supabaseRest<Answer[]>("run_answers?select=prompt_key,prompt_text,provider,model,measurement_context_json,review_status&organization_id=eq." + input.organizationId + "&run_id=eq." + run.id + "&limit=101",{token:input.token}),
      supabaseRest<Selection[]>("run_prompt_selections?select=prompt_id,prompt_key,prompt_text,locale,market&organization_id=eq." + input.organizationId + "&run_id=eq." + run.id + "&limit=101",{token:input.token}),
      supabaseRest<Entitlement[]>("organization_entitlements?select=status,package_key,billing_source,expires_at&organization_id=eq." + input.organizationId + "&limit=1",{token:input.token}),
    ]);
    const entitlement=entitlements[0]; const cadence=autoScheduleCadence(entitlement,now);
    if(!cadence)return {status:"not_eligible",reason:"ENTITLEMENT_CHANGED"};
    if(!answers.length || answers.some(a=>a.review_status!=="verified") || answers.length!==selections.length)
      return {status:"not_eligible",reason:"BASELINE_INCOMPLETE"};
    const baseline=pinCompleteBaseline({runId:run.id,status:run.status,completedAt:run.completed_at,
      methodologyVersion:run.methodology_version,expectedAnswers:run.answer_count??0,
      answers:answers.map(a=>({promptKey:a.prompt_key,promptText:a.prompt_text||"",provider:a.provider,model:a.model||"",
        measurementContext:a.measurement_context_json && typeof a.measurement_context_json==="object" && !Array.isArray(a.measurement_context_json)
          ? a.measurement_context_json as Record<string,unknown> : null}))});
    if(!baseline.eligible)return {status:"not_eligible",reason:baseline.reason};
    const byKey=new Map(selections.map(s=>[s.prompt_key,s]));
    if(byKey.size!==selections.length || selections.some(s=>!s.prompt_id))
      return {status:"not_eligible",reason:"BASELINE_UNKNOWN_CONTRACT"};
    for(const q of baseline.pin.questionPins){
      const s=byKey.get(q.promptKey);
      if(!s || s.prompt_text.replace(/\s+/g," ").trim()!==q.promptText || s.locale!==q.context.locale || s.market!==q.context.market)
        return {status:"not_eligible",reason:"BASELINE_UNKNOWN_CONTRACT"};
    }
    const trial=entitlement.billing_source==="trial";
    const planned=trial?planTrialFollowUp({baselineStatus:run.status,baselineCompletedAt:run.completed_at,
      trialExpiresAt:entitlement.expires_at,now,billingSource:entitlement.billing_source,entitlementStatus:entitlement.status}):null;
    if(planned && !planned.eligible)return {status:"not_eligible",reason:planned.reason};
    const schedule=validateMeasurementSchedule({cadence,timezone:"UTC",questionIds:selections.map(s=>s.prompt_id),
      providerIds:[baseline.pin.provider],modelSnapshot:baseline.pin.model,methodologySnapshot:baseline.pin.methodologyVersion,
      locale:baseline.pin.questionPins[0].context.locale,market:baseline.pin.questionPins[0].context.market,enabled:true});
    const due=planned?.eligible ? planned.dueAt : nextScheduleAt(new Date(run.completed_at),cadence,"UTC").toISOString();
    await supabaseRest("measurement_schedules",{method:"POST",token:input.token,prefer:"return=minimal",body:{
      organization_id:input.organizationId,project_id:input.projectId,category_id:run.category_id,
      created_by:input.actorId,cadence:schedule.cadence,timezone:schedule.timezone,question_ids:schedule.questionIds,
      provider_ids:schedule.providerIds,model_snapshot:schedule.modelSnapshot,methodology_snapshot:schedule.methodologySnapshot,
      locale:schedule.locale,market:schedule.market,enabled:true,next_run_at:due,
      schedule_origin:trial?"trial":"paid",baseline_run_id:run.id,trial_ends_at:trial?entitlement.expires_at:null,
      baseline_contract_json:{ ...baseline.pin, questionPins:baseline.pin.questionPins.map(q=>({...q,promptId:byKey.get(q.promptKey)?.prompt_id})) }}});
    return {status:"created"};
  }catch{
    try {
      const old=await supabaseRest<Array<{id:string}>>("measurement_schedules?select=id&organization_id=eq."+input.organizationId+"&project_id=eq."+input.projectId+"&limit=1",{token:input.token});
      if(old.length)return {status:"exists"};
    }catch{}
    return {status:"failed",reason:"SCHEDULE_PERSISTENCE_FAILED"};
  }
}
