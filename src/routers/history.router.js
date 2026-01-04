import express from 'express';
import historyController from '../controllers/history.controller.js';

const router = express.Router();

router.get('/session/:sessionId', historyController.getGameHistory);
router.get('/session/:sessionId/round/:roundNumber', historyController.getGameRound);
router.get('/session', historyController.getUserGameHistory);

export default router;