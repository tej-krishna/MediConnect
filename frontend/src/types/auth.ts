export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: string[];
  status: string;
  createdAt: string;
}
