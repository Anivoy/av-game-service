import { v4 as uuid } from 'uuid';
import prisma from '../db/index.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errorUtility.js';
import { calculateDistance, calculateScore } from '../utils/gameUtility.js';
import { fetchSceneById, fetchScenesFromService } from '../utils/sceneUtility.js';
import dayjs from 'dayjs';

const REDIS_SESSION_PREFIX = 'game:session:';
const REDIS_TTL = 3600; // 1 hr
const TOTAL_ROUNDS = 5;
const MAX_SCORE = 5000;

async function createGameSession(userId, data) {
  logger.info('Creating new game session', { userId, gameMode: data.gameMode });
  
  // Fetch random scenes
  const scenes = await fetchScenesFromService(TOTAL_ROUNDS);
  const sceneIds = scenes.map(s => s.id);
  
  const sessionId = uuid();
  const now = dayjs();
  
  const sessionData = {
    userId,
    status: 'active',
    gameMode: data.gameMode,
    currentRound: '1',
    totalRounds: TOTAL_ROUNDS.toString(),
    sceneIds: JSON.stringify(sceneIds),
    totalScore: '0',
    rounds: JSON.stringify([]),
    roundStartTime: now.toString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  // Store in Redis
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, sessionData);
  await redisClient.expire(`${REDIS_SESSION_PREFIX}${sessionId}`, REDIS_TTL);
  
  logger.info('Game session created successfully', { sessionId });
  
  // Get first scene minimal data
  const firstScene = scenes[0];
  
  return {
    sessionId,
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    sceneData: {
      id: firstScene.id,
      imageUrl: firstScene.images?.[0]?.url || null,
    },
  };
}

// Submit guess
async function submitGuess(sessionId, userId, data) {
  logger.info('Submitting guess', { sessionId, userId });
  
  // Get session from Redis
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  if (session.status !== 'active') {
    logger.warn('Game session is not active', { sessionId, status: session.status });
    throw new AppError('Game session is not active', 400);
  }
  
  // Check if current round already has a guess
  const rounds = JSON.parse(session.rounds || '[]');
  const currentRound = parseInt(session.currentRound);
  
  if (rounds.some(r => r.roundNumber === currentRound)) {
    logger.warn('Guess already submitted for this round', { sessionId, currentRound });
    throw new AppError('Guess already submitted for this round', 400);
  }
  
  // Get current scene
  const sceneIds = JSON.parse(session.sceneIds);
  const currentSceneId = sceneIds[currentRound - 1];
  const scene = await fetchSceneById(currentSceneId, false);
  
  // Calculate distance and score
  const distance = calculateDistance(
    data.latitude,
    data.longitude,
    scene.latitude,
    scene.longitude
  );
  const score = calculateScore(distance);
  
  // Calculate time spent
  const timeSpent = Math.floor((dayjs() - parseInt(session.roundStartTime)) / 1000);
  
  // Add round result
  const roundResult = {
    roundNumber: currentRound,
    sceneId: currentSceneId,
    userLat: data.latitude,
    userLng: data.longitude,
    distance,
    score,
    timeSpent,
    guessedAt: dayjs(),
  };
  
  rounds.push(roundResult);
  
  // Update Redis session
  const newTotalScore = parseInt(session.totalScore) + score;
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, {
    rounds: JSON.stringify(rounds),
    totalScore: newTotalScore.toString(),
    updatedAt: dayjs().toISOString(),
  });
  
  logger.info('Guess submitted successfully', { sessionId, roundNumber: currentRound, score });
  
  return {
    status: 'GuessRecorded',
    roundScore: score,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
  };
}

// Reveal scene details
async function revealScene(sessionId, userId) {
  logger.info('Revealing scene details', { sessionId, userId });
  
  // Get session from Redis
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  // Get last round data
  const rounds = JSON.parse(session.rounds || '[]');
  if (rounds.length === 0) {
    logger.warn('No rounds found in session', { sessionId });
    throw new AppError('No guess submitted yet', 400);
  }
  
  const currentRoundData = rounds[rounds.length - 1];
  
  // Get full scene details
  const sceneDetails = await fetchSceneById(currentRoundData.sceneId, false);
  
  // Check if game is over
  const isGameOver = parseInt(session.currentRound) >= TOTAL_ROUNDS;
  
  // If game is over, save to PostgreSQL and delete from Redis
  if (isGameOver) {
    await saveGameSessionToDatabase(sessionId, session, rounds);
    await redisClient.del(`${REDIS_SESSION_PREFIX}${sessionId}`);
    logger.info('Game session completed and saved to database', { sessionId });
  }
  
  return {
    isGameOver,
    roundScore: currentRoundData.score,
    distance: Math.round(currentRoundData.distance * 100) / 100,
    sceneDetails: {
      id: sceneDetails.id,
      name: sceneDetails.name,
      description: sceneDetails.description,
      animeTitle: sceneDetails.show?.title,
      location: {
        city: sceneDetails.city?.name,
        prefecture: sceneDetails.prefecture?.name,
        region: sceneDetails.region?.name,
      },
      latitude: sceneDetails.latitude,
      longitude: sceneDetails.longitude,
      imageUrl: sceneDetails.images?.[0]?.url || null,
      difficulty: sceneDetails.difficulty?.name,
    },
  };
}

