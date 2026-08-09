function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSleepFactor(sleepHours) {
  const value = clamp(Number(sleepHours), 0, 24);

  if (value >= 7 && value <= 9) {
    return 1.0;
  }

  if ((value >= 6 && value < 7) || (value > 9 && value <= 10)) {
    return 0.7;
  }

  return 0.4;
}

export function calculateWellnessScore(sleepHours, mood, energy) {
  const sleepFactor = getSleepFactor(sleepHours);
  const moodValue = clamp(Number(mood), 1, 5);
  const energyValue = clamp(Number(energy), 1, 5);
  const rawScore = (sleepFactor * 40) + (moodValue * 6) + (energyValue * 6);

  return clamp(Math.round(rawScore), 0, 100);
}