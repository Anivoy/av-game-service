import { v4 as uuid } from 'uuid';
import prisma from '../db/index.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errorUtility.js';
import { buildActualLocation, calculateDistance, calculateScore } from '../utils/gameUtility.js';
import { fetchSceneById, fetchSceneByIds, fetchScenesFromService } from '../utils/sceneUtility.js';
import dayjs from 'dayjs';

const REDIS_SESSION_PREFIX = 'game:session:';
const REDIS_TTL = 3600; // 1 hr
const MAX_SCORE = 5000;

function normalizeSessionResponse(session, guessingScene = null, revealedScene = null, lastRoundResult = null) {
  const currentRound = parseInt(session.currentRound);
  const totalRounds = parseInt(session.totalRounds);
  const isGameOver = session.currentRoundState === "REVEALED" && currentRound >= totalRounds;

  const response = {
    sessionId: session.sessionId || session.id,
    gameModeId: session.gameModeId,
    gameMode: session.gameMode,
    status: session.status,
    currentRound,
    currentRoundState: session.currentRoundState,
    totalRounds,
    totalScore: parseInt(session.totalScore),
    isGameOver,
    guessingScene: null,
    revealedScene: null,
    lastRoundResult,
  };

  if (guessingScene) {
    response.guessingScene = {
      id: guessingScene.id,
      snippet: guessingScene?.imagePairs?.snippetUrl || null,
    };
  }

  if (revealedScene) {
    response.revealedScene = {
      id: revealedScene.id,
      name: revealedScene.name,
      description: revealedScene.description,
      showTitle: revealedScene.show?.title,
      location: {
        city: revealedScene.city?.name,
        prefecture: revealedScene.prefecture?.name,
        region: revealedScene.region?.name,
      },
      latitude: revealedScene.latitude,
      longitude: revealedScene.longitude,
      snippet: revealedScene?.imagePairs?.snippetUrl || null,
      reference: revealedScene?.imagePairs?.referenceUrl || null,
      difficulty: revealedScene.difficulty,
    };
  }

  return response;
}

async function getGameSession(sessionId, userId) {
  logger.info('Fetching game session state', { sessionId, userId });

  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);

  if (!session || !session.userId) {
    throw new AppError('Game session not found or expired', 404);
  }

  if (session.userId !== userId) {
    throw new AppError('Unauthorized access to this game session', 403);
  }

  if (session.status !== 'ACTIVE') {
    throw new AppError('Game session is not active', 400);
  }

  const currentRound = parseInt(session.currentRound);
  const totalRounds = parseInt(session.totalRounds);
  const sceneIds = JSON.parse(session.sceneIds);

  let guessingScene = null;
  let revealedScene = null;
  let lastRoundResult = null;

  if (currentRound <= totalRounds) {
    const currentSceneId = sceneIds[currentRound - 1];

    if (session.currentRoundState === 'GUESSING') {
      guessingScene = await fetchSceneById(currentSceneId, true);
    } else if (session.currentRoundState === 'REVEALED') {
      revealedScene = await fetchSceneById(currentSceneId, false);
      
      const rounds = JSON.parse(session.rounds || '[]');
      const lastRound = rounds.find(r => r.roundNumber === currentRound);
      
      if (lastRound) {
        lastRoundResult = {
          score: lastRound.score,
          distance: Math.round(lastRound.distance * 100) / 100,
          timeSpent: lastRound.timeSpent,
          guessedAt: lastRound.guessedAt,
          guess: {
            latitude: lastRound.userLat,
            longitude: lastRound.userLng,
          },
        };
      }
    }
  }

  return normalizeSessionResponse(
    { ...session, sessionId },
    guessingScene,
    revealedScene,
    lastRoundResult
  );
}

