import { handleWebhookRequest } from '../controllers/webhookController.js';

export function routeWebhook(request) {
  return handleWebhookRequest(request);
}
