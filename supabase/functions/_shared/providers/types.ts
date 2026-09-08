export type PaymentProviderType = 'stripe' | 'heleket' | 'crypto' | 'bank';

export type CheckoutInitInput = {
  userId: string;
  planCode: 'pro';
  couponTag?: string;
  referralCode?: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  provider?: PaymentProviderType;
};

export type CheckoutInitResult = { url: string };

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutInitInput): Promise<CheckoutInitResult>;
  createPortalSession(opts: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  refundPayment(opts: {
    providerPaymentId: string;
    amountCents?: number;
    reason?: 'requested_by_customer' | 'duplicate' | 'fraudulent';
  }): Promise<{ id: string }>;
  verifyWebhook(sigHeader: string, rawBody: string): { valid: boolean; event?: any };
  mapEventToDomain(evt: any): Promise<{ type: string; dedupeKey: string; payload: any }>;
  cancelAtPeriodEnd(opts: { providerSubscriptionId: string }): Promise<void>;
  resume(opts: { providerSubscriptionId: string }): Promise<void>;
}
