import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[START-TRIAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const DEFAULT_TRIAL_DAYS = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "인증 정보가 없습니다" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 401,
      });
    }
    const jwt = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "인증 정보가 올바르지 않습니다" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 401,
      });
    }
    const userId = userRes.user.id;

    // service role로 조회/갱신 — trial_end가 이미 있으면(과거 사용 이력) 재사용 방지.
    const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false },
    });

    const { data: sub, error: fetchErr } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_code, status, trial_used_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);

    if (sub?.status === "trialing") {
      return new Response(
        JSON.stringify({ error: "무료 체험이 현재 진행 중입니다." }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
      );
    }

    if (!sub || sub.plan_code !== "free") {
      return new Response(
        JSON.stringify({ error: "이미 유료 플랜을 이용 중이거나 체험 대상이 아닙니다" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
      );
    }

    if (sub.trial_used_at) {
      return new Response(
        JSON.stringify({ error: "이미 무료 체험을 이용하신 이력이 있습니다." }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
      );
    }

    // 탈퇴 후 같은 전화번호로 재가입해 체험을 반복 이용하는 것을 막는다 — subscriptions
    // 행은 계정과 함께 삭제되지만 trial_claims는 전화번호 기준으로 영구히 남는다.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("phone_number, phone_verified")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) throw new Error(profileErr.message);

    if (!profile?.phone_verified || !profile.phone_number) {
      return new Response(
        JSON.stringify({ error: "전화번호 인증이 필요합니다" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 403 },
      );
    }

    const { data: existingClaim, error: claimFetchErr } = await supabaseAdmin
      .from("trial_claims")
      .select("id")
      .eq("phone_number", profile.phone_number)
      .maybeSingle();

    if (claimFetchErr) throw new Error(claimFetchErr.message);

    if (existingClaim) {
      return new Response(
        JSON.stringify({ error: "이미 이 전화번호로 무료체험을 이용하신 이력이 있습니다" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
      );
    }

    // 체험 일수는 admin_panel_plan_settings.trial_days(관리자 패널에서 설정) 하나가
    // 결정해야 한다 — 여기서 하드코딩하면 관리자가 체험 기간을 늘려도(예: 베타 테스트
    // 기간 무제한화) 실제로 부여되는 기간은 바뀌지 않는 불일치가 생긴다.
    const { data: planSetting } = await supabaseAdmin
      .from("admin_panel_plan_settings")
      .select("trial_days")
      .eq("plan_code", "pro")
      .maybeSingle();
    const trialDays =
      Number.isFinite(planSetting?.trial_days) && (planSetting?.trial_days ?? 0) >= 0
        ? Number(planSetting!.trial_days)
        : DEFAULT_TRIAL_DAYS;

    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const { error: updateErr } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_code: "pro",
        status: "trialing",
        trial_used_at: now.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateErr) throw new Error(updateErr.message);

    const { error: claimInsertErr } = await supabaseAdmin
      .from("trial_claims")
      .insert({ phone_number: profile.phone_number, user_id: userId });

    if (claimInsertErr) throw new Error(claimInsertErr.message);

    log("Trial started", { userId, trialEnd: trialEnd.toISOString() });
    return new Response(JSON.stringify({ success: true, trial_end: trialEnd.toISOString() }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "무료체험 시작 중 오류가 발생했습니다";
    log("Error", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
