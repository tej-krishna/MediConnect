import { Order } from '../pharmacy/order.model';
import { DiagnosticOrder } from '../diagnostics/diagnosticOrder.model';
import { CareRequest } from '../homecare/careRequest.model';
import { Appointment } from '../scheduling/appointment.model';
import { HealthCampRegistration } from '../diagnostics/healthCamp.model';
import { ProviderApplication } from '../providers/provider.model';
import { SupportTicket } from '../support/supportTicket.model';
import { DeliveryPartnerProfile } from '../delivery/deliveryPartner.model';
import { User } from '../users/user.model';
import { CommissionRule } from './commissionRule.model';

interface RevenueByProviderType {
  providerType: string;
  grossAmount: number;
  orderCount: number;
  commissionPercentage: number;
  commissionAmount: number;
}

/**
 * Sums totalAmount + order count for a revenue-bearing collection, grouped by the owning
 * provider's providerType via $lookup. Excludes the given cancelled-equivalent statuses — a
 * cancelled order was never actually fulfilled, so counting it as "gross booking value" would
 * overstate real platform activity.
 */
async function sumByProviderType(
  model: typeof Order | typeof DiagnosticOrder | typeof CareRequest,
  providerIdField: string,
  excludedStatuses: string[],
): Promise<Map<string, { amount: number; count: number }>> {
  const rows = await model.aggregate([
    { $match: { status: { $nin: excludedStatuses } } },
    {
      $lookup: {
        from: 'providerapplications',
        localField: providerIdField,
        foreignField: '_id',
        as: 'provider',
      },
    },
    { $unwind: '$provider' },
    {
      $group: {
        _id: '$provider.providerType',
        amount: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, { amount: number; count: number }>();
  for (const row of rows) {
    map.set(row._id, { amount: row.amount, count: row.count });
  }
  return map;
}

export async function getOverview() {
  const [pharmacyRevenue, diagnosticRevenue, careRequestRevenue, commissionRules] = await Promise.all([
    sumByProviderType(Order, 'pharmacyId', ['cancelled']),
    sumByProviderType(DiagnosticOrder, 'labId', ['cancelled']),
    sumByProviderType(CareRequest, 'providerId', ['cancelled']),
    CommissionRule.find(),
  ]);

  const commissionByType = new Map(commissionRules.map((r) => [r.providerType, r.percentage]));
  const combined = new Map<string, { amount: number; count: number }>();
  for (const map of [pharmacyRevenue, diagnosticRevenue, careRequestRevenue]) {
    for (const [providerType, { amount, count }] of map) {
      const existing = combined.get(providerType) ?? { amount: 0, count: 0 };
      combined.set(providerType, { amount: existing.amount + amount, count: existing.count + count });
    }
  }

  const revenue: RevenueByProviderType[] = Array.from(combined.entries()).map(([providerType, { amount, count }]) => {
    const commissionPercentage = commissionByType.get(providerType) ?? 0;
    return {
      providerType,
      grossAmount: amount,
      orderCount: count,
      commissionPercentage,
      commissionAmount: Math.round(amount * (commissionPercentage / 100) * 100) / 100,
    };
  });

  const [
    activeAppointments,
    cancelledAppointments,
    activeCampRegistrations,
    pendingProviderApplications,
    flaggedProviders,
    pendingDeliveryPartners,
    openSupportTickets,
    totalUsers,
  ] = await Promise.all([
    Appointment.countDocuments({ status: { $in: ['booked', 'completed', 'no_show'] } }),
    Appointment.countDocuments({ status: 'cancelled' }),
    HealthCampRegistration.countDocuments({ status: 'registered' }),
    ProviderApplication.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    ProviderApplication.countDocuments({ flagged: true }),
    DeliveryPartnerProfile.countDocuments({ status: 'pending' }),
    SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    User.countDocuments(),
  ]);

  return {
    revenue,
    bookings: {
      activeAppointments,
      cancelledAppointments,
      activeCampRegistrations,
    },
    moderation: {
      pendingProviderApplications,
      flaggedProviders,
      pendingDeliveryPartners,
      openSupportTickets,
    },
    totalUsers,
  };
}
