import prisma from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import slugify from 'slugify';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errorUtility.js';

async function createGameMode(data) {
  logger.info('Creating new game mode', { title: data.title });

  const orConditions = [{ title: data.title }];

  if (data.order === 1) {
    orConditions.push({ order: 1 });
  }

  const conflict = await prisma.gameMode.findFirst({
    where: { OR: orConditions },
  });

  if (conflict) {
    if (conflict.title === data.title) {
      logger.warn('Game mode with this name already exists', {
        title: data.title,
      });
      throw new AppError('Game mode with this title already exists', 400);
    }

    if (data.order === 1 && conflict.order === 1) {
      logger.warn('Game mode with order = 1 already exists', {
        order: data.order,
      });
      throw new AppError('A game mode with order = 1 already exists', 400);
    }
  }

  const slug = slugify(data.title, {
    lower: true,
    strict: true,
  });
  const unique = uuidv4().split('-')[0];
  const finalId = `${slug}-${unique}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const gm = await tx.gameMode.create({
        data: {
          id: finalId,
          title: data.title,
          description: data.description,
          playTimeEstimateMinutes: data.playTimeEstimateMinutes,
          rewardMultiplier: data.rewardMultiplier,
          order: data.order,
        },
      });

      await tx.sceneQueryConfig.create({
        data: {
          gameModeId: gm.id,
          count: data.sceneQueryConfig.count,
          showId: data.sceneQueryConfig.showId || null,
          regionId: data.sceneQueryConfig.regionId || null,
          prefectureId: data.sceneQueryConfig.prefectureId || null,
          cityId: data.sceneQueryConfig.cityId || null,
          difficultyWeights: data.sceneQueryConfig.difficultyWeights || [],
        },
      });

      return gm;
    });

    logger.info('Game mode created successfully', { id: result.id });
    return result;
  } catch (error) {
    logger.error('Game mode creation failed', { error: error.message });
    throw error;
  }
}

async function updateGameMode(id, data) {
  logger.info('Updating game mode', { id });

  const existing = await prisma.gameMode.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Game mode not found', 404);
  }

  const orConditions = [{ title: data.title }];

  if (data.order === 1) {
    orConditions.push({ order: 1 });
  }

  const conflict = await prisma.gameMode.findFirst({
    where: {
      id: { not: id },
      OR: orConditions,
    },
  });

  if (conflict) {
    if (conflict.title === data.title) {
      logger.warn('Game mode with this name already exists', {
        title: data.title,
      });
      throw new AppError('Game mode with this title already exists', 400);
    }

    if (data.order === 1 && conflict.order === 1) {
      logger.warn('Game mode with order = 1 already exists', {
        order: data.order,
      });
      throw new AppError('A game mode with order = 1 already exists', 400);
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const gm = await tx.gameMode.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.playTimeEstimateMinutes !== undefined && {
            playTimeEstimateMinutes: data.playTimeEstimateMinutes,
          }),
          ...(data.rewardMultiplier !== undefined && {
            rewardMultiplier: data.rewardMultiplier,
          }),
          ...(data.order !== undefined && { order: data.order }),
        },
      });

      if (data.sceneQueryConfig) {
        await tx.sceneQueryConfig.update({
          where: { gameModeId: id },
          data: {
            ...(data.sceneQueryConfig.count !== undefined && {
              count: data.sceneQueryConfig.count,
            }),
            ...(data.sceneQueryConfig.showId !== undefined && {
              showId: data.sceneQueryConfig.showId,
            }),
            ...(data.sceneQueryConfig.regionId !== undefined && {
              regionId: data.sceneQueryConfig.regionId,
            }),
            ...(data.sceneQueryConfig.prefectureId !== undefined && {
              prefectureId: data.sceneQueryConfig.prefectureId,
            }),
            ...(data.sceneQueryConfig.cityId !== undefined && {
              cityId: data.sceneQueryConfig.cityId,
            }),
            ...(data.sceneQueryConfig.difficultyWeights !== undefined && {
              difficultyWeights: data.sceneQueryConfig.difficultyWeights,
            }),
          },
        });
      }

      return gm;
    });

    logger.info('Game mode updated successfully', { id });
    return updated;
  } catch (error) {
    logger.error('Game mode update failed', { error: error.message });
    throw error;
  }
}

async function deleteGameMode(id) {
  logger.info('Deleting game mode', { id });

  const existing = await prisma.gameMode.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Game mode not found', 404);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sceneQueryConfig.delete({ where: { gameModeId: id } });
      await tx.gameMode.delete({ where: { id } });
    });

    logger.info('Game mode deleted successfully', { id });
    return { id };
  } catch (error) {
    logger.error('Game mode deletion failed', { error });
    throw error;
  }
}

async function getGameModeById(id) {
  logger.info('Fetching gameMode by ID', { id });

  const gm = await prisma.gameMode.findUnique({
    where: { id },
    include: { sceneQueryConfig: true },
  });

  if (!gm) {
    throw new AppError('Game mode not found', 404);
  }

  return gm;
}

async function getGameModesByIds(ids) {
  logger.info('Fetching gameModes by IDS', { count: ids.length });

  const gms = await prisma.gameMode.findMany({
    where: { id: { in: ids } },
    include: { sceneQueryConfig: true },
  });

  if (gms.length === 0) {
    throw new AppError('No game modes found for given IDs', 404);
  }

  return gms;
}

async function listGameModes(query) {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const fetchAll = !limit || limit === 0;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  if (fetchAll) {
    const gameModes = await prisma.gameMode.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { sceneQueryConfig: true },
    });

    return { data: gameModes };
  }

  const skip = (page - 1) * limit;

  const [gameModes, total] = await Promise.all([
    prisma.gameMode.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.gameMode.count({ where }),
  ]);

  logger.info('Game modes fetched successfully', {
    count: gameModes.length,
    total,
  });

  return {
    data: gameModes,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default {
  createGameMode,
  updateGameMode,
  deleteGameMode,
  getGameModeById,
  getGameModesByIds,
  listGameModes,
};
