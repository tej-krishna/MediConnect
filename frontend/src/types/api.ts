export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
