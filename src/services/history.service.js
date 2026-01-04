import prisma from '../db/index.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errorUtility.js';
import { fetchSceneById, fetchSceneByIds } from '../utils/sceneUtility.js';

// Get game history
async function getGameHistory(sessionId, userId) {
  logger.info('Fetching game history', { sessionId, userId });

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      gameMode: {
        select: {
          id: true,
          title: true,
          description: true,
        },
      },
      rounds: {
        orderBy: { roundNumber: 'asc' },
      },
    },
  });

  if (!session) {
    logger.warn('Game session not found in database', { sessionId });
    throw new AppError('Game session not found', 404);
  }

  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game history', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }

  const scenes = await fetchSceneByIds(
    session.rounds.map((r) => r.sceneId),
    { minimal: true },
  );
  const sceneLookup = new Map(scenes.map((s) => [s.id, s]));

  const rounds = session.rounds.map((r) => ({
    roundNumber: r.roundNumber,
    sceneId: r.sceneId,
    scene: sceneLookup.get(r.sceneId) || null,
    guess: {
      latitude: r.guessLat,
      longitude: r.guessLng,
    },
    actual: {
      latitude: r.actualLat,
      longitude: r.actualLng,
      location: r.actualLocation,
    },
    distance: Math.round(r.distance * 100) / 100,
    score: r.score,
    timeSpent: r.timeSpent,
    guessedAt: r.guessedAt,
  }));

  return {
    sessionId: session.id,
    gameMode: {
      id: session.gameMode.id,
      title: session.gameMode.title,
      description: session.gameMode.description,
    },
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalDuration: session.totalDuration,
    totalScore: session.finalScore,
    averageDistance: Math.round(session.averageDistance * 100) / 100,
    perfectRounds: session.perfectRounds,
    rounds,
  };
}

// Get user game history list
async function getUserGameHistory(userId, query) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  logger.info('Fetching user game history', { userId, page, limit });

  const [sessions, total] = await Promise.all([
    prisma.gameSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        gameMode: {
          select: {
            id: true,
            title: true,
          },
        },
        status: true,
        startedAt: true,
        completedAt: true,
        totalDuration: true,
        finalScore: true,
        averageDistance: true,
        perfectRounds: true,
        totalRounds: true,
      },
    }),
    prisma.gameSession.count({ where: { userId } }),
  ]);

  logger.info('User game history fetched successfully', {
    userId,
    count: sessions.length,
    total,
  });

  return {
    data: sessions.map((s) => ({
      id: s.id,
      gameMode: s.gameMode,
      status: s.status,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      totalDuration: s.totalDuration,
      finalScore: s.finalScore,
      averageDistance: Math.round(s.averageDistance * 100) / 100,
      perfectRounds: s.perfectRounds,
      totalRounds: s.totalRounds,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getGameRound(roundId, sessionId, userId) {
  logger.info('Fetching game round history', { roundId, sessionId, userId });

  const session = await prisma.gameSession.findUnique({
    where: { sessionId, userId },
    select: { id: true },
  });

  if (!session) {
    logger.warn('Game session not found in database', { sessionId });
    throw new AppError('Game session not found', 404);
  }

  const round = await prisma.gameRound.findUnique({
    where: { id: roundId, sessionId },
  });

  if (!round) {
    logger.warn('Game round not found in database', { roundId });
    throw new AppError('Game round not found', 404);
  }

  const scene = await fetchSceneById(round.sceneId);

  if (!scene) {
    logger.warn('Scene not found in scene database', { sceneId: round.sceneId });
  };

  delete round.sceneId;
  delete round.id;

  const result = {
    ...round,
    scene: {
      name: scene.name,
      description: scene.description,
      show: {
        title: scene.show?.title,
        alternativeTitle: scene.show?.alternativeTitle,
        synopsis: scene.show?.synopsis,
        genres: (scene.show?.genres ?? []).map((g) => g.name),
        cover: scene.show?.cover,
      },
      location: {
        city: scene.city?.name,
        prefecture: scene.prefecture?.name,
        region: scene.region?.name,
      },
      latitude: scene.latitude,
      longitude: scene.longitude,
      snippet: scene.imagePairs?.snippetUrl || null,
      reference: scene.imagePairs?.referenceUrl || null,
      difficulty: scene.difficulty,
    }
  };

  return result;
}

export default {
  getGameHistory,
  getUserGameHistory,
  getGameRound,
};