async function createGameSession(userId, data) {
  logger.info('Creating new game session', { userId, gameModeId: data.gameMode });

  let gameMode;

  if (data.gameMode) {
    gameMode = await prisma.gameMode.findUnique({
      where: { id: data.gameMode },
      include: { sceneQueryConfig: true },
    });
  } else {
    logger.info('No gameMode provided, defaulting to Quick Play');

    gameMode = await prisma.gameMode.findFirst({
      where: { order: 1 },
      include: { sceneQueryConfig: true },
    });
  }

  if (!gameMode) {
    logger.warn('Game mode not found', { gameModeId: data.gameMode });
    throw new AppError('Game mode not found', 404);
  }

  if (!gameMode.sceneQueryConfig) {
    logger.warn('Game mode has no scene query config', { gameModeId: gameMode.id });
    throw new AppError('Game mode is not properly configured', 400);
  }
  
  const sceneConfig = gameMode.sceneQueryConfig;
  const totalRounds = sceneConfig.count;
  
  const sceneQuery = {
    count: totalRounds,
  };
  
  if (sceneConfig.showId) {
    sceneQuery.showId = sceneConfig.showId;
  }
  if (sceneConfig.cityId) {
    sceneQuery.cityId = sceneConfig.cityId;
  }
  if (sceneConfig.prefectureId) {
    sceneQuery.prefectureId = sceneConfig.prefectureId;
  }
  if (sceneConfig.regionId) {
    sceneQuery.regionId = sceneConfig.regionId;
  }
  
  const difficultyWeights = Array.isArray(sceneConfig.difficultyWeights) 
    ? sceneConfig.difficultyWeights 
    : [];
  
  if (difficultyWeights.length > 0) {
    sceneQuery.difficultyWeights = difficultyWeights;
  }
  
  // Fetch random scenes with filters
  const scenes = await fetchScenesFromService(sceneQuery);
  
  if (!scenes || scenes.length < totalRounds) {
    logger.warn('Not enough scenes returned from Scene Service', {
      expected: totalRounds,
      received: scenes?.length || 0,
    });
    throw new AppError('Unable to fetch enough scenes for this game mode', 503);
  }
  
  const sceneIds = scenes.map(s => s.id);
  
  const sessionId = uuid();
  const now = dayjs();
  
  const sessionData = {
    userId,
    status: 'ACTIVE',
    gameModeId: gameMode.id,
    gameMode: gameMode.title,
    currentRound: '1',
    currentRoundState: 'GUESSING',
    totalRounds: totalRounds.toString(),
    sceneIds: JSON.stringify(sceneIds),
    totalScore: '0',
    rounds: JSON.stringify([]),
    roundStartTime: now.valueOf().toString(),
    createdAt: now.valueOf().toString(),
    updatedAt: now.toISOString(),
  };
  
  // Store in Redis
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, sessionData);
  await redisClient.expire(`${REDIS_SESSION_PREFIX}${sessionId}`, REDIS_TTL);
  
  logger.info('Game session created successfully', { sessionId, gameMode: gameMode.title });
  
  // Get first scene minimal data
  const firstScene = scenes[0];
  
  return normalizeSessionResponse(
    { ...sessionData, sessionId },
    firstScene,
    null
  );
}

// Submit guess
async function submitGuess(sessionId, userId, data) {
  logger.info('Submitting guess', { sessionId, userId });
  
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  if (session.status !== 'ACTIVE') {
    logger.warn('Game session is not active', { sessionId, status: session.status });
    throw new AppError('Game session is not active', 400);
  }
  
  if (session.currentRoundState !== 'GUESSING') {
    logger.warn('Cannot submit guess - round is not in GUESSING state', { 
      sessionId, 
      currentRoundState: session.currentRoundState 
    });
    throw new AppError('Guess already submitted for this round', 400);
  }
  
  const currentRound = parseInt(session.currentRound);
  const sceneIds = JSON.parse(session.sceneIds);
  const currentSceneId = sceneIds[currentRound - 1];
  const scene = await fetchSceneById(currentSceneId, false);
  
  const distance = calculateDistance(
    data.latitude,
    data.longitude,
    scene.latitude,
    scene.longitude
  );
  const score = calculateScore(distance, {
    maxScore: MAX_SCORE,
    difficultyMultiplier: scene?.difficulty?.multiplier ?? 1,
  });
  
  const roundStartTime = parseInt(session.roundStartTime);
  const timeSpent = Math.floor((dayjs().valueOf() - roundStartTime) / 1000);
  
  const roundResult = {
    roundNumber: currentRound,
    sceneId: currentSceneId,
    userLat: data.latitude,
    userLng: data.longitude,
    distance,
    score,
    timeSpent,
    guessedAt: dayjs().toISOString(),
  };
  
  const rounds = JSON.parse(session.rounds || '[]');
  rounds.push(roundResult);
  
  const newTotalScore = parseInt(session.totalScore) + score;
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, {
    currentRoundState: 'REVEALED',
    rounds: JSON.stringify(rounds),
    totalScore: newTotalScore.toString(),
    updatedAt: dayjs().toISOString(),
  });
  
  logger.info('Guess submitted successfully', { sessionId, roundNumber: currentRound, score });
  
  return {
    roundScore: score,
    distance: Math.round(distance * 100) / 100,
    timeSpent,
  };
}

