/**
 * @param {string} duration The duration string (e.g., '1h', '24d', '15m').
 * @returns {number} The total duration in seconds, or null if invalid.
 */
export default function durationToSeconds(duration) {
  if (!duration) return 0;

  const match = duration.match(/^(\d+)([hdm])$/i);
  if (!match) {
    console.error("Invalid duration format. Use 'Xd', 'Xh', or 'Xm'.");
    return 0;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const SECONDS_IN_MINUTE = 60;
  const SECONDS_IN_HOUR = 60 * SECONDS_IN_MINUTE;
  const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;

  switch (unit) {
    case 'm':
      return value * SECONDS_IN_MINUTE;
    case 'h':
      return value * SECONDS_IN_HOUR;
    case 'd':
      return value * SECONDS_IN_DAY;
    default:
      return null;
  }
}