import { supa } from "./db.ts";
import { logger } from "./logger.ts";

/**
 * 결제 원장(payments) 기록.
 *
 * partner_payment_events와 달리 제휴 파트너 유무를 따지지 않는다. 그쪽은
 * store_partner_id가 없으면 곧바로 return하기 때문에 직접 결제 사용자의
 * 결제 이력이 통째로 비어 있었고, 그래서 "결제 후 7일 이내 환불"을 계산할
 * 기준 시각이 존재하지 않았다. 이 함수가 그 기준선을 만든다.
 *
 * 웹훅은 재전송되므로 (provider, provider_ref) 유니크에 기대어 멱등이다.
 * 이미 있는 행은 조용히 무시한다 — 금액을 덮어써서 원장을 흔들지 않는다.
 *
 * 원장 기록 실패가 구독 활성화를 막아서는 안 되므로 던지지 않고 로그만 남긴다.
 */
export async function recordPayment(input: {
  userId: string;
  provider: "stripe" | "heleket";
  providerRef: string;
  amountCents: number;
  currency?: string;
  planCode?: string | null;
  providerChargeRef?: string | null;
  paidAt?: string | null;
}): Promise<void> {
  if (!input.userId || !input.providerRef || input.amountCents <= 0) {
    logger.info("payments: skipped (insufficient data)", {
      provider: input.provider,
      hasUser: Boolean(input.userId),
      hasRef: Boolean(input.providerRef),
      amountCents: input.amountCents,
    });
    return;
  }

  // 탈퇴 후에도 회계 기록이 남도록 이메일을 스냅샷으로 같이 저장한다
  // (payments.user_id는 on delete set null).
  let userEmail: string | null = null;
  try {
    const { data } = await supa.auth.admin.getUserById(input.userId);
    userEmail = data?.user?.email ?? null;
  } catch {
    // 이메일은 부가 정보라 실패해도 원장 기록은 계속한다.
  }

  const { error } = await supa
    .from("payments")
    .insert({
      user_id: input.userId,
      user_email: userEmail,
      provider: input.provider,
      provider_ref: input.providerRef,
      provider_charge_ref: input.providerChargeRef ?? null,
      plan_code: input.planCode ?? null,
      amount_cents: input.amountCents,
      currency: (input.currency ?? "USD").toUpperCase(),
      status: "paid",
      paid_at: input.paidAt ?? new Date().toISOString(),
    });

  if (error) {
    // 23505 = unique_violation → 웹훅 재전송. 정상 경로다.
    if ((error as { code?: string }).code === "23505") {
      logger.info("payments: already recorded", {
        provider: input.provider,
        providerRef: input.providerRef,
      });
      return;
    }
    logger.error("payments: insert failed", {
      provider: input.provider,
      providerRef: input.providerRef,
      message: error.message,
    });
    return;
  }

  logger.info("payments: recorded", {
    provider: input.provider,
    providerRef: input.providerRef,
    amountCents: input.amountCents,
  });
}

export async function applyPaymentRefund(input: {
  provider: "stripe" | "heleket";
  providerRef: string;
  refundedAmountCents?: number | null;
  paymentStatus: "refunded" | "chargeback";
}): Promise<void> {
  const { data, error } = await supa.rpc("apply_provider_payment_refund", {
    p_provider: input.provider,
    p_provider_ref: input.providerRef,
    p_refunded_amount_cents: input.refundedAmountCents ?? null,
    p_payment_status: input.paymentStatus,
  });

  if (error) {
    logger.error("payments: refund state update failed", {
      provider: input.provider,
      providerRef: input.providerRef,
      message: error.message,
    });
    return;
  }

  if (!data) {
    logger.info("payments: refund state skipped (payment not found)", {
      provider: input.provider,
      providerRef: input.providerRef,
    });
  }
}
