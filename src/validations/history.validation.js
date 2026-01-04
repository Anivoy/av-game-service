import z from 'zod';

export const sessionIdParamSchema = z.object({
  sessionId: z.uuid('Invalid session ID format'),
});

export const roundIdParamSchema = z.object({
  roundId: z.uuid('Invalid round ID format'),
  sessionId: z.uuid('Invalid session ID format'),
});

export const getHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
});
