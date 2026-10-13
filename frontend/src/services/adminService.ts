import { api } from './apiClient';
import type { PaginationMeta } from '../types/api';
import type { AdminUser, CommissionRule, AuditLogEntry, AnalyticsOverview } from '../types/admin';

export async function listUsers(params: { role?: string; status?: string; search?: string } = {}): Promise<{
  users: AdminUser[];
  meta?: PaginationMeta;
}> {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  const { data, meta } = await api.get<{ users: AdminUser[] }>(`/admin/users?${query.toString()}`);
  return { users: data.users, meta };
}

export async function setUserStatus(id: string, status: 'active' | 'suspended'): Promise<AdminUser> {
  const { data } = await api.patch<{ user: AdminUser }>(`/admin/users/${id}/status`, { status });
  return data.user;
}

export async function listCommissionRules(): Promise<CommissionRule[]> {
  const { data } = await api.get<{ rules: CommissionRule[] }>('/admin/commission-rules');
  return data.rules;
}

export async function setCommissionRule(providerType: string, percentage: number): Promise<CommissionRule> {
  const { data } = await api.patch<{ rule: CommissionRule }>(`/admin/commission-rules/${providerType}`, { percentage });
  return data.rule;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>('/admin/analytics/overview');
  return data;
}

export async function listAuditLog(): Promise<{ entries: AuditLogEntry[]; meta?: PaginationMeta }> {
  const { data, meta } = await api.get<{ entries: AuditLogEntry[] }>('/admin/audit-log');
  return { entries: data.entries, meta };
}
