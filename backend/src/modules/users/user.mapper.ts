import type { UserDoc } from './user.model';

export function toPublicUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
