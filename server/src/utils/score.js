/**
 * Pure function to calculate wellness score (0-100) based on sleep, mood, and energy.
 * 
 * @param {number} sleepHours - Hours slept (0 to 24)
 * @param {number} mood - Mood rating (1 to 10)
 * @param {number} energy - Energy rating (1 to 10)
 * @returns {number} Score rounded to 1 decimal place
 */
export function calculateWellnessScore(sleepHours, mood, energy) {
  // Calculate sleep score (ideal window 7-9 hours)
  let sleepScore = 0;
  if (sleepHours >= 7 && sleepHours <= 9) {
    sleepScore = 100;
  } else if (sleepHours < 7) {
    sleepScore = Math.max(0, (sleepHours / 7) * 100);
  } else {
    // Over-sleeping penalty
    sleepScore = Math.max(0, 100 - (sleepHours - 9) * 12.5);
  }

  // Convert mood (1-10) and energy (1-10) to percentage (0-100)
  const moodScore = Math.min(100, Math.max(0, mood * 10));
  const energyScore = Math.min(100, Math.max(0, energy * 10));

  // Weighted calculation: Sleep (40%), Mood (30%), Energy (30%)
  const totalScore = (sleepScore * 0.40) + (moodScore * 0.30) + (energyScore * 0.30);

  return Math.round(totalScore * 10) / 10;
}
