import axios from 'axios';
import { AppError } from '../utils/errorUtility.js';
import { serviceConfig } from '../config/env.js';

export async function fetchScenesFromService(count) {
  try {
    logger.info('Fetching random scenes from Scene Service', { count });
    const response = await axios.post(
      `${serviceConfig.SCENE_SERVICE_URL}/api/v1/scene/random`,
      {
        count,
      },
    );

    if (!response.data.success || !response.data.data) {
      throw new AppError('Failed to fetch scenes from Scene Service', 500);
    }

    return response.data.data;
  } catch (error) {
    logger.error('Error fetching scenes from Scene Service', { error: error.message });
    throw new AppError('Scene Service is unavailable', 503);
  }
}

export async function fetchSceneById(sceneId, minimal = false) {
  try {
    logger.info('Fetching scene by ID from Scene Service', { sceneId, minimal });
    const url = `${serviceConfig.SCENE_SERVICE_URL}/api/v1/scene/id/${sceneId}`;
    const response = await axios.get(url, { params: { minimal } });

    if (!response.data.success || !response.data.data) {
      throw new AppError('Scene not found', 404);
    }

    return response.data.data;
  } catch (error) {
    logger.error('Error fetching scene from Scene Service', {
      error: error.message,
      sceneId,
    });
    if (error.response?.status === 404) {
      throw new AppError('Scene not found', 404);
    }
    throw new AppError('Scene Service is unavailable', 503);
  }
}
