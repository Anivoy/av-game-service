import gameService from '../services/game.service.js';
import { getUserId, validate } from '../utils/controllerUtility.js';
import {
  createGameSessionSchema,
  submitGuessSchema,
  sessionIdParamSchema,
  getHistoryQuerySchema,
} from '../validations/game.validation.js';

async function getGameSession(req, res, next) {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    const result = await gameService.getGameSession(sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Game session retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

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

export default {
  getGameSession: [
    validate(sessionIdParamSchema, 'params'),
    getGameSession
  ],
  createGameSession: [
    validate(createGameSessionSchema, 'body'),
    createGameSession,
  ],
  submitGuess: [
    validate(sessionIdParamSchema, 'params'),
    validate(submitGuessSchema, 'body'),
    submitGuess,
  ],
  revealScene: [
    validate(sessionIdParamSchema, 'params'),
    revealScene,
  ],
  nextRound: [
    validate(sessionIdParamSchema, 'params'),
    nextRound,
  ],
  getGameHistory: [
    validate(sessionIdParamSchema, 'params'),
    getGameHistory,
  ],
  getUserGameHistory: [
    validate(getHistoryQuerySchema, 'query'),
    getUserGameHistory,
  ],
};