function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateSleepScore(sleepHours) {
  const target = 8;
  const maxDistance = 8;
  const distance = Math.abs(clamp(sleepHours, 0, 24) - target);
  return clamp(100 - (distance / maxDistance) * 100, 0, 100);
}

function calculateScaleScore(value) {
  return clamp((clamp(value, 1, 10) - 1) / 9 * 100, 0, 100);
}

export function calculateWellnessScore(sleepHours, mood, energy) {
  const sleepScore = calculateSleepScore(sleepHours);
  const moodScore = calculateScaleScore(mood);
  const energyScore = calculateScaleScore(energy);

  return Math.round((sleepScore * 0.4 + moodScore * 0.3 + energyScore * 0.3) * 100) / 100;
}