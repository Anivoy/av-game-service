import { z } from 'zod';

export const createGameSessionSchema = z.object({
  gameMode: z.string().min(1, "Game mode cannot be empty").optional(),
});

export const submitGuessSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.uuid('Invalid session ID format'),
});

export const getHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
});