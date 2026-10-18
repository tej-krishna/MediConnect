import type { OwnerProviderApplication } from '../types/provider';

/** Where an "I run a business on MediConnect" user should land instead of the patient account page. */
export function getProviderHomePath(applications: OwnerProviderApplication[]): string | null {
  const approved = applications.find((app) => app.status === 'approved');
  return approved ? `/provider/${approved.id}` : null;
}
