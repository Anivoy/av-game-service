import historyService from '../services/history.service.js';
import { getUserId, validate } from '../utils/controllerUtility.js';
import {
  sessionIdParamSchema,
  roundIdParamSchema,
  getHistoryQuerySchema,
} from '../validations/history.validation.js';

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

async function getGameRound(req, res, next) {
  try {
    const userId = getUserId(req);
    const { roundId, sessionId } = req.params;

    const result = await historyService.getGameRound(roundId, sessionId, userId);

    res.status(200).json({
      success: true,
      message: 'Game round retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getGameHistory: [validate(sessionIdParamSchema, 'params'), getGameHistory],
  getGameRound: [validate(roundIdParamSchema, 'params'), getGameRound],
  getUserGameHistory: [validate(getHistoryQuerySchema, 'query'), getUserGameHistory],
};
