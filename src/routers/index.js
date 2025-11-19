import express from 'express';
import serverUtilityRoutes from './serverUtility.js';
import gameRoutes from './game.router.js';

const router = express.Router();

router.use('/utility', serverUtilityRoutes);
router.use('/game', gameRoutes);

export default router;
