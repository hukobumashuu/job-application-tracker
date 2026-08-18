import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function getOffset({ page, limit }: PaginationQuery): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(total: number, { page, limit }: PaginationQuery) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