// Reveal scene details
async function revealScene(sessionId, userId) {
  logger.info('Revealing scene details', { sessionId, userId });
  
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  if (session.currentRoundState !== 'REVEALED') {
    logger.warn('Cannot reveal scene - no guess submitted yet', { 
      sessionId, 
      currentRoundState: session.currentRoundState 
    });
    throw new AppError('No guess submitted yet', 400);
  }
  
  const rounds = JSON.parse(session.rounds || '[]');
  const currentRound = parseInt(session.currentRound);
  const currentRoundData = rounds.find(r => r.roundNumber === currentRound);

  if (!currentRoundData) {
    logger.warn('No guess submitted for current round', { sessionId, currentRound });
    throw new AppError('No guess submitted for this round', 400);
  }

  const sceneDetails = await fetchSceneById(currentRoundData.sceneId, false);
  
  const lastRoundResult = {
    score: currentRoundData.score,
    distance: Math.round(currentRoundData.distance * 100) / 100,
    timeSpent: currentRoundData.timeSpent,
    guessedAt: currentRoundData.guessedAt,
    guess: {
      latitude: currentRoundData.userLat,
      longitude: currentRoundData.userLng,
    },
  };

  return normalizeSessionResponse(
    { ...session, sessionId },
    null,
    sceneDetails,
    lastRoundResult
  );
}

// Move to next round
async function nextRound(sessionId, userId) {
  logger.info('Moving to next round', { sessionId, userId });
  
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  if (session.currentRoundState !== 'REVEALED') {
    logger.warn('Cannot proceed to next round - current round not revealed', { 
      sessionId, 
      currentRoundState: session.currentRoundState 
    });
    throw new AppError('You must submit a guess before proceeding to the next round', 400);
  }

  const currentRound = parseInt(session.currentRound);
  const totalRounds = parseInt(session.totalRounds);

  const isLastRound = currentRound >= totalRounds;

  if (isLastRound) {
    logger.info('Finalizing game session', { sessionId });

    const rounds = JSON.parse(session.rounds || '[]');

    await saveGameSessionToDatabase(sessionId, session, rounds);
    await redisClient.del(`${REDIS_SESSION_PREFIX}${sessionId}`);

    return {
      isGameOver: true,
      sessionId,
    };
  }

  const nextRoundNumber = currentRound + 1;
  
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, {
    currentRound: nextRoundNumber.toString(),
    currentRoundState: 'GUESSING',
    roundStartTime: dayjs().valueOf().toString(),
    updatedAt: dayjs().toISOString(),
  });
  
  const sceneIds = JSON.parse(session.sceneIds);
  const nextSceneId = sceneIds[nextRoundNumber - 1];
  const scene = await fetchSceneById(nextSceneId, true);
  
  logger.info('Moved to next round successfully', { sessionId, nextRound: nextRoundNumber });
  
  return normalizeSessionResponse(
    { 
      ...session, 
      sessionId,
      currentRound: nextRoundNumber.toString(),
      currentRoundState: 'GUESSING'
    },
    scene,
    null
  );
}

// Save game session to database
async function saveGameSessionToDatabase(sessionId, redisSession, rounds) {
  logger.info('Saving game session to database', { sessionId });
  
  try {
    const scenesData = await Promise.all(
      rounds.map(r => fetchSceneById(r.sceneId, false))
    );
    
    const startedAt = new Date(parseInt(redisSession.createdAt));
    const completedAt = new Date();
    const totalDuration = Math.floor((completedAt - startedAt) / 1000);
    const averageDistance = rounds.reduce((sum, r) => sum + r.distance, 0) / rounds.length;
    const perfectRounds = rounds.filter(r => r.score === MAX_SCORE).length;
    const totalRounds = parseInt(redisSession.totalRounds);
    
    await prisma.gameSession.create({
      data: {
        id: sessionId,
        userId: redisSession.userId,
        gameModeId: redisSession.gameModeId,
        totalRounds,
        status: 'COMPLETED',
        startedAt,
        completedAt,
        totalDuration,
        finalScore: parseInt(redisSession.totalScore),
        averageDistance,
        perfectRounds,
        rounds: {
          create: rounds.map((r, idx) => {
            const sceneData = scenesData[idx];
            const { region, prefecture, city, latitude, longitude } = sceneData;

            return {
              roundNumber: r.roundNumber,
              sceneId: r.sceneId,
              guessLat: r.userLat,
              guessLng: r.userLng,
              actualLat: latitude,
              actualLng: longitude,
              actualLocation: buildActualLocation({
                city,
                prefecture,
                region
              }),
              distance: r.distance,
              score: r.score,
              timeSpent: r.timeSpent,
              guessedAt: new Date(r.guessedAt),
            };
          }),
        },
      },
    });
    
    logger.info('Game session saved to database successfully', { sessionId });
  } catch (error) {
    logger.error('Error saving game session to database', { error: error.message, sessionId });
    throw new AppError('Failed to save game session', 500);
  }
}

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

  const scenes = await fetchSceneByIds(session.rounds.map((r) => r.sceneId), true);
  const sceneLookup = new Map(scenes.map((s) => [s.id, s]));

  const rounds = session.rounds.map(r => ({
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
    rounds
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
  
  logger.info('User game history fetched successfully', { userId, count: sessions.length, total });
  
  return {
    data: sessions.map(s => ({
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

export default {
  getGameSession,
  createGameSession,
  submitGuess,
  revealScene,
  nextRound,
  getGameHistory,
  getUserGameHistory,
};