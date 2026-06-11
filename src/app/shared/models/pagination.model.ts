export interface PagedRequest {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
}

export interface PagedResponse<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}
