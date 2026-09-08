import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[SEND-PHONE-OTP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Solapi expects Korean numbers in local format (01012345678), not international. */
function toSolapiPhone(phone: string, countryCode: string): string {
  const cc = countryCode.replace("+", "").replace(/-[A-Z]+$/, "");
  if (cc === "82") return phone;
  const local = phone.startsWith("0") ? phone.slice(1) : phone;
  return `${cc}${local}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const body = await req.json();
    const phone: string = body.phone ?? "";
    const countryCode: string = body.countryCode ?? "+82";

    if (!/^0[0-9]{9,10}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "올바른 전화번호를 입력하세요" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fullPhone = toSolapiPhone(phone, countryCode);
    log("Request received", { fullPhone });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Rate-limit: max 3 sends per phone per 10 minutes
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("phone_otps")
      .select("*", { count: "exact", head: true })
      .eq("phone", fullPhone)
      .gte("created_at", windowStart);

    if (countErr) throw new Error(`DB count error: ${countErr.message}`);

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "잠시 후 다시 시도해 주세요 (10분 내 최대 3회)" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" }, status: 429 },
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Replace any previous OTP for this phone
    await supabase.from("phone_otps").delete().eq("phone", fullPhone);
    const { error: insertErr } = await supabase
      .from("phone_otps")
      .insert({ phone: fullPhone, code, expires_at: expiresAt });
    if (insertErr) throw new Error(`DB insert error: ${insertErr.message}`);

    // Send SMS via Solapi
    const apiKey = Deno.env.get("SOLAPI_API_KEY");
    const apiSecret = Deno.env.get("SOLAPI_API_SECRET");
    const senderNumber = Deno.env.get("SOLAPI_SENDER_NUMBER");

    if (!apiKey || !apiSecret || !senderNumber) {
      throw new Error("Solapi 환경변수가 설정되지 않았습니다");
    }

    const date = new Date().toISOString();
    const salt = crypto.randomUUID().replace(/-/g, "");
    const signature = await hmacSha256Hex(date + salt, apiSecret);

    const smsRes = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, Salt=${salt}, Signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: fullPhone,
          from: senderNumber,
          text: `[AIXSignal] 인증번호: ${code} (5분 내 입력)`,
        },
      }),
    });

    if (!smsRes.ok) {
      const errBody = await smsRes.text();
      log("Solapi error", { status: smsRes.status, body: errBody });
      throw new Error(`SMS 발송 실패 (${smsRes.status}): ${errBody}`);
    }

    log("OTP sent successfully", { fullPhone });
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OTP 발송 중 오류가 발생했습니다";
    log("Error", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
