import { logger } from '../../utils/logger';
import type { PaymentProvider } from './payment.interface';

class ManualPaymentProvider implements PaymentProvider {
  async initiateRefund(input: { amount: number; currency: string; reference: string }): Promise<{ providerReference: string }> {
    logger.info('Refund requires manual processing (no payment gateway configured)', input);
    return { providerReference: `manual-${input.reference}` };
  }

  verifyWebhookSignature(): boolean {
    return false;
  }
}

export const paymentProvider: PaymentProvider = new ManualPaymentProvider();
