export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: string[];
  status: 'active' | 'locked' | 'suspended';
  createdAt: string;
}

export interface CommissionRule {
  providerType: string;
  percentage: number;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RevenueByProviderType {
  providerType: string;
  grossAmount: number;
  orderCount: number;
  commissionPercentage: number;
  commissionAmount: number;
}

export interface AnalyticsOverview {
  revenue: RevenueByProviderType[];
  bookings: {
    activeAppointments: number;
    cancelledAppointments: number;
    activeCampRegistrations: number;
  };
  moderation: {
    pendingProviderApplications: number;
    flaggedProviders: number;
    pendingDeliveryPartners: number;
    openSupportTickets: number;
  };
  totalUsers: number;
}
