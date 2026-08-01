export function logEvent(message, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, details);
}
