export const SCORE_CONFIG = {
  TIERS: {
    CITY: 10,
    PREFECTURE: 50,
    REGION: 200,
  },

  DECAY: {
    CITY: 0.045,
    PREFECTURE: 0.15,
    REGION: 0.25,
  },
};

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateScore(distanceKm, maxScore = 5000, minScore = 100) {
  if (distanceKm <= 0.25) return maxScore;
  if (distanceKm >= SCORE_CONFIG.TIERS.REGION) return minScore;
  
  const { CITY, PREFECTURE } = SCORE_CONFIG.TIERS;
  const { CITY: DC, PREFECTURE: DP, REGION: DR } = SCORE_CONFIG.DECAY;
  
  let normalizedScore; // 0 -> 1
  
  if (distanceKm <= CITY) {
    normalizedScore = Math.exp(-distanceKm * DC);
  } else if (distanceKm <= PREFECTURE) {
    const cityEndScore = Math.exp(-CITY * DC);
    const d = distanceKm - CITY;
    
    normalizedScore = cityEndScore * Math.exp(-d * DP);
  } else {
    const cityEndScore = Math.exp(-CITY * DC);
    const prefectureEndScore = cityEndScore * Math.exp(-(PREFECTURE - CITY) * DP);
    const d = distanceKm - PREFECTURE;

    normalizedScore = prefectureEndScore * Math.exp(-d * DR);
  }
  
  const finalScore = minScore + (normalizedScore * (maxScore - minScore));
  
  return Math.round(finalScore);
}

export function buildActualLocation({ region, prefecture, city }) {
  const regionName = region?.name ?? null;
  const prefectureName = prefecture?.name ?? null;
  const cityName = city?.name ?? null;

  return [regionName, prefectureName, cityName]
    .filter(v => typeof v === 'string' && v.length > 0)
    .slice(-2)
    .join(', ');
}
