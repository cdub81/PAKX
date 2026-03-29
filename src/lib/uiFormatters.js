function formatTwoDigit(value) {
  return String(value).padStart(2, "0");
}

export function formatReminderDuration(secondsTotal) {
  const totalSeconds = Math.max(0, Number(secondsTotal) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${formatTwoDigit(hours)}:${formatTwoDigit(minutes)}:${formatTwoDigit(seconds)}`;
}

export function formatReminderCountdown(msRemaining) {
  if (msRemaining <= 0) {
    return "Due now";
  }
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${formatTwoDigit(seconds)}s`;
}
