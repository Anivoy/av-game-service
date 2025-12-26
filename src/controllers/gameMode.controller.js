import gameModeService from '../services/gameMode.service.js';
import {
  createGameModeSchema,
  updateGameModeSchema,
  listGameModesQuerySchema,
  idParamSchema,
  idsParamSchema,
} from '../validations/gameMode.validation.js';

export async function createGameMode(req, res, next) {
  try {
    const validatedData = createGameModeSchema.parse(req.body);
    const result = await gameModeService.createGameMode(validatedData);

    res.status(201).json({
      success: true,
      message: 'Game mode created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateGameMode(req, res, next) {
  try {
    const validatedId = idParamSchema.parse(req.params.id);
    const validatedData = updateGameModeSchema.parse(req.body);
    const result = await gameModeService.updateGameMode(validatedId, validatedData);

    res.status(200).json({
      success: true,
      message: 'Game mode updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGameMode(req, res, next) {
  try {
    const validatedId = idParamSchema.parse(req.params.id);
    const result = await gameModeService.deleteGameMode(validatedId);

    res.status(200).json({
      success: true,
      message: 'Game mode deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGameModeById(req, res, next) {
  try {
    const validatedId = idParamSchema.parse(req.params.id);
    const result = await gameModeService.getGameModeById(validatedId);

    res.status(200).json({
      success: true,
      message: `Game mode ID: ${validatedId} has been retrieved`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGameModesByIds(req, res, next) {
  try {
    const validatedIds = idsParamSchema.parse(req.body.ids);
    const result = await gameModeService.getGameModesByIds(validatedIds);

    res.status(200).json({
      success: true,
      message: `Game modes has been retrieved`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listGameModes(req, res, next) {
  try {
    const validatedQuery = listGameModesQuerySchema.parse(req.query);
    const result = await gameModeService.listGameModes(validatedQuery);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
