import express from 'express';
import {
  createGameMode,
  deleteGameMode,
  getGameModeById,
  getGameModesByIds,
  listGameModes,
  updateGameMode,
} from '../controllers/gameMode.controller.js';

const router = express.Router();

router.post('/create', createGameMode);
router.get('/', listGameModes);
router.post('/', getGameModesByIds);
router.get('/id/:id', getGameModeById);
router.patch('/id/:id', updateGameMode);
router.delete('/id/:id', deleteGameMode);

export default router;
