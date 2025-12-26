import express from 'express';
import serverUtilityRoutes from './serverUtility.js';
import gameRoutes from './game.router.js';
import gameModeRoutes from './gameMode.router.js';

const router = express.Router();

router.use('/utility', serverUtilityRoutes);
router.use('/game', gameRoutes);
router.use('/game-mode', gameModeRoutes);

export default router;
