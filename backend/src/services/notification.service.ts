import { logger } from '../utils/logger';

/**
 * Notification delivery is not wired to a real email/SMS provider yet — no credentials are
 * configured for one. This adapter is the single seam a real provider (e.g. SES, Twilio) plugs
 * into later without changing any calling code. For now it only logs, so password-reset and
 * verification flows are fully testable without sending anything.
 */
export interface NotificationService {
  sendPasswordResetEmail(to: string, rawToken: string): Promise<void>;
}

class ConsoleNotificationService implements NotificationService {
  async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    logger.info('Password reset requested (email delivery not configured)', {
      to,
      resetToken: rawToken,
    });
  }
}

export const notificationService: NotificationService = new ConsoleNotificationService();
