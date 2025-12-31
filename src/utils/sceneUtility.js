import axios from 'axios';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errorUtility.js';
import { serviceConfig } from '../config/env.js';

/**
 * Fetch random scenes from Scene Service with optional filters
 * @param {Object} params - Scene query parameters
 * @param {number} params.count - Number of scenes to fetch (default: 5)
 * @param {Array} [params.difficultyWeights] - Array of {difficultyId, weight} objects
 * @param {string} [params.showId] - Filter by show ID
 * @param {string} [params.cityId] - Filter by city ID
 * @param {string} [params.prefectureId] - Filter by prefecture ID
 * @param {string} [params.regionId] - Filter by region ID
 * @param {string[]} [params.excludeSceneIds] - Scene IDs to exclude
 * @returns {Promise<Array>} Array of scene objects
 */
export async function fetchScenesFromService(params) {
  try {
    const {
      count = 5,
      difficultyWeights = [],
      showId,
      cityId,
      prefectureId,
      regionId,
      excludeSceneIds = [],
    } = params;
    
    logger.info('Fetching random scenes from Scene Service', { params });
    
    // Build request payload
    const payload = {
      count,
      ...(difficultyWeights.length > 0 && { difficultyWeights }),
      ...(showId && { showId }),
      ...(cityId && { cityId }),
      ...(prefectureId && { prefectureId }),
      ...(regionId && { regionId }),
      ...(excludeSceneIds.length > 0 && { excludeSceneIds }),
    };
    
    const response = await axios.post(
      `${serviceConfig.SCENE_SERVICE_URL}/api/v1/scene/random`,
      payload,
    );
    
    if (!response.data.success || !response.data.data) {
      throw new AppError('Failed to fetch scenes from Scene Service', 500);
    }
    
    logger.info('Successfully fetched scenes', { count: response.data.data.length });
    return response.data.data;
  } catch (error) {
    logger.error('Error fetching scenes from Scene Service', { 
      error: error.message,
      params,
    });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.response) {
      // Scene Service returned an error
      const status = error.response.status;
      const message = error.response.data?.message || 'Scene Service error';
      throw new AppError(message, status);
    }
    
    throw new AppError('Scene Service is unavailable', 503);
  }
}

/**
 * Fetch a single scene by ID from Scene Service
 * @param {string} sceneId - The scene ID to fetch
 * @param {boolean} [minimal=false] - Whether to fetch minimal data
 * @returns {Promise<Object>} Scene object
 */
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
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Scene Service is unavailable', 503);
  }
}

/**
 * Fetch a single scene by ID from Scene Service
 * @param {string[]} sceneIds - The scene ID to fetch
 * @param {boolean} [minimal=false] - Whether to fetch minimal data
 * @returns {Promise<Object>} Scene object
 */
export async function fetchSceneByIds(sceneIds = [], minimal = false) {
  try {
    logger.info('Fetching scene by ID from Scene Service', { sceneIds, minimal });
    const url = `${serviceConfig.SCENE_SERVICE_URL}/api/v1/scene`;
    const response = await axios.post(url, { ids: sceneIds }, { params: { minimal } });

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
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError('Scene Service is unavailable', 503);
  }
}