// Heleket 결제 API (서명: md5(base64_utf8(body) + API_KEY) — heleket-webhook과 동일)
import md5 from "npm:blueimp-md5@2.19.0";
import { logger } from "../logger.ts";

export type HeleketInvoiceStatus = "check" | "paid" | "expired" | "canceled" | "pending";

export type CheckoutInitInput = {
  userId: string;
  planCode: "pro";
  successUrl: string;
  cancelUrl: string;
  referralCode?: string;
  couponCode?: string;
  pointsUsed?: number;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
};

function getApiBase() {
  return (Deno.env.get("HELEKET_API_BASE") ?? "").trim() || "https://api.heleket.com";
}

function getMerchantId() {
  return (Deno.env.get("HELEKET_MERCHANT_ID") ?? "").trim();
}

function getApiSecret() {
  return (Deno.env.get("HELEKET_API_KEY") ?? "").trim();
}

function resolveCallbackBase(): string {
  const explicit = (Deno.env.get("SUPABASE_FUNCTIONS_URL") ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim().replace(/\/$/, "");
  if (supabaseUrl) return `${supabaseUrl}/functions/v1`;
  return "";
}

function base64Utf8(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function makeSign(body: string, apiSecret: string) {
  return md5(base64Utf8(body) + apiSecret);
}

function validateHeleketEnv(): string | null {
  if (!getMerchantId()) return "HELEKET_MERCHANT_ID is not set";
  if (!getApiSecret()) return "HELEKET_API_KEY is not set";
  return null;
}

export const heleketProvider = {
  validateEnv(): string | null {
    return validateHeleketEnv();
  },

  async createCheckoutSession(
    input: CheckoutInitInput
  ): Promise<{ url: string; invoiceUuid: string }> {
    const envErr = validateHeleketEnv();
    if (envErr) throw new Error(envErr);

    const merchant = getMerchantId();
    const apiSecret = getApiSecret();
    const callbackBase = resolveCallbackBase();

    const payload: Record<string, unknown> = {
      amount: (input.amountCents / 100).toFixed(2),
      currency: input.currency,
      order_id: input.idempotencyKey,
      url_return: input.cancelUrl,
      url_success: input.successUrl,
      additional_data: `plan=${input.planCode};user=${input.userId}`,
    };

    if (callbackBase) {
      payload.url_callback = `${callbackBase}/heleket-webhook`;
    }

    const bodyJson = JSON.stringify(payload);
    const sign = makeSign(bodyJson, apiSecret);

    logger.info("Heleket create payment", {
      order_id: input.idempotencyKey,
      merchantLen: merchant.length,
      apiKeyLen: apiSecret.length,
      hasCallback: Boolean(callbackBase),
    });

    const res = await fetch(`${getApiBase()}/v1/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        merchant,
        sign,
      },
      body: bodyJson,
    });

    const txt = await res.text();

    if (!res.ok) {
      logger.error("Heleket invoice create failed", { status: res.status, txt });
      throw new Error(`Heleket invoice create failed: ${res.status}`);
    }

    let data: { state?: number; message?: string; result?: { uuid?: string; url?: string } };
    try {
      data = JSON.parse(txt);
    } catch {
      logger.error("Heleket response was not JSON", { txt });
      throw new Error("Heleket response was not JSON");
    }

    if (data?.state !== 0) {
      logger.error("Heleket returned error state", { data });
      throw new Error(data?.message || "Heleket returned error state");
    }

    const invoiceUuid = data?.result?.uuid;
    const url = data?.result?.url;

    if (!invoiceUuid || !url) {
      logger.error("Heleket response missing uuid/url", { data });
      throw new Error("Heleket response missing uuid/url");
    }

    return { url, invoiceUuid };
  },
};
