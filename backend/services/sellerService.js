export function createDraftListing() {
  return {
    title: '',
    price: null,
    location: '',
    condition: '',
    description: '',
    step: 'title',
  };
}

export function handleSellerMessage(message, draft) {
  if (!draft) {
    return {
      response: 'Great. Let\'s start your listing. What are you selling?',
      draft: createDraftListing(),
    };
  }

  if (draft.step === 'title') {
    return {
      response: 'Perfect. What price are you asking?',
      draft: { ...draft, title: message.trim(), step: 'price' },
    };
  }

  if (draft.step === 'price') {
    const price = Number(message.replace(/[^0-9.]/g, ''));
    return {
      response: 'Nice. Where is the item located?',
      draft: { ...draft, price: Number.isFinite(price) ? price : null, step: 'location' },
    };
  }

  if (draft.step === 'location') {
    return {
      response: 'What condition is it in?',
      draft: { ...draft, location: message.trim(), step: 'condition' },
    };
  }

  if (draft.step === 'condition') {
    return {
      response: 'Great. Add a short description, then I can help you publish it.',
      draft: { ...draft, condition: message.trim(), step: 'description' },
    };
  }

  return {
    response: 'Thanks. Your draft is ready. Reply "publish" to finish.',
    draft: { ...draft, description: message.trim() },
  };
}
