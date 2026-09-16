export const LISTING_CATEGORIES = ['Electronics', 'Fashion', 'Furniture', 'Appliances', 'Vehicles', 'Books', 'Other'];
export const LISTING_CONDITIONS = ['New', 'Like-New', 'Fair', 'Needs Repair'];

export function startSellerDraft() {
  return {
    draft: { title: '', category: '', mediaIds: [], condition: '', price: null, location: '', description: '' },
    stage: 'awaiting_title',
    reply: 'What are you selling? For example, “iPhone 13”.',
  };
}

/** Pure seller flow: validates one answer and returns only draft/session state plus reply text. */
export function advanceSellerDraft(draft, stage, message) {
  const current = { ...draft, mediaIds: [...(draft?.mediaIds ?? [])] };
  const text = String(message.text ?? '').trim();

  if (stage === 'awaiting_title') {
    if (!text) return reprompt(current, stage, 'Please send the item name.');
    return { draft: { ...current, title: text }, stage: 'awaiting_category', reply: categoryPrompt() };
  }
  if (stage === 'awaiting_category') {
    const category = LISTING_CATEGORIES[Number(text) - 1];
    if (!category) return reprompt(current, stage, categoryPrompt('Reply with a category number.'));
    return { draft: { ...current, category }, stage: 'awaiting_images', reply: 'Send 1–4 photos of the item. When finished, type DONE.' };
  }
  if (stage === 'awaiting_images') {
    if (message.type === 'image' && message.content?.mediaId) {
      if (current.mediaIds.length >= 4) return reprompt(current, stage, 'You can send up to 4 photos. Type DONE to continue.');
      const mediaIds = [...current.mediaIds, message.content.mediaId];
      return { draft: { ...current, mediaIds }, stage, reply: `Got ${mediaIds.length} photo${mediaIds.length === 1 ? '' : 's'}. Send another or type DONE.` };
    }
    if (/^done$/i.test(text) && current.mediaIds.length > 0) {
      return { draft: current, stage: 'awaiting_condition', reply: conditionPrompt() };
    }
    return reprompt(current, stage, 'Send an image, then type DONE when you have sent at least one photo.');
  }
  if (stage === 'awaiting_condition') {
    const condition = LISTING_CONDITIONS[Number(text) - 1];
    if (!condition) return reprompt(current, stage, conditionPrompt('Reply with a condition number.'));
    return { draft: { ...current, condition }, stage: 'awaiting_price', reply: 'What is your asking price in USD?' };
  }
  if (stage === 'awaiting_price') {
    const price = Number(text.replace(/[$,\s]|usd/gi, ''));
    if (!Number.isFinite(price) || price < 0) return reprompt(current, stage, 'Please send a valid non-negative price in USD.');
    return { draft: { ...current, price }, stage: 'awaiting_location', reply: 'Which city or area is the item in?' };
  }
  if (stage === 'awaiting_location') {
    if (!text) return reprompt(current, stage, 'Please send the city or area.');
    return { draft: { ...current, location: text }, stage: 'awaiting_description', reply: 'Add a short description, or type SKIP.' };
  }
  if (stage === 'awaiting_description') {
    const description = /^skip$/i.test(text) ? '' : text;
    return { draft: { ...current, description }, stage: 'awaiting_confirmation', reply: previewListing({ ...current, description }) };
  }
  if (stage === 'awaiting_confirmation') {
    if (/^yes$/i.test(text)) {
      return { draft: current, stage: 'awaiting_account_link', reply: 'Before publishing, I need to link this WhatsApp number to your Metups account. What name should buyers see?' };
    }
    if (/^change$/i.test(text)) {
      return { draft: current, stage: 'awaiting_title', reply: 'Let’s update it. What is the item name?' };
    }
    return reprompt(current, stage, 'Reply YES to publish, CHANGE to edit, or CANCEL to discard.');
  }
  return reprompt(current, stage, 'Your draft is waiting for account linking.');
}

export function previewListing(draft) {
  const description = draft.description ? `\n“${draft.description}”` : '';
  return `Here is your listing:\n${draft.title} — $${draft.price} — ${draft.condition} — ${draft.location}${description}\n${draft.mediaIds.length} photo${draft.mediaIds.length === 1 ? '' : 's'} attached.\n\nReply YES to publish, CHANGE to edit, or CANCEL to discard.`;
}

function categoryPrompt(prefix = '') {
  return `${prefix ? `${prefix}\n` : ''}Which category fits it?\n1. Electronics  2. Fashion  3. Furniture  4. Appliances\n5. Vehicles  6. Books  7. Other`;
}

function conditionPrompt(prefix = '') {
  return `${prefix ? `${prefix}\n` : ''}What condition is it in?\n1. New  2. Like-New  3. Fair  4. Needs Repair`;
}

function reprompt(draft, stage, reply) {
  return { draft, stage, reply };
}
