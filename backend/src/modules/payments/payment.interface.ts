/**
 * No real payment gateway (Razorpay, Stripe, etc.) is configured anywhere in this codebase — no
 * credentials exist for one. This interface is the seam a real provider plugs into later without
 * changing any calling code, exactly the same reasoning as `StorageAdapter` (Phase 0) and
 * `NotificationService` (Phase 2). `ManualPaymentProvider` is the honest implementation available
 * today: it never claims to move real money, it only records that a human needs to.
 */
export interface PaymentProvider {
  /** Records that a refund needs to happen; does not itself transfer any money. */
  initiateRefund(input: { amount: number; currency: string; reference: string }): Promise<{ providerReference: string }>;
  /** Verifies a webhook payload's signature came from the real provider. Always false here — there is no webhook source. */
  verifyWebhookSignature(_rawBody: string, _signature: string): boolean;
}