// Move to next round
async function nextRound(sessionId, userId) {
  logger.info('Moving to next round', { sessionId, userId });
  
  // Get session from Redis
  const session = await redisClient.hgetall(`${REDIS_SESSION_PREFIX}${sessionId}`);
  
  if (!session || !session.userId) {
    logger.warn('Game session not found', { sessionId });
    throw new AppError('Game session not found or expired', 404);
  }
  
  if (session.userId !== userId) {
    logger.warn('Unauthorized access to game session', { sessionId, userId });
    throw new AppError('Unauthorized access to this game session', 403);
  }
  
  const currentRound = parseInt(session.currentRound);
  const nextRoundNumber = currentRound + 1;
  
  // Check if there are more rounds
  if (nextRoundNumber > TOTAL_ROUNDS) {
    logger.warn('No more rounds available', { sessionId, currentRound });
    return { isGameOver: true };
  }
  
  // Update current round and reset timer
  await redisClient.hset(`${REDIS_SESSION_PREFIX}${sessionId}`, {
    currentRound: nextRoundNumber.toString(),
    roundStartTime: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  });
  
  // Get next scene minimal data
  const sceneIds = JSON.parse(session.sceneIds);
  const nextSceneId = sceneIds[nextRoundNumber - 1];
  const scene = await fetchSceneById(nextSceneId, true);
  
  logger.info('Moved to next round successfully', { sessionId, nextRound: nextRoundNumber });
  
  return {
    isGameOver: false,
    currentRound: nextRoundNumber,
    totalRounds: TOTAL_ROUNDS,
    sceneData: {
      id: scene.id,
      imageUrl: scene.images?.[0]?.url || null,
    },
  };
}

// Save game session to database
async function saveGameSessionToDatabase(sessionId, redisSession, rounds) {
  logger.info('Saving game session to database', { sessionId });
  
  try {
    // Fetch actual locations for all scenes
    const scenesData = await Promise.all(
      rounds.map(r => fetchSceneById(r.sceneId, false))
    );
    
    const totalDuration = Math.floor((dayjs() - parseInt(redisSession.createdAt)) / 1000);
    const averageDistance = rounds.reduce((sum, r) => sum + r.distance, 0) / rounds.length;
    const perfectRounds = rounds.filter(r => r.score === MAX_SCORE).length;
    
    await prisma.gameSession.create({
      data: {
        id: sessionId,
        userId: redisSession.userId,
        gameMode: redisSession.gameMode,
        totalRounds: TOTAL_ROUNDS,
        status: 'COMPLETED',
        startedAt: new Date(parseInt(redisSession.createdAt)),
        completedAt: new Date(),
        totalDuration,
        finalScore: parseInt(redisSession.totalScore),
        averageDistance,
        perfectRounds,
        rounds: {
          create: rounds.map((r, idx) => ({
            roundNumber: r.roundNumber,
            sceneId: r.sceneId,
            guessLat: r.userLat,
            guessLng: r.userLng,
            actualLat: scenesData[idx].latitude,
            actualLng: scenesData[idx].longitude,
            actualLocation: `${scenesData[idx].city?.name || ''}, ${scenesData[idx].prefecture?.name || ''}`.trim(),
            distance: r.distance,
            score: r.score,
            timeSpent: r.timeSpent,
            guessedAt: new Date(r.guessedAt),
          })),
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
  
  return {
    sessionId: session.id,
    gameMode: session.gameMode,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalDuration: session.totalDuration,
    totalScore: session.finalScore,
    averageDistance: Math.round(session.averageDistance * 100) / 100,
    perfectRounds: session.perfectRounds,
    rounds: session.rounds.map(r => ({
      roundNumber: r.roundNumber,
      sceneId: r.sceneId,
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
    })),
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
        gameMode: true,
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
    data: sessions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default {
  createGameSession,
  submitGuess,
  revealScene,
  nextRound,
  getGameHistory,
  getUserGameHistory,
};