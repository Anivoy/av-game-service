import gameService from '../services/game.service.js';
import {
  createGameSessionSchema,
  submitGuessSchema,
  sessionIdParamSchema,
  getHistoryQuerySchema,
} from '../validations/game.validation.js';
import { AppError } from '../utils/errorUtility.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      if (!(source in req)) {
        throw new AppError(`Invalid validation source: ${source}`, 500);
      }

      const validated = schema.parse(req[source]);
      req[source] = validated;
      next();
    } catch (err) {
      next(err);
    }
  };
}

const getUserId = (req) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    throw new AppError('User ID not found in request headers', 401);
  }
  return userId;
};

async function createGameSession(req, res, next) {
  try {
    const userId = getUserId(req);
    const result = await gameService.createGameSession(userId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Game session created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function submitGuess(req, res, next) {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    
    const result = await gameService.submitGuess(sessionId, userId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Guess submitted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function revealScene(req, res, next) {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    
    const result = await gameService.revealScene(sessionId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Scene revealed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function nextRound(req, res, next) {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    
    const result = await gameService.nextRound(sessionId, userId);
    
    res.status(200).json({
      success: true,
      message: result.isGameOver ? 'Game completed' : 'Moved to next round',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getGameHistory(req, res, next) {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    
    const result = await gameService.getGameHistory(sessionId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Game history retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserGameHistory(req, res, next) {
  try {
    const userId = getUserId(req);
    
    const result = await gameService.getUserGameHistory(userId, req.query);
    
    res.status(200).json({
      success: true,
      message: 'User game history retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createGameSession: [
    validate(createGameSessionSchema, 'body'),
    createGameSession,
  ],
  submitGuess: [
    validate(sessionIdParamSchema.transform(sessionId => ({ sessionId })), 'params'),
    validate(submitGuessSchema, 'body'),
    submitGuess,
  ],
  revealScene: [
    validate(sessionIdParamSchema.transform(sessionId => ({ sessionId })), 'params'),
    revealScene,
  ],
  nextRound: [
    validate(sessionIdParamSchema.transform(sessionId => ({ sessionId })), 'params'),
    nextRound,
  ],
  getGameHistory: [
    validate(sessionIdParamSchema.transform(sessionId => ({ sessionId })), 'params'),
    getGameHistory,
  ],
  getUserGameHistory: [
    validate(getHistoryQuerySchema, 'query'),
    getUserGameHistory,
  ],
};