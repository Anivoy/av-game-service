import { z } from 'zod';

export const difficultyWeightSchema = z.object({
  difficultyId: z.uuid('Invalid difficulty ID format'),
  weight: z.number().min(0, 'Weight must be non-negative').max(1, 'Weight must be at most 1'),
});

export const sceneQueryConfigSchema = z.object({
  count: z.number().int().min(1, 'Count must be at least 1').max(20, 'Count must be at most 20').default(5),
  showId: z.uuid('Invalid show ID format').optional().nullable(),
  regionId: z.uuid('Invalid region ID format').optional().nullable(),
  prefectureId: z.uuid('Invalid prefecture ID format').optional().nullable(),
  cityId: z.uuid('Invalid city ID format').optional().nullable(),
  difficultyWeights: z.array(difficultyWeightSchema).optional().default([]),
});

export const createGameModeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional().nullable(),

  sceneQueryConfig: sceneQueryConfigSchema,

  playTimeEstimateMinutes: z
    .number()
    .int()
    .min(1, 'Must be a positive integer')
    .optional()
    .nullable(),
  order: z.number().int().min(1, 'Must be a positive integer'),
});

export const updateGameModeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long').optional(),
  description: z.string().optional().nullable(),

  sceneQueryConfig: sceneQueryConfigSchema.partial().optional(),

  playTimeEstimateMinutes: z
    .number()
    .int()
    .min(1, 'Must be a positive integer')
    .optional()
    .nullable(),
  order: z.number().int().min(1, 'Must be a positive integer').optional(),
});

export const listGameModesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'order', 'playTimeEstimateMinutes', 'count', 'createdAt', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const idParamSchema = z.string().min(1, 'Game mode ID is required');

export const idsParamSchema = z
  .array(z.string().min(1, 'ID cannot be empty'))
  .min(1, 'At least one ID is required');
