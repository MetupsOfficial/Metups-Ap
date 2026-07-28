import express from 'express';
import { handleWebhook } from '../controllers/webhookController.js';

const router = express.Router();
router.all('/', handleWebhook);

export default router;
