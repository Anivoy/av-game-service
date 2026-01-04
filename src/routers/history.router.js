import express from 'express';
import historyController from '../controllers/history.controller.js';

const router = express.Router();

router.get('/history/:sessionId', historyController.getGameHistory);
router.get('/history/:sessionId/round/:roundId', historyController.getGameRound);
router.get('/history', historyController.getUserGameHistory);

export default router;