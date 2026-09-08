import { supa } from './db.ts';
import { logger } from './logger.ts';
import { applyPaymentRefund } from './payments-ledger.ts';

type StripeCharge = {
  id?: string;
  invoice?: string | { id?: string } | null;
  amount?: number | null;
  amount_refunded?: number | null;
  refunded?: boolean;
};

export async function recordPartnerCommissionEventFromStripe(
  userId: string,
  amountCents: number,
  stripeInvoiceId: string,
  eventType: string
): Promise<void> {
  const { data: rel } = await supa
    .from('referral_relationships')
    .select('store_partner_id')
    .eq('referee_id', userId)
    .maybeSingle();

  const storePartnerId = rel?.store_partner_id ?? null;
  if (!storePartnerId) {
    return;
  }

  let paymentEventId: string | null = null;

  const { data: inserted, error: insErr } = await supa
    .from('partner_payment_events')
    .insert({
      member_user_id: userId,
      store_partner_id: storePartnerId,
      provider: 'stripe',
      provider_ref: stripeInvoiceId,
      payment_status: 'paid',
      gross_amount_cents: amountCents,
      currency: 'USD',
      metadata: { source: 'stripe-webhook', event_type: eventType },
    })
    .select('id')
    .maybeSingle();

  if (insErr) {
    const isDuplicate =
      insErr.code === '23505' || String(insErr.message).toLowerCase().includes('unique');
    if (!isDuplicate) {
      logger.error('partner_payment_events insert failed (stripe)', {
        error: insErr.message,
        userId,
        stripeInvoiceId,
      });
      return;
    }

    const { data: existing, error: selErr } = await supa
      .from('partner_payment_events')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_ref', stripeInvoiceId)
      .maybeSingle();
    if (selErr || !existing?.id) {
      logger.error('partner_payment_events duplicate lookup failed (stripe)', {
        error: selErr?.message,
        stripeInvoiceId,
      });
      return;
    }
    paymentEventId = existing.id;
  } else {
    paymentEventId = inserted?.id ?? null;
  }

  if (!paymentEventId) return;

  const { error: allocErr } = await supa.rpc('allocate_partner_commissions', {
    p_payment_event_id: paymentEventId,
  });
  if (allocErr) {
    logger.error('allocate_partner_commissions failed (stripe)', {
      error: allocErr.message,
      paymentEventId,
      userId,
    });
    const { error: auditErr } = await supa.rpc('audit_partner_commission_allocation_failure', {
      p_payment_event_id: paymentEventId,
      p_error_message: allocErr.message,
    });
    if (auditErr) {
      logger.error('commission allocation failure audit failed (stripe)', {
        error: auditErr.message,
        paymentEventId,
      });
    }
  }
}

export function invoiceIdFromCharge(charge: StripeCharge): string | null {
  if (!charge.invoice) return null;
  return typeof charge.invoice === 'string' ? charge.invoice : (charge.invoice.id ?? null);
}

export async function fetchStripeChargeInvoiceId(chargeId: string): Promise<string | null> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    logger.error('STRIPE_SECRET_KEY missing for charge invoice lookup', { chargeId });
    return null;
  }

  try {
    const res = await fetch(`https://api.stripe.com/v1/charges/${chargeId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) {
      logger.error('Stripe charge fetch failed', { chargeId, status: res.status });
      return null;
    }
    const charge = (await res.json()) as StripeCharge;
    return invoiceIdFromCharge(charge);
  } catch (err) {
    logger.error('Stripe charge fetch error', {
      chargeId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function clawbackPartnerPaymentByInvoice(
  stripeInvoiceId: string,
  refundRatio: number,
  paymentStatus: 'refunded' | 'chargeback',
  eventType: string
): Promise<void> {
  const { data: paymentEvent, error } = await supa
    .from('partner_payment_events')
    .select('id')
    .eq('provider', 'stripe')
    .eq('provider_ref', stripeInvoiceId)
    .maybeSingle();

  if (error) {
    logger.error('partner_payment_events lookup failed (refund)', {
      error: error.message,
      stripeInvoiceId,
      eventType,
    });
    return;
  }

  if (!paymentEvent?.id) {
    logger.info('No partner payment event for refunded invoice', { stripeInvoiceId, eventType });
    return;
  }

  const { error: clawErr } = await supa.rpc('clawback_partner_commissions', {
    p_payment_event_id: paymentEvent.id,
    p_payment_status: paymentStatus,
    p_refund_ratio: refundRatio,
  });

  if (clawErr) {
    logger.error('clawback_partner_commissions failed (stripe)', {
      error: clawErr.message,
      paymentEventId: paymentEvent.id,
      stripeInvoiceId,
      eventType,
    });
    return;
  }

  logger.info('Partner commission clawback applied', {
    paymentEventId: paymentEvent.id,
    stripeInvoiceId,
    refundRatio,
    paymentStatus,
    eventType,
  });
}

export async function handleStripeChargeRefunded(
  charge: StripeCharge,
  eventType: string
): Promise<void> {
  const invoiceId = invoiceIdFromCharge(charge);
  if (!invoiceId) {
    logger.info('charge.refunded without invoice, skip partner clawback', { chargeId: charge.id });
    return;
  }

  const amount = charge.amount ?? 0;
  const amountRefunded = charge.amount_refunded ?? 0;
  if (amount <= 0 || amountRefunded <= 0) {
    return;
  }

  const refundRatio = Math.min(1, amountRefunded / amount);
  await applyPaymentRefund({
    provider: 'stripe',
    providerRef: invoiceId,
    refundedAmountCents: amountRefunded,
    paymentStatus: 'refunded',
  });
  await clawbackPartnerPaymentByInvoice(invoiceId, refundRatio, 'refunded', eventType);
}

export async function handleStripeDisputeClosed(
  dispute: { status?: string; charge?: string | StripeCharge | null },
  eventType: string
): Promise<void> {
  if (dispute.status !== 'lost') {
    return;
  }

  const chargeRef = dispute.charge;
  let invoiceId: string | null = null;

  if (typeof chargeRef === 'object' && chargeRef) {
    invoiceId = invoiceIdFromCharge(chargeRef);
  } else if (typeof chargeRef === 'string') {
    invoiceId = await fetchStripeChargeInvoiceId(chargeRef);
  }

  if (!invoiceId) {
    logger.info('dispute.closed without invoice, skip partner clawback', { eventType });
    return;
  }

  await applyPaymentRefund({
    provider: 'stripe',
    providerRef: invoiceId,
    paymentStatus: 'chargeback',
  });
  await clawbackPartnerPaymentByInvoice(invoiceId, 1, 'chargeback', eventType);
}
