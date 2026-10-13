import { AppError } from '../../utils/AppError';
import { PROVIDER_TYPES, type ProviderType } from '../providers/provider.types';
import { CommissionRule, type CommissionRuleDoc } from './commissionRule.model';
import { recordAudit } from './auditLog.service';

export async function listCommissionRules(): Promise<CommissionRuleDoc[]> {
  return CommissionRule.find().sort({ providerType: 1 });
}

export async function setCommissionRule(
  providerType: string,
  percentage: number,
  actorId: string,
): Promise<CommissionRuleDoc> {
  if (!PROVIDER_TYPES.includes(providerType as ProviderType)) {
    throw AppError.badRequest('Unknown provider type');
  }

  const rule = await CommissionRule.findOneAndUpdate(
    { providerType },
    { percentage, updatedBy: actorId },
    { upsert: true, returnDocument: 'after' },
  );

  await recordAudit({
    actorId,
    action: 'commission_rule_updated',
    targetType: 'CommissionRule',
    targetId: rule!._id.toString(),
    metadata: { providerType, percentage },
  });

  return rule!;
}

/** Looks up the configured rate for a provider type, defaulting to 0% when none has been set. */
export async function getCommissionPercentage(providerType: string): Promise<number> {
  const rule = await CommissionRule.findOne({ providerType });
  return rule?.percentage ?? 0;
}
