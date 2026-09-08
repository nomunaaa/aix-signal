import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[REQUEST-REFUND] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

/**
 * 사용자의 환불 요청 접수 — 돈은 여기서 움직이지 않는다.
 * 관리자가 admin-process-refund로 승인해야 공급자에 실제 환불이 나간다.
 *
 * 자격 판정은 DB의 payment_is_refundable()에 위임한다. 기간(7일)을 여기에
 * 하드코딩하면 정책을 바꿀 때 SQL·Edge·화면이 서로 어긋난다.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status,
    });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "인증 정보가 없습니다" }, 401);
    const jwt = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 호출자 본인 확인. 남의 결제에 환불을 걸 수 없도록 user_id는 JWT에서만 얻는다.
    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "인증 정보가 올바르지 않습니다" }, 401);
    const userId = userRes.user.id;

    const body = (await req.json().catch(() => ({}))) as {
      paymentId?: string;
      reason?: string;
    };
    if (!body.paymentId) return json({ error: "paymentId가 필요합니다" }, 400);

    // 자격 확인 — 본인 결제인지, 기간 안인지.
    const { data: payment, error: payErr } = await supabaseUser
      .from("payments")
      .select("id, user_id, status, refunded_amount_cents, paid_at, amount_cents, currency")
      .eq("id", body.paymentId)
      .maybeSingle();

    if (payErr) return json({ error: payErr.message }, 500);
    if (!payment || payment.user_id !== userId) {
      return json({ error: "결제 내역을 찾을 수 없습니다" }, 404);
    }

    const { data: eligible, error: eligErr } = await supabaseUser.rpc("payment_is_refundable", {
      p_payment_id: body.paymentId,
    });
    if (eligErr) return json({ error: eligErr.message }, 500);
    if (!eligible) {
      return json({ error: "환불 가능 기간이 지났거나 이미 환불된 결제입니다" }, 422);
    }

    // insert는 RLS 정책(본인 결제 + payment_is_refundable)을 한 번 더 통과해야 한다.
    // 중복 대기 요청은 exclude 제약이 막는다.
    const { data: inserted, error: insErr } = await supabaseUser
      .from("refund_requests")
      .insert({
        payment_id: body.paymentId,
        user_id: userId,
        reason: (body.reason ?? "").slice(0, 1000) || null,
      })
      .select("id, status, requested_at")
      .maybeSingle();

    if (insErr) {
      // 23505 = unique_violation → refund_requests_one_pending_per_payment
      // (한 결제에 대기 중인 요청은 하나만)
      if ((insErr as { code?: string }).code === "23505") {
        return json({ error: "이미 처리 대기 중인 환불 요청이 있습니다" }, 409);
      }
      log("insert failed", { message: insErr.message });
      return json({ error: insErr.message }, 500);
    }

    log("requested", { userId, paymentId: body.paymentId, requestId: inserted?.id });
    return json({ ok: true, request: inserted }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "환불 요청 중 오류가 발생했습니다";
    log("Error", message);
    return json({ error: message }, 500);
  }
});
