export function handleSelection(message, listings) {
  const selection = Number(String(message).trim());
  if (!Number.isInteger(selection) || selection < 1 || selection > listings.length) {
    return 'Please reply with 1, 2, or 3 to choose a listing.';
  }

  const chosen = listings[selection - 1];
  return `Great choice. The seller for "${chosen.title}" can be contacted directly.\n\nReply with "chat" to continue.`;
}
