import express from 'express';
import gameController from '../controllers/game.controller.js';

const router = express.Router();

router.post('/session', gameController.createGameSession);
router.post('/session/:sessionId/guess', gameController.submitGuess);
router.get('/session/:sessionId/reveal', gameController.revealScene);
router.post('/session/:sessionId/next', gameController.nextRound);
router.get('/history/:sessionId', gameController.getGameHistory);
router.get('/history', gameController.getUserGameHistory);

export default router;