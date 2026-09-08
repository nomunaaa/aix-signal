import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[VERIFY-PHONE-OTP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

function toSolapiPhone(phone: string, countryCode: string): string {
  const cc = countryCode.replace("+", "").replace(/-[A-Z]+$/, "");
  if (cc === "82") return phone;
  const local = phone.startsWith("0") ? phone.slice(1) : phone;
  return `${cc}${local}`;
}

/** 리뷰/QA용 고정 우회 코드 — 실제 SMS 없이 임의 번호를 인증 통과시킨다. */
const TEST_BYPASS_CODE = "000000";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const body = await req.json();
    const phone: string = body.phone ?? "";
    const countryCode: string = body.countryCode ?? "+82";
    const code: string = body.code ?? "";
    const userId: string = body.userId ?? "";

    // userId 는 선택: 회원가입(계정 생성 전)에서는 없고, /verify-phone(로그인 후)에서는 있다.
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "전화번호와 인증번호를 입력하세요" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fullPhone = toSolapiPhone(phone, countryCode);
    log("Verify attempt", { fullPhone, userId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const isBypass = code === TEST_BYPASS_CODE;
    let otpRowId: string | null = null;

    if (isBypass) {
      log("Test bypass code used", { fullPhone });
    } else {
      const { data: otpRow, error } = await supabase
        .from("phone_otps")
        .select("id")
        .eq("phone", fullPhone)
        .eq("code", code)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (error || !otpRow) {
        log("Invalid or expired OTP", { fullPhone });
        return new Response(
          JSON.stringify({ error: "인증번호가 올바르지 않거나 만료되었습니다" }),
          { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 400 },
        );
      }

      // 회원가입 흐름은 userId 없이 먼저 코드만 확인한 뒤, 계정 생성 후 같은
      // 코드로 다시 호출해 실제 프로필을 갱신한다(아래 userId 분기). 그 두
      // 번째 호출이 이 코드를 다시 조회할 수 있어야 하므로, userId가 없는
      // (사전 확인) 호출에서는 행을 지우지 않고 남겨둔다 — 만료 시간이
      // 있으니 방치돼도 안전하다.
      otpRowId = otpRow.id;
    }

    // 한 전화번호는 한 사용자만 사용 가능 — 이미 인증된 다른 계정이 있으면 거부
    let dupQuery = supabase
      .from("profiles")
      .select("id")
      .eq("phone_number", fullPhone)
      .eq("phone_verified", true);
    if (userId) dupQuery = dupQuery.neq("id", userId);
    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      log("Phone already in use", { fullPhone });
      return new Response(
        JSON.stringify({ error: "이미 다른 계정에 등록된 전화번호입니다" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
      );
    }

    // userId가 있으면 프로필을 갱신한다 — 로그인 후 재인증(/verify-phone)은
    // 이 호출 하나로 끝나고, 회원가입은 계정 생성 후 이 함수를 다시 호출해
    // 여기로 들어온다(service role 업데이트라 client 세션 타이밍에 안전).
    if (userId) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ phone_verified: true, phone_number: fullPhone })
        .eq("id", userId);

      if (profileErr) {
        // 유니크 인덱스 위반(동시 가입 등) 방어
        if (profileErr.code === "23505") {
          return new Response(
            JSON.stringify({ error: "이미 다른 계정에 등록된 전화번호입니다" }),
            { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 409 },
          );
        }
        throw new Error(`Profile update error: ${profileErr.message}`);
      }

      if (otpRowId) await supabase.from("phone_otps").delete().eq("id", otpRowId);
    }

    log("Verified successfully", { fullPhone, userId });
    return new Response(JSON.stringify({ success: true, verified: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "인증 중 오류가 발생했습니다";
    log("Error", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
