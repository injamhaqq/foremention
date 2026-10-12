"use client";
// Fixture: must be flagged by foremention-no-service-role-in-client-component.
import { supabaseAuth } from "@/lib/supabase-rest";

export function Leaky() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return <div data-k={key} onClick={() => supabaseAuth("x", {})} />;
}
