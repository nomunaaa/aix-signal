import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[DELETE-ACCOUNT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

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

    // 요청한 사람의 신원은 anon 클라이언트 + JWT로 확인한다 — 임의의 user_id를
    // 아무나 지울 수 없도록, 삭제 대상은 항상 "호출자 본인"으로 고정한다.
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
    log("Deleting user", { userId });

    // 실제 삭제는 service role로만 가능하다 (auth.users 행 삭제 → profiles 등
    // FK가 on delete cascade로 걸려 있어 종속 데이터가 함께 정리된다).
    const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
      auth: { persistSession: false },
    });

    // 계정을 지우기 전에 결제부터 끊는다. 순서가 중요하다 — auth.users 행이 사라지면
    // subscriptions 행도 cascade로 함께 지워져서 stripe_subscription_id를 잃고,
    // 그러면 Stripe 구독만 살아남아 탈퇴한 사용자에게 계속 청구된다.
    //
    // 여기서는 즉시 해지(cancel)를 쓴다. 탈퇴는 "기간 말까지 쓰겠다"는 의사가 아니므로
    // cancel_at_period_end로 미루지 않는다.
    //
    // 결제가 끊기지 않으면 계정도 지우지 않는다. 실패를 삼키고 계정만 지우면
    // 사용자는 청구를 멈출 수단(로그인해서 구독 취소)을 영영 잃는다.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("provider, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set — 구독을 정리할 수 없어 탈퇴를 중단합니다");

      const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        log("Stripe subscription canceled", { subscriptionId: sub.stripe_subscription_id });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 이미 취소된 구독이면 목적을 달성한 것이므로 통과시킨다.
        if (!/No such subscription|already canceled/i.test(msg)) {
          log("Stripe cancel failed — aborting deletion", { message: msg });
          throw new Error(`구독 해지에 실패해 탈퇴를 중단했습니다: ${msg}`);
        }
        log("Stripe subscription already gone", { message: msg });
      }
    } else if (sub?.provider === "heleket") {
      // Heleket 연동은 결제 생성(createCheckoutSession)만 구현돼 있고 구독 해지 API가 없다.
      // 자동으로 끊을 수단이 없으므로 조용히 넘기지 않고 로그를 남긴다.
      // (Heleket은 청구가 인보이스 단위라 Stripe처럼 이어지는 구독이 아니지만,
      //  정기 결제로 바꾸는 순간 여기가 구멍이 된다.)
      log("Heleket subscription — no programmatic cancel path", { userId });
    }

    // profiles를 가리키는 일부 FK(alerts/positions/portfolio_health/mock_trades/
    // partner_info)에 on delete cascade가 걸려 있지 않아, auth.users 삭제가
    // profiles까지는 cascade 되어도 그 아래에서 FK 위반으로 막혀 Supabase가
    // "Database error deleting user"라는 뭉뚱그린 에러만 돌려주는 문제가 있었다.
    // 자식 행을 먼저 지워 그 경로를 비운다. (position_scores는 positions의
    // 자식이라 positions보다 먼저 지워야 한다.)
    const { data: userPositions } = await supabaseAdmin
      .from("positions")
      .select("id")
      .eq("user_id", userId);
    const positionIds = (userPositions ?? []).map((p) => p.id);
    if (positionIds.length > 0) {
      const { error: positionScoresErr } = await supabaseAdmin
        .from("position_scores")
        .delete()
        .in("position_id", positionIds);
      if (positionScoresErr) log("position_scores cleanup failed", { message: positionScoresErr.message });
    }
    for (const table of ["positions", "portfolio_health", "mock_trades", "alerts", "partner_info"]) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) log(`${table} cleanup failed`, { message: error.message });
    }

    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      log("Delete failed", { message: deleteErr.message });
      throw new Error(deleteErr.message || "계정 삭제 중 오류가 발생했습니다");
    }

    log("Deleted successfully", { userId });
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "계정 삭제 중 오류가 발생했습니다";
    log("Error", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
